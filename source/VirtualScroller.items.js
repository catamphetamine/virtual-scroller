import log, { reportError } from './utility/debug.js'
import getItemsDiff from './getItemsDiff.js'
import fillArray from './utility/fillArray.js'

export default function() {
	this.getItemsCount = () => {
		return this.getState().items.length
	}

	this._getItemIndexByItemOrIndex = (itemOrIndex) => {
		const item = itemOrIndex
		const { items } = this.getState()
		// Find the `item`'s index in the `items` array.
		//
		// Performance notes:
		// Doing an `.indexOf()` operation on a very large array could be inefficient
		// because it would have to check every element of the array.
		// In case of any hypothetical performance-related issues,
		// the code could use a `new Map()` as an "index" for finding individual items.
		const i = items.indexOf(item)
		// validate that the `item` exists in the `items` array.
		if (i >= 0) {
			return i
		}

		// Legacy behavior: some functions used to accept an `i: number` item index as an argument.
		// Later the argument was changed to `item: Item`.
		//
		// The old way of passing an `i: number` argument would only result in weird application behavior
		// when all of the below circumstances are true, which is assumed extremely unlikely:
		//
		// BOTH use a previous version of `virtual-scroller` (ones before December 2025, with downloads count that is not very high)
		// AND to be used with an `items` array of type `number[]`
		// AND to use any of the "advanced" functions:
    // * `setItemState(i, newState)`
    // * `onItemHeightDidChange(i)`
    // * `getItemScrollPosition(i)`
		//
		// The code below handles the legacy compatibility aspect of the old type of argument
		// except maybe for those "extremely unlikely" cases in which the app is still unlikely to crash.
		//
		if (typeof itemOrIndex === 'number') {
			const i = itemOrIndex
			// Validate the item index argument.
			if (i >= 0 && i < items.length) {
				return i
			}
		} else {
			// It is also possible that the `item` is stale and that items have already been updated
			// via `.setItems()`. In that case, a developer could supply a `getItemId(item)` function
			// in order for this library to be able to detect the items that have stayed even when
			// their "reference" has changed. To support such case, here it has to also attempt a search
			// for the `item` by its `id` rather than just its "reference".
			const getItemId = this._getItemId
			if (getItemId) {
				const itemId = getItemId(item)
				// Performance notes:
				// Doing an `.findIndex()` operation on a very large array could be inefficient
				// because it would have to check every element of the array.
				// In case of any hypothetical performance-related issues,
				// the code could use a `new Map()` as an "index" for finding individual items by ID.
				const i = items.findIndex((item) => getItemId(item) === itemId)
				if (i >= 0) {
					return i
				}
			}
		}

		reportError(`Item not found: ${JSON.stringify(item)}`)
	}

	/**
	 * Updates `items`. For example, can prepend or append new items to the list.
	 * @param  {any[]} newItems
	 * @param {boolean} [options.preserveScrollPositionOnPrependItems] — Set to `true` to enable "restore scroll position after prepending items" feature (could be useful when implementing "Show previous items" button).
	 */
	this._setItems = (newItems, options = {}) => {
		const {
			items: previousItems
		} = this.getState()

		// Even if `newItems` are equal to `this.state.items`,
		// still perform a `updateState()` call, because, if `updateState()` calls
		// were "asynchronous", there could be a situation when a developer
		// first calls `setItems(newItems)` and then `setItems(oldItems)`:
		// if this function did `return` `if (newItems === this.state.items)`
		// then `updateState({ items: newItems })` would be scheduled as part of
		// `setItems(newItems)` call, but the subsequent `setItems(oldItems)` call
		// wouldn't do anything resulting in `newItems` being set as a result,
		// and that wouldn't be what the developer intended.

		let { itemStates } = this.getState()
		let { itemHeights } = this.widthHasChanged
			? this.widthHasChanged.stateUpdate
			: this.getState()

		log('~ Update items ~')

		let layoutUpdate
		let itemsUpdateInfo

		// Compare the new items to the current items.
		const itemsDiff = this.getItemsDiff(previousItems, newItems)

		// See if it's an "incremental" items update.
		if (itemsDiff) {
			const {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			} = this.widthHasChanged
				? this.widthHasChanged.stateUpdate
				: this.getState()

			const shouldRestoreScrollPosition = firstShownItemIndex === 0 &&
				// `preserveScrollPosition` option name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				(options.preserveScrollPositionOnPrependItems || options.preserveScrollPosition)

			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff

			let shouldResetGridLayout

			layoutUpdate = this.layout.getLayoutUpdateForItemsDiff({
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			}, {
				prependedItemsCount,
				appendedItemsCount
			}, {
				itemsCount: newItems.length,
				columnsCount: this.getActualColumnsCount(),
				shouldRestoreScrollPosition,
				onResetGridLayout: () => shouldResetGridLayout = true
			})

			if (prependedItemsCount > 0) {
				log('Prepend', prependedItemsCount, 'items')

				itemHeights = new Array(prependedItemsCount)
					.concat(itemHeights)

				itemStates = fillArray(
					new Array(prependedItemsCount),
					(i) => this.getInitialItemState(newItems[i])
				)
					.concat(itemStates)

				// Restore scroll position after prepending items (if requested).
				if (shouldRestoreScrollPosition) {
					log('Will restore scroll position')
					this.listHeightMeasurement.snapshotListHeightBeforeAddingNewItems({
						previousItems,
						newItems,
						prependedItemsCount
					})
					// "Seamless prepend" scenario doesn't result in a re-layout,
					// so if any "non measured item" is currently pending,
					// it doesn't get reset and will be handled after `state` is updated.
					if (this.firstNonMeasuredItemIndex !== undefined) {
						this.firstNonMeasuredItemIndex += prependedItemsCount
					}
				} else {
					log('Reset layout')
					if (shouldResetGridLayout) {
						log('Reason: Prepended items count', prependedItemsCount, 'is not divisible by Columns Count', this.getActualColumnsCount())
						// Reset item heights because the whole grid is going to be rebalanced
						// and re-rendered in a different configuration.
						itemHeights = new Array(newItems.length)
					} else {
						// Reset layout because none of the prepended items have been measured.
						log('Reason: Prepended items\' heights are unknown')
					}
					layoutUpdate = this.layout.getInitialLayoutValues({
						itemsCount: newItems.length,
						columnsCount: this.getActualColumnsCount()
					})
					// Unschedule a potentially scheduled layout update
					// after measuring a previously non-measured item
					// because the list will be re-layout anyway
					// due to the new items being set.
					this.firstNonMeasuredItemIndex = undefined
				}
			}

			if (appendedItemsCount > 0) {
				log('Append', appendedItemsCount, 'items')
				itemHeights = itemHeights.concat(new Array(appendedItemsCount))
				itemStates = itemStates.concat(
					fillArray(
						new Array(appendedItemsCount),
						(i) => this.getInitialItemState(newItems[prependedItemsCount + previousItems.length + i])
					)
				)
			}

			itemsUpdateInfo = {
				prepend: prependedItemsCount > 0,
				append: appendedItemsCount > 0
			}
		} else {
			log('Items have changed, and', (itemsDiff ? 'a re-layout from scratch has been requested.' : 'it\'s not a simple append and/or prepend.'), 'Rerender the entire list from scratch.')
			log('Previous items', previousItems)
			log('New items', newItems)

			// Reset item heights and item states.
			itemHeights = new Array(newItems.length)
			itemStates = fillArray(
				new Array(newItems.length),
				(i) => this.getInitialItemState(newItems[i])
			)

			layoutUpdate = this.layout.getInitialLayoutValues({
				itemsCount: newItems.length,
				columnsCount: this.getActualColumnsCount()
			})

			// Unschedule a potentially scheduled layout update
			// after measuring a previously non-measured item
			// because the list will be re-layout from scratch
			// due to the new items being set.
			this.firstNonMeasuredItemIndex = undefined

			// Also reset any potential pending scroll position restoration.
			// For example, imagine a developer first called `.setItems(incrementalItemsUpdate)`
			// and then called `.setItems(differentItems)` and there was no state update
			// in between those two calls. This could happen because state updates aren't
			// required to be "synchronous". On other words, calling `this.updateState()`
			// doesn't necessarily mean that the state is applied immediately.
			// Imagine also that such "delayed" state updates could be batched,
			// like they do in React inside event handlers (though that doesn't apply to this case):
			// https://github.com/facebook/react/issues/10231#issuecomment-316644950
			// If `this.listHeightMeasurement` wasn't reset on `.setItems(differentItems)`
			// and if the second `this.updateState()` call overwrites the first one
			// then it would attempt to restore scroll position in a situation when
			// it should no longer do that. Hence the reset here.
			this.listHeightMeasurement.reset()

			itemsUpdateInfo = {
				replace: true
			}
		}

		log('~ Update state ~')

		// const layoutValuesAfterUpdate = {
		// 	...this.getState(),
		// 	...layoutUpdate
		// }

		// `layoutUpdate` is equivalent to `layoutValuesAfterUpdate` because
		// `layoutUpdate` contains all the relevant properties.
		log('First shown item index', layoutUpdate.firstShownItemIndex)
		log('Last shown item index', layoutUpdate.lastShownItemIndex)
		log('Before items height', layoutUpdate.beforeItemsHeight)
		log('After items height (actual or estimated)', layoutUpdate.afterItemsHeight)

		// Optionally preload items to be rendered.
		//
		// `layoutUpdate` is equivalent to `layoutValuesAfterUpdate` because
		// `layoutUpdate` contains all the relevant properties.
		//
		this.onBeforeShowItems(
			newItems,
			itemHeights,
			layoutUpdate.firstShownItemIndex,
			layoutUpdate.lastShownItemIndex
		)

		// `this.newItemsWillBeRendered` signals that new `items` are being rendered,
		// and that `VirtualScroller` should temporarily stop all other updates.
		//
		// `this.newItemsWillBeRendered` is cleared in `onRender()`.
		//
		// The values in `this.newItemsWillBeRendered` are used, for example,
		// in `.onContainerResize()` handler in order to not break state consistency when
		// state updates are "asynchronous" (delayed) and there's a window resize event
		// in between calling `updateState()` below and that call actually being applied.
		//
		this.newItemsWillBeRendered = {
			...itemsUpdateInfo,
			count: newItems.length,
			// `layoutUpdate` now contains all layout-related properties, even if those that
			// didn't change. So `firstShownItemIndex` is always in `this.newItemsWillBeRendered`.
			layout: layoutUpdate
		}

		// `layoutUpdate` now contains all layout-related properties, even if those that
		// didn't change. So this part is no longer relevant.
		//
		// // If `firstShownItemIndex` is gonna be modified as a result of setting new items
		// // then keep that "new" `firstShownItemIndex` in order for it to be used by
		// // `onResize()` handler when it calculates "new" `firstShownItemIndex`
		// // based on the new columns count (corresponding to the new window width).
		// if (layoutUpdate.firstShownItemIndex !== undefined) {
		// 	this.newItemsWillBeRendered = {
		// 		...this.newItemsWillBeRendered,
		// 		firstShownItemIndex: layoutUpdate.firstShownItemIndex
		// 	}
		// }

		// Update `VirtualScroller` state.
		//
		// This state update should overwrite all the `state` properties
		// that are also updated in the "on scroll" handler (`getShownItemIndexes()`):
		//
		// * `firstShownItemIndex`
		// * `lastShownItemIndex`
		// * `beforeItemsHeight`
		// * `afterItemsHeight`
		//
		// That's because this `updateState()` update has a higher priority
		// than that of the "on scroll" handler, so it should overwrite
		// any potential state changes dispatched by the "on scroll" handler.
		//
		const newState = {
			...layoutUpdate,
			items: newItems,
			itemStates,
			itemHeights
		}

		// Introduced `shouldIncludeBeforeResizeValuesInState()` getter just to prevent
		// cluttering `state` with `beforeResize: undefined` property if `beforeResize`
		// hasn't ever been set in `state` previously.
		if (this.beforeResize.shouldIncludeBeforeResizeValuesInState()) {
			if (this.shouldDiscardBeforeResizeItemHeights()) {
				// Reset "before resize" item heights because now there're new items prepended
				// with unknown heights, or completely new items with unknown heights, so
				// `beforeItemsHeight` value won't be preserved anyway.
				newState.beforeResize = undefined
			}
			else {
				// Overwrite `beforeResize` property in `state` even if it wasn't modified
				// because state updates could be "asynchronous" and in that case there could be
				// some previous `updateState()` call from some previous `setItems()` call that
				// hasn't yet been applied, and that previous call might have scheduled setting
				// `state.beforeResize` property to `undefined` in order to reset it, but this
				// next `updateState()` call might not require resetting `state.beforeResize` property
				// so it should undo resetting it by simply overwriting it with its normal value.
				newState.beforeResize = this.widthHasChanged
					? this.widthHasChanged.stateUpdate.beforeResize
					: this.getState().beforeResize
			}
		}

		// `newState` should also overwrite all `state` properties that're updated in `onResize()`
		// because `setItems()`'s state updates always overwrite `onResize()`'s state updates.
		// (The least-priority ones are `onScroll()` state updates, but those're simply skipped
		// if there's a pending `setItems()` or `onResize()` update).
		//
		// `state` property exceptions:
		//
		// `verticalSpacing` property is not updated here because it's fine setting it to
		// `undefined` in `onResize()` — it will simply be re-measured after the component re-renders.
		//
		// `columnsCount` property is also not updated here because by definition it's only
		// updated in `onResize()`.

		// Render.
		this._isSettingNewItems = true
		this.updateState(newState)
	}

	this.getItemsDiff = (previousItems, newItems) => {
		return getItemsDiff(previousItems, newItems, this.isItemEqual)
	}
}