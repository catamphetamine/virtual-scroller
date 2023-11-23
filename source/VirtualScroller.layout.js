// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import log, { warn, isDebug, reportError } from './utility/debug.js'
import { LAYOUT_REASON } from './Layout.js'

import ItemNotRenderedError from './ItemNotRenderedError.js'

export default function() {
	this.onUpdateShownItemIndexes = ({ reason, stateUpdate }) => {
		// In case of "don't do anything".
		const skip = () => {
			if (stateUpdate) {
				this.updateState(stateUpdate)
			}
		}

		// If new `items` have been set and are waiting to be applied,
		// or if the viewport width has changed requiring a re-layout,
		// then temporarily stop all other updates like "on scroll" updates.
		// This prevents `state` being inconsistent, because, for example,
		// both `setItems()` and this function could update `VirtualScroller` state
		// and having them operate in parallel could result in incorrectly calculated
		// `beforeItemsHeight` / `afterItemsHeight` / `firstShownItemIndex` /
		// `lastShownItemIndex`, because, when operating in parallel, this function
		// would have different `items` than the `setItems()` function, so their
		// results could diverge.
		if (this.newItemsWillBeRendered || this.widthHasChanged || this._isResizing) {
			return skip()
		}

		// If there're no items then there's no need to re-layout anything.
		if (this.getItemsCount() === 0) {
			return skip()
		}

		// Cancel a "re-layout when user stops scrolling" timer.
		this.scroll.cancelScheduledLayout()

		// Cancel a re-layout that is scheduled to run at the next "frame",
		// because a re-layout will be performed right now.
		stateUpdate = this.cancelLayoutTimer({ stateUpdate })

		// Perform a re-layout.
		log(`~ Update Layout (on ${reason}) ~`)
		updateShownItemIndexes.call(this, { stateUpdate })
	}

	/**
	 * Updates the "from" and "to" shown item indexes.
	 * If the list is visible and some of the items being shown are new
	 * and are required to be measured first, then
	 * `firstNonMeasuredItemIndex` is defined.
	 * If the list is visible and all items being shown have been encountered
	 * (and measured) before, then `firstNonMeasuredItemIndex` is `undefined`.
	 *
	 * The `stateUpdate` parameter is just an optional "additional" state update.
	 */
	function updateShownItemIndexes({ stateUpdate }) {
		const startedAt = Date.now()

		// Get shown item indexes.
		let {
			firstShownItemIndex,
			lastShownItemIndex,
			shownItemsHeight,
			firstNonMeasuredItemIndex
		} = getShownItemIndexes.call(this)

		// If scroll position is scheduled to be restored after render,
		// then the "anchor" item must be rendered, and all of the prepended
		// items before it, all in a single pass. This way, all of the
		// prepended items' heights could be measured right after the render
		// has finished, and the scroll position can then be immediately restored.
		if (this.listHeightMeasurement.hasSnapshot()) {
			if (lastShownItemIndex < this.listHeightMeasurement.getAnchorItemIndex()) {
				lastShownItemIndex = this.listHeightMeasurement.getAnchorItemIndex()
			}
			// `firstShownItemIndex` is always `0` when prepending items.
			// And `lastShownItemIndex` always covers all prepended items in this case.
			// None of the prepended items have been rendered before,
			// so their heights are unknown. The code at the start of this function
			// did therefore set `firstNonMeasuredItemIndex` to non-`undefined`
			// in order to render just the first prepended item in order to
			// measure it, and only then make a decision on how many other
			// prepended items to render. But since we've instructed the code
			// to show all of the prepended items at once, there's no need to
			// "redo layout after render". Additionally, if layout was re-done
			// after render, then there would be a short interval of visual
			// "jitter" due to the scroll position not being restored because it'd
			// wait for the second layout to finish instead of being restored
			// right after the first one.
			firstNonMeasuredItemIndex = undefined
		}

		// Validate the heights of items to be hidden on next render.
		// For example, a user could click a "Show more" button,
		// or an "Expand YouTube video" button, which would result
		// in the actual height of the list item being different
		// from what has been initially measured in `this.itemHeights[i]`,
		// if the developer didn't call `.setItemState(i, newState)` and `.onItemHeightDidChange(i)`.
		if (!validateWillBeHiddenItemHeightsAreAccurate.call(this, firstShownItemIndex, lastShownItemIndex)) {
			log('~ Because some of the will-be-hidden item heights (listed above) have changed since they\'ve last been measured, redo layout. ~')
			// Redo layout, now with the correct item heights.
			return updateShownItemIndexes.call(this, { stateUpdate });
		}

		// Measure "before" items height.
		const beforeItemsHeight = this.layout.getBeforeItemsHeight(
			firstShownItemIndex
		)

		// Measure "after" items height.
		const afterItemsHeight = this.layout.getAfterItemsHeight(
			lastShownItemIndex,
			this.getItemsCount()
		)

		const layoutDuration = Date.now() - startedAt

		// Debugging.
		log('~ Calculated Layout' + (this.bypass ? ' (bypass)' : '') + ' ~')
		if (layoutDuration < SLOW_LAYOUT_DURATION) {
			// log('Calculated in', layoutDuration, 'ms')
		} else {
			warn('Layout calculated in', layoutDuration, 'ms')
		}
		if (this.getColumnsCount()) {
			log('Columns count', this.getColumnsCount())
		}
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		log('Before items height', beforeItemsHeight)
		log('After items height (actual or estimated)', afterItemsHeight)
		log('Average item height (used for estimated after items height calculation)', this.itemHeights.getAverage())
		if (isDebug()) {
			log('Item heights', this.getState().itemHeights.slice())
			log('Item states', this.getState().itemStates.slice())
		}

		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			this.getState().items,
			this.getState().itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)

		// Set `this.firstNonMeasuredItemIndex`.
		this.firstNonMeasuredItemIndex = firstNonMeasuredItemIndex
		// if (firstNonMeasuredItemIndex !== undefined) {
		// 	log('Non-measured item index that will be measured at next layout', firstNonMeasuredItemIndex)
		// }

		// Set "previously calculated layout".
		//
		// The "previously calculated layout" feature is not currently used.
		//
		// The current layout snapshot could be stored as a "previously calculated layout" variable
		// so that it could theoretically be used when calculating new layout incrementally
		// rather than from scratch, which would be an optimization.
		//
		// Currently, this feature is not used, and `shownItemsHeight` property
		// is not returned at all, so don't set any "previously calculated layout".
		//
		if (shownItemsHeight === undefined) {
			this.previouslyCalculatedLayout = undefined
		} else {
			// If "previously calculated layout" feature would be implmeneted,
			// then this code would set "previously calculate layout" instance variable.
			//
			// What for would this instance variable be used?
			//
			// Instead of using a `this.previouslyCalculatedLayout` instance variable,
			// this code could use `this.getState()` because it reflects what's currently on screen,
			// but there's a single edge case when it could go out of sync —
			// updating item heights externally via `.onItemHeightDidChange(i)`.
			//
			// If, for example, an item height was updated externally via `.onItemHeightDidChange(i)`
			// then `this.getState().itemHeights` would get updated immediately but
			// `this.getState().beforeItemsHeight` or `this.getState().afterItemsHeight`
			// would still correspond to the previous item height, so those would be "stale".
			// On the other hand, same values in `this.previouslyCalculatedLayout` instance variable
			// can also be updated immediately, so they won't go out of sync with the updated item height.
			// That seems the only edge case when using a separate `this.previouslyCalculatedLayout`
			// instance variable instead of using `this.getState()` would theoretically be justified.
			//
			this.previouslyCalculatedLayout = {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				shownItemsHeight
			}
		}

		// Update `VirtualScroller` state.
		// `VirtualScroller` automatically re-renders on state updates.
		//
		// All `state` properties updated here should be overwritten in
		// the implementation of `setItems()` and `onResize()` methods
		// so that the `state` is not left in an inconsistent state
		// whenever there're concurrent `updateState()` updates that could
		// possibly conflict with one another — instead, those state updates
		// should overwrite each other in terms of priority.
		// These "on scroll" updates have the lowest priority compared to
		// the state updates originating from `setItems()` and `onResize()` methods.
		//
		this.updateState({
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			...stateUpdate
		})
	}

	function getCoordinatesOfVisibleAreaInsideTheList() {
		const visibleAreaBounds = this.scroll.getVisibleAreaBounds()
		this.latestLayoutVisibleArea = visibleAreaBounds

		// Subtract the top offset of the list inside the scrollable container.
		const listTopOffsetInsideScrollableContainer = this.getListTopOffsetInsideScrollableContainer()
		return {
			top: visibleAreaBounds.top - listTopOffsetInsideScrollableContainer,
			bottom: visibleAreaBounds.bottom - listTopOffsetInsideScrollableContainer
		}
	}

	function getShownItemIndexes() {
		const itemsCount = this.getItemsCount()

		const visibleAreaInsideTheList = getCoordinatesOfVisibleAreaInsideTheList.call(this)

		if (this.bypass) {
			return {
				firstShownItemIndex: 0,
				lastShownItemIndex: itemsCount - 1,
				// shownItemsHeight: this.getState().itemHeights.reduce((sum, itemHeight) => sum + itemHeight, 0)
			}
		}

		// Find the indexes of the items that are currently visible
		// (or close to being visible) in the scrollable container.
		// For scrollable containers other than the main screen, it could also
		// check the visibility of such scrollable container itself, because it
		// might be not visible.
		// If such kind of an optimization would hypothetically be implemented,
		// then it would also require listening for "scroll" events on the screen.
		// Overall, I suppose that such "actual visibility" feature would be
		// a very minor optimization and not something I'd deal with.
		const isVisible = visibleAreaInsideTheList.top < this.itemsContainer.getHeight() + this.layout.getPrerenderMargin() && visibleAreaInsideTheList.bottom > 0 - this.layout.getPrerenderMargin()
		if (!isVisible) {
			log('The entire list is off-screen. No items are visible.')
			return this.layout.getNonVisibleListShownItemIndexes()
		}

		// Get shown item indexes.
		return this.layout.getShownItemIndexes({
			itemsCount: this.getItemsCount(),
			visibleAreaInsideTheList
		})
	}

	/**
	 * Validates the heights of items to be hidden on next render.
	 * For example, a user could click a "Show more" button,
	 * or an "Expand YouTube video" button, which would result
	 * in the actual height of the list item being different
	 * from what has been initially measured in `this.itemHeights[i]`,
	 * if the developer didn't call `.setItemState(i, newState)` and `.onItemHeightDidChange(i)`.
	 */
	function validateWillBeHiddenItemHeightsAreAccurate(firstShownItemIndex, lastShownItemIndex) {
		let isValid = true
		let i = this.getState().firstShownItemIndex
		while (i <= this.getState().lastShownItemIndex) {
			if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
				// The item's still visible.
			} else {
				// The item will be hidden. Re-measure its height.
				// The rationale is that there could be a situation when an item's
				// height has changed, and the developer has properly added an
				// `.onItemHeightDidChange(i)` call to notify `VirtualScroller`
				// about that change, but at the same time that wouldn't work.
				// For example, suppose there's a list of several items on a page,
				// and those items are in "minimized" state (having height 100px).
				// Then, a user clicks an "Expand all items" button, and all items
				// in the list are expanded (expanded item height is gonna be 700px).
				// `VirtualScroller` demands that `.onItemHeightDidChange(i)` is called
				// in such cases, and the developer has properly added the code to do that.
				// So, if there were 10 "minimized" items visible on a page, then there
				// will be 10 individual `.onItemHeightDidChange(i)` calls. No issues so far.
				// But, as the first `.onItemHeightDidChange(i)` call executes, it immediately
				// ("synchronously") triggers a re-layout, and that re-layout finds out
				// that now, because the first item is big, it occupies most of the screen
				// space, and only the first 3 items are visible on screen instead of 10,
				// and so it leaves the first 3 items mounted and unmounts the rest 7.
				// Then, after `VirtualScroller` has rerendered, the code returns to
				// where it was executing, and calls `.onItemHeightDidChange(i)` for the
				// second item. It also triggers an immediate re-layout that finds out
				// that only the first 2 items are visible on screen, and it unmounts
				// the third one too. After that, it calls `.onItemHeightDidChange(i)`
				// for the third item, but that item is no longer rendered, so its height
				// can't be measured, and the same's for all the rest of the original 10 items.
				// So, even though the developer has written their code properly, the
				// `VirtualScroller` still ends up having incorrect `itemHeights[]`:
				// `[700px, 700px, 100px, 100px, 100px, 100px, 100px, 100px, 100px, 100px]`
				// while it should have been `700px` for all of them.
				// To work around such issues, every item's height is re-measured before it
				// gets hidden.
				const previouslyMeasuredItemHeight = this.getState().itemHeights[i]
				const actualItemHeight = remeasureItemHeight.call(this, i)
				if (actualItemHeight !== previouslyMeasuredItemHeight) {
					if (isValid) {
						log('~ Validate will-be-hidden item heights. ~')
						// Update or reset previously calculated layout.
						updatePreviouslyCalculatedLayoutOnItemHeightChange.call(this, i, previouslyMeasuredItemHeight, actualItemHeight)
					}
					isValid = false
					warn('Item index', i, 'is no longer visible and will be unmounted. Its height has changed from', previouslyMeasuredItemHeight, 'to', actualItemHeight, 'since it was last measured. This is not necessarily a bug, and could happen, for example, on screen width change, or when there\'re several `onItemHeightDidChange(i)` calls issued at the same time, and the first one triggers a re-layout before the rest of them have had a chance to be executed.')
				}
			}
			i++
		}
		return isValid
	}

	function remeasureItemHeight(i) {
		const { firstShownItemIndex } = this.getState()
		return this.itemHeights.remeasureItemHeight(i, firstShownItemIndex)
	}

	// Updates the snapshot of the current layout when an item's height changes.
	//
	// The "previously calculated layout" feature is not currently used.
	//
	// The current layout snapshot could be stored as a "previously calculated layout" variable
	// so that it could theoretically be used when calculating new layout incrementally
	// rather than from scratch, which would be an optimization.
	//
	function updatePreviouslyCalculatedLayoutOnItemHeightChange(i, previousHeight, newHeight) {
		const prevLayout = this.previouslyCalculatedLayout
		if (prevLayout) {
			const heightDifference = newHeight - previousHeight
			if (i < prevLayout.firstShownItemIndex) {
				// Patch `prevLayout`'s `.beforeItemsHeight`.
				prevLayout.beforeItemsHeight += heightDifference
			} else if (i > prevLayout.lastShownItemIndex) {
				// Could patch `.afterItemsHeight` of `prevLayout` here,
				// if `.afterItemsHeight` property existed in `prevLayout`.
				if (prevLayout.afterItemsHeight !== undefined) {
					prevLayout.afterItemsHeight += heightDifference
				}
			} else {
				// Patch `prevLayout`'s shown items height.
				prevLayout.shownItemsHeight += newHeight - previousHeight
			}
		}
	}

	/**
	 * Returns the list's top offset relative to the scrollable container's top edge.
	 * @return {number}
	 */
	this.getListTopOffsetInsideScrollableContainer = () => {
		const listTopOffset = this.scrollableContainer.getItemsContainerTopOffset()
		if (this.listTopOffsetWatcher) {
			this.listTopOffsetWatcher.onListTopOffset(listTopOffset)
		}
		return listTopOffset
	}

	this._onItemHeightDidChange = (i) => {
		log('~ On Item Height Did Change was called ~')
		log('Item index', i)

		const {
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()

		// Check if the item is still rendered.
		if (!(i >= firstShownItemIndex && i <= lastShownItemIndex)) {
			// There could be valid cases when an item is no longer rendered
			// by the time `.onItemHeightDidChange(i)` gets called.
			// For example, suppose there's a list of several items on a page,
			// and those items are in "minimized" state (having height 100px).
			// Then, a user clicks an "Expand all items" button, and all items
			// in the list are expanded (expanded item height is gonna be 700px).
			// `VirtualScroller` demands that `.onItemHeightDidChange(i)` is called
			// in such cases, and the developer has properly added the code to do that.
			// So, if there were 10 "minimized" items visible on a page, then there
			// will be 10 individual `.onItemHeightDidChange(i)` calls. No issues so far.
			// But, as the first `.onItemHeightDidChange(i)` call executes, it immediately
			// ("synchronously") triggers a re-layout, and that re-layout finds out
			// that now, because the first item is big, it occupies most of the screen
			// space, and only the first 3 items are visible on screen instead of 10,
			// and so it leaves the first 3 items mounted and unmounts the rest 7.
			// Then, after `VirtualScroller` has rerendered, the code returns to
			// where it was executing, and calls `.onItemHeightDidChange(i)` for the
			// second item. It also triggers an immediate re-layout that finds out
			// that only the first 2 items are visible on screen, and it unmounts
			// the third one too. After that, it calls `.onItemHeightDidChange(i)`
			// for the third item, but that item is no longer rendered, so its height
			// can't be measured, and the same's for all the rest of the original 10 items.
			// So, even though the developer has written their code properly, there're
			// still situations when the item could be no longer rendered by the time
			// `.onItemHeightDidChange(i)` gets called.
			return warn('The item is no longer rendered. This is not necessarily a bug, and could happen, for example, when when a developer calls `onItemHeightDidChange(i)` while looping through a batch of items.')
		}

		const previousHeight = itemHeights[i]
		if (previousHeight === undefined) {
			return reportError(`"onItemHeightDidChange()" has been called for item index ${i} but the item hasn't been rendered before.`)
		}

		log('~ Re-measure item height ~')

		let newHeight

		try {
			newHeight = remeasureItemHeight.call(this, i)
		} catch (error) {
			// Successfully finishing an `onItemHeightDidChange(i)` call is not considered
			// critical for `VirtualScroller`'s operation, so such errors could be ignored.
			if (error instanceof ItemNotRenderedError) {
				return reportError(`"onItemHeightDidChange()" has been called for item index ${i} but the item is not currently rendered and can\'t be measured. The exact error was: ${error.message}`)
			}
		}

		log('Previous height', previousHeight)
		log('New height', newHeight)

		if (previousHeight !== newHeight) {
			log('~ Item height has changed. Should update layout. ~')

			// Update or reset a previously calculated layout with the new item height
			// so that the potential future "diff"s based on that "previously calculated" layout
			// would be correct.
			//
			// The "previously calculated layout" feature is not currently used
			// so this function call doesn't really affect anything.
			//
			updatePreviouslyCalculatedLayoutOnItemHeightChange.call(this, i, previousHeight, newHeight)

			// Recalculate layout.
			//
			// If the `VirtualScroller` is already waiting for a state update to be rendered,
			// delay `onItemHeightDidChange(i)`'s re-layout until that state update is rendered.
			// The reason is that React `<VirtualScroller/>`'s `onHeightDidChange()` is meant to
			// be called inside `useLayoutEffect()` hook. Due to how React is implemented internally,
			// that might happen in the middle of the currently pending `setState()` operation
			// being applied, resulting in weird "race condition" bugs.
			//
			if (this._isActive) {
				if (this.waitingForRender) {
					log('~ Another state update is already waiting to be rendered. Delay the layout update until then. ~')
					this.updateLayoutAfterRenderBecauseItemHeightChanged = true
				} else {
					this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.ITEM_HEIGHT_CHANGED })
				}
			}

			// If there was a request for `setState()` with new `items`, then the changes
			// to `currentState.itemHeights[]` made above in a `remeasureItemHeight()` call
			// would be overwritten when that pending `setState()` call gets applied.
			// To fix that, the updates to current `itemHeights[]` are noted in
			// `this.itemHeightsThatChangedWhileNewItemsWereBeingRendered` variable.
			// That variable is then checked when the `setState()` call with the new `items`
			// has been updated.
			if (this.newItemsWillBeRendered) {
				if (!this.itemHeightsThatChangedWhileNewItemsWereBeingRendered) {
					this.itemHeightsThatChangedWhileNewItemsWereBeingRendered = {}
				}
				this.itemHeightsThatChangedWhileNewItemsWereBeingRendered[String(i)] = newHeight
			}
		}
	}

	this.getPrerenderMargin = () => {
		// The list component renders not only the items that're currently visible
		// but also the items that lie within some extra vertical margin (called
		// "prerender margin") on top and bottom for future scrolling: this way,
		// there'll be significantly less layout recalculations as the user scrolls,
		// because now it doesn't have to recalculate layout on each scroll event.
		// By default, the "prerender margin" is equal to the screen height:
		// this seems to be the optimal value for "Page Up" / "Page Down" navigation
		// and optimized mouse wheel scrolling (a user is unlikely to continuously
		// scroll past the screen height, because they'd stop to read through
		// the newly visible items first, and when they do stop scrolling, that's
		// when layout gets recalculated).
		const renderAheadMarginRatio = 1 // in scrollable container heights.
		return this.scrollableContainer.getHeight() * renderAheadMarginRatio
	}

	/**
	 * Calls `onItemFirstRender()` for items that haven't been
	 * "seen" previously.
	 * @param  {any[]} items
	 * @param  {number[]} itemHeights
	 * @param  {number} firstShownItemIndex
	 * @param  {number} lastShownItemIndex
	 */
	this.onBeforeShowItems = (
		items,
		itemHeights,
		firstShownItemIndex,
		lastShownItemIndex
	) => {
		if (this.onItemInitialRender) {
			let i = firstShownItemIndex
			while (i <= lastShownItemIndex) {
				if (itemHeights[i] === undefined) {
					this.onItemInitialRender(items[i])
				}
				i++
			}
		}
	}

	this.measureItemHeightsAndSpacing = () => {
		// Measure "newly shown" item heights.
		// Also re-validate already measured items' heights.
		this.itemHeights.measureItemHeights(
			this.getState().firstShownItemIndex,
			this.getState().lastShownItemIndex
		)

		// Measure item vertical spacing, if required.
		const verticalSpacing = this.measureVerticalSpacingIfNotMeasured()

		// Return a state update if vertical spacing has been measured.
		// Doesn't set `verticalSpacing: 0` in `state` because it is effectively
		// same as `verticalSpacing: undefined` in terms code behavior and calculations.
		// Not having `verticalSpacing: 0` in `state` just makes the `state` object
		// a bit more cleaner and a bit less cluttered (easier for inspection).
		if (verticalSpacing && verticalSpacing !== 0) {
			// Return a state update.
			// Sets `verticalSpacing` property in `state`.
			return {
				verticalSpacing
			}
		}
	}

	this.cancelLayoutTimer = ({ stateUpdate }) => {
		if (this.layoutTimer) {
			clearTimeout(this.layoutTimer)
			this.layoutTimer = undefined
			// Merge state updates.
			if (stateUpdate || this.layoutTimerStateUpdate) {
				stateUpdate = {
					...this.layoutTimerStateUpdate,
					...stateUpdate
				}
				this.layoutTimerStateUpdate = undefined
				return stateUpdate
			}
		} else {
			return stateUpdate
		}
	}

	this.scheduleLayoutTimer = ({ reason, stateUpdate }) => {
		this.layoutTimerStateUpdate = stateUpdate
		this.layoutTimer = setTimeout(() => {
			this.layoutTimerStateUpdate = undefined
			this.layoutTimer = undefined
			this.onUpdateShownItemIndexes({
				reason,
				stateUpdate
			})
		}, 0)
	}
}

const SLOW_LAYOUT_DURATION = 15 // in milliseconds.