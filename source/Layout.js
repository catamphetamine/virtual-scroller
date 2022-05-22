import log, { warn } from './utility/debug.js'

export default class Layout {
	constructor({
		bypass,
		estimatedItemHeight,
		measureItemsBatchSize,
		getPrerenderMargin,
		getVerticalSpacing,
		getVerticalSpacingBeforeResize,
		getColumnsCount,
		getColumnsCountBeforeResize,
		getItemHeight,
		getItemHeightBeforeResize,
		getBeforeResizeItemsCount,
		getAverageItemHeight,
		getMaxVisibleAreaHeight,
		getPreviouslyCalculatedLayout
	}) {
		this.bypass = bypass
		this.estimatedItemHeight = estimatedItemHeight
		this.measureItemsBatchSize = measureItemsBatchSize
		this.getPrerenderMargin = getPrerenderMargin
		this.getVerticalSpacing = getVerticalSpacing
		this.getVerticalSpacingBeforeResize = getVerticalSpacingBeforeResize
		this.getColumnsCount = getColumnsCount
		this.getColumnsCountBeforeResize = getColumnsCountBeforeResize
		this.getItemHeight = getItemHeight
		this.getItemHeightBeforeResize = getItemHeightBeforeResize
		this.getBeforeResizeItemsCount = getBeforeResizeItemsCount
		this.getAverageItemHeight = getAverageItemHeight
		this.getMaxVisibleAreaHeight = getMaxVisibleAreaHeight
		//
		// The "previously calculated layout" feature is not currently used.
		//
		// The current layout snapshot could be stored as a "previously calculated layout" variable
		// so that it could theoretically be used when calculating new layout incrementally
		// rather than from scratch, which would be an optimization.
		//
		this.getPreviouslyCalculatedLayout = getPreviouslyCalculatedLayout
	}

	getInitialLayoutValues({
		itemsCount,
		columnsCount
	}) {
		let firstShownItemIndex
		let lastShownItemIndex
		// If there're no items then `firstShownItemIndex` stays `undefined`.
		if (itemsCount > 0) {
			firstShownItemIndex = 0
			lastShownItemIndex = this.getInitialLastShownItemIndex({
				itemsCount,
				columnsCount,
				firstShownItemIndex
			})
		}
		return {
			beforeItemsHeight: 0,
			afterItemsHeight: 0,
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	getInitialLastShownItemIndex({
		itemsCount,
		columnsCount,
		firstShownItemIndex
	}) {
		if (this.bypass) {
			return itemsCount - 1
		}
		// On server side, at initialization time,
		// `scrollableContainer` is `undefined`,
		// so default to `1` estimated rows count.
		let estimatedRowsCount = 1
		if (this.getMaxVisibleAreaHeight()) {
			estimatedRowsCount = this.getEstimatedRowsCountForHeight(this.getMaxVisibleAreaHeight() + this.getPrerenderMargin())
		}
		return Math.min(
			firstShownItemIndex + (estimatedRowsCount * columnsCount - 1),
			itemsCount - 1
		)
	}

	getEstimatedRowsCountForHeight(height) {
		const estimatedItemHeight = this.getEstimatedItemHeight()
		const verticalSpacing = this.getVerticalSpacing()
		if (estimatedItemHeight) {
			return Math.ceil((height + verticalSpacing) / (estimatedItemHeight + verticalSpacing))
		} else {
			// If no items have been rendered yet, and no `estimatedItemHeight` option
			// has been passed, then default to `1` estimated rows count in any `height`.
			return 1
		}
	}

	/**
	 * Returns estimated list item height.
	 * (depends on which items have been previously rendered and measured).
	 * @return {number}
	 */
	getEstimatedItemHeight() {
		return this.getAverageItemHeight() || this.estimatedItemHeight || 0
	}

	getLayoutUpdateForItemsDiff({
		firstShownItemIndex,
		lastShownItemIndex,
		beforeItemsHeight,
		afterItemsHeight
	}, {
		prependedItemsCount,
		appendedItemsCount
	}, {
		itemsCount,
		columnsCount,
		shouldRestoreScrollPosition,
		onResetGridLayout
	}) {
		// const layoutUpdate = {}

		// If the layout stays the same, then simply increase
		// the top and bottom margins proportionally to the amount
		// of the items added.
		const averageItemHeight = this.getAverageItemHeight()
		const verticalSpacing = this.getVerticalSpacing()

		if (appendedItemsCount > 0) {
			const appendedRowsCount = Math.ceil(appendedItemsCount / columnsCount)
			const addedHeightAfter = appendedRowsCount * (verticalSpacing + averageItemHeight)

			afterItemsHeight += addedHeightAfter

			// layoutUpdate = {
			// 	...layoutUpdate,
			// 	afterItemsHeight
			// }
		}

		if (prependedItemsCount > 0) {
			const prependedRowsCount = Math.ceil(prependedItemsCount / columnsCount)
			const addedHeightBefore = prependedRowsCount * (averageItemHeight + verticalSpacing)

			firstShownItemIndex += prependedItemsCount
			lastShownItemIndex += prependedItemsCount
			beforeItemsHeight += addedHeightBefore

			// If the currently shown items position on screen should be preserved
			// when prepending new items, then it means that:
			// * The current scroll position should be snapshotted.
			// * The current list height should be snapshotted.
			// * All prepended items should be shown so that their height could be
			//   measured after they're rendered. Based on the prepended items' height,
			//   the scroll position will be restored so that there's no "jump of content".
			if (shouldRestoreScrollPosition) {
				firstShownItemIndex = 0
				beforeItemsHeight = 0
			}

			if (prependedItemsCount % columnsCount > 0) {
				// Rows will be rebalanced as a result of prepending new items,
				// and row heights can change as a result, so re-layout items
				// after they've been measured (after the upcoming re-render).
				//
				// For example, consider a web page where item rows are `display: flex`.
				// Suppose there're 3 columns and it shows items from 4 to 6.
				//
				// ------------------------------------------
				// | Apples are  | Bananas    | Cranberries |
				// | green       |            |             |
				// ------------------------------------------
				// | Dates       | Elderberry | Figs are    |
				// |             |            | tasty       |
				// ------------------------------------------
				//
				// Now, 1 item gets prepended. As a result, all existing rows will have
				// a different set of items, which means that the row heights will change.
				//
				// ------------------------------------------
				// | Zucchini    | Apples are | Bananas     |
				// |             | green      |             |
				// ------------------------------------------
				// | Cranberries | Dates      | Elderberry  |
				// ------------------------------------------
				// | Figs        |
				// | are tasty   |
				// ---------------
				//
				// As it can be seen above, the second row's height has changed from 2 to 1.
				// Not only that, but `itemHeights` have changed as well, so if you thought
				// that the library could easily recalculate row heights using `Math.max()` — 
				// turns out it's not always the case.
				//
				// There could be an explicit opt-in option for automatically recalculating
				// row heights, but I don't want to write code for such an extremely rare
				// use case. Instead, use the `getColumnsCount()` parameter function when
				// fetching previous items.

				onResetGridLayout()

				warn('~ Prepended items count', prependedItemsCount, 'is not divisible by Columns Count', columnsCount, '~')
				warn('Layout reset required')

				const shownItemsCountBeforeItemsUpdate = lastShownItemIndex - firstShownItemIndex + 1

				firstShownItemIndex = 0
				beforeItemsHeight = 0

				if (!shouldRestoreScrollPosition) {
					// Limit shown items count if too many items have been prepended.
					if (prependedItemsCount > shownItemsCountBeforeItemsUpdate) {
						lastShownItemIndex = this.getInitialLastShownItemIndex({
							itemsCount,
							columnsCount,
							firstShownItemIndex
						})

						// Approximate `afterItemsHeight` calculation.
						const afterItemsCount = itemsCount - (lastShownItemIndex + 1)
						afterItemsHeight = Math.ceil(afterItemsCount / columnsCount) * (verticalSpacing + averageItemHeight)

						// layoutUpdate = {
						// 	...layoutUpdate,
						// 	afterItemsHeight
						// }
					}
				}
			}

			// layoutUpdate = {
			// 	...layoutUpdate,
			// 	beforeItemsHeight,
			// 	firstShownItemIndex,
			// 	lastShownItemIndex
			// }
		}

		// return layoutUpdate

		// Overwrite all four props in all scenarios.
		// The reason is that only this way subsequent `setItems()` calls
		// will be truly "stateless" when a chain of `setItems()` calls
		// could be replaced with just the last one in a scenario when
		// `updateState()` calls are "asynchronous" (delayed execution).
		//
		// So, for example, the user calls `setItems()` with one set of items.
		// A `updateState()` call has been dispatched but the `state` hasn't been updated yet.
		// Then the user calls `setItems()` with another set of items.
		// If this function only returned a minimal set of properties that actually change,
		// the other layout properties of the second `setItems()` call wouldn't overwrite the ones
		// scheduled for update during the first `setItems()` call, resulting in an inconsistent `state`.
		//
		// For example, the first `setItems()` call does a `updateState()` call where it updates
		// `afterItemsHeight`, and then the second `setItems()` call only updates `beforeItemsHeight`
		// and `firstShownItemIndex` and `lastShownItemIndex`. If the second `setItems()` call was to
		// overwrite any effects of the pending-but-not-yet-applied first `setItems()` call, it would
		// have to call `updateState()` with an `afterItemsHeight` property too, even though it hasn't change.
		// That would be just to revert the change to `afterItemsHeight` state property already scheduled
		// by the first `setItems()` call.
		//
		return {
			beforeItemsHeight,
			afterItemsHeight,
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	// If an item that hasn't been shown (and measured) yet is encountered
	// then show such item and then retry after it has been measured.
	getItemNotMeasuredIndexes(i, {
		itemsCount,
		firstShownItemIndex,
		nonMeasuredAreaHeight,
		indexOfTheFirstItemInTheRow
	}) {
		log('Item index', i, 'height is required for calculations but hasn\'t been measured yet. Mark the item as "shown", rerender the list, measure the item\'s height and redo the layout.')

		const columnsCount = this.getColumnsCount()

		const itemsCountToRenderForMeasurement = Math.min(
			this.getEstimatedRowsCountForHeight(nonMeasuredAreaHeight) * columnsCount,
			this.measureItemsBatchSize || Infinity,
		)

		if (firstShownItemIndex === undefined) {
			firstShownItemIndex = indexOfTheFirstItemInTheRow
		}

		const lastShownItemIndex = Math.min(
			indexOfTheFirstItemInTheRow + itemsCountToRenderForMeasurement - 1,
			// Guard against index overflow.
			itemsCount - 1
		)

		return {
			firstNonMeasuredItemIndex: i,
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	/**
	 * Finds the indexes of the currently visible items.
	 * @return {object} `{ firstShownItemIndex: number, lastShownItemIndex: number, firstNonMeasuredItemIndex: number? }`
	 */
	getShownItemIndexes({
		itemsCount,
		visibleAreaTop,
		visibleAreaBottom
	}) {
		let indexes = this._getShownItemIndex({
			itemsCount,
			fromIndex: 0,
			visibleAreaTop,
			visibleAreaBottom,
			findFirstShownItemIndex: true
		})

		if (indexes === null) {
			return this.getNonVisibleListShownItemIndexes()
		}

		if (indexes.firstNonMeasuredItemIndex !== undefined) {
			return indexes
		}

		const { firstShownItemIndex, beforeItemsHeight } = indexes

		indexes = this._getShownItemIndex({
			itemsCount,
			fromIndex: firstShownItemIndex,
			beforeItemsHeight,
			visibleAreaTop,
			visibleAreaBottom,
			findLastShownItemIndex: true
		})

		if (indexes === null) {
			return this.getNonVisibleListShownItemIndexes()
		}

		if (indexes.firstNonMeasuredItemIndex !== undefined) {
			return indexes
		}

		const { lastShownItemIndex } = indexes

		return {
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	_getShownItemIndex(parameters) {
		const {
			beforeResize,
			itemsCount,
			visibleAreaTop,
			visibleAreaBottom,
			findFirstShownItemIndex,
			findLastShownItemIndex,
			// backwards
		} = parameters

		let {
			fromIndex,
			beforeItemsHeight
		} = parameters

		// This function could potentially also use `this.getPreviouslyCalculatedLayout()`
		// in order to skip calculating visible item indexes from scratch
		// and instead just calculate the difference from a "previously calculated layout".
		//
		// I did a simple test in a web browser and found out that running the following
		// piece of code is less than 10 milliseconds:
		//
		// var startedAt = Date.now()
		// var i = 0
		// while (i < 1000000) {
		//   i++
		// }
		// console.log(Date.now() - startedAt)
		//
		// Which becomes negligible in my project's use case (a couple thousands items max).
		//
		// If someone would attempt to use a "previously calculated layout" here
		// then `shownItemsHeight` would also have to be returned from this function:
		// the total height of all shown items including vertical spacing between them.
		//
		// If "previously calculated layout" would be used then it would first find
		// `firstShownItemIndex` and then find `lastShownItemIndex` as part of two
		// separate calls of this function, each with or without `backwards` flag,
		// depending on whether `visibleAreaTop` and `visibleAreBottom` have shifted up or down.

		let firstShownItemIndex
		let lastShownItemIndex

		// It's not always required to pass `beforeItemsHeight` parameter:
		// when `fromIndex` is `0`, it's also assumed to be `0`.
		if (fromIndex === 0) {
			beforeItemsHeight = 0
		}

		if (beforeItemsHeight === undefined) {
			throw new Error('[virtual-scroller] `beforeItemsHeight` not passed to `Layout.getShownItemIndexes()` when starting from index ' + fromIndex);
		}

		// const backwards = false
		// while (backwards ? i >= 0 : i < itemsCount) {}

		if (!beforeResize) {
			const beforeResizeItemsCount = this.getBeforeResizeItemsCount()
			if (beforeResizeItemsCount > fromIndex) {
				// First search for the item in "before resize" items.
				const {
					notFound,
					beforeItemsHeight: beforeResizeItemsHeight,
					firstShownItemIndex,
					lastShownItemIndex
				} = this._getShownItemIndex({
					...parameters,
					beforeResize: true,
					itemsCount: beforeResizeItemsCount
				})

				// If the item was not found in "before resize" items
				// then search in regular items skipping "before resize" ones.
				if (notFound) {
					beforeItemsHeight = beforeResizeItemsHeight
					fromIndex += beforeResizeItemsCount
				} else {
					// If the item was found in "before resize" items
					// then return the result.
					// Rebalance first / last shown item indexes based on
					// the current columns count, if required.
					const columnsCount = this.getColumnsCount()
					return {
						firstShownItemIndex: firstShownItemIndex === undefined
							? undefined
							: Math.floor(firstShownItemIndex / columnsCount) * columnsCount,
						lastShownItemIndex: lastShownItemIndex === undefined
							? undefined
							: Math.floor(lastShownItemIndex / columnsCount) * columnsCount,
						beforeItemsHeight: beforeResizeItemsHeight
					}
				}
			}
		}

		const columnsCount = beforeResize ? this.getColumnsCountBeforeResize() : this.getColumnsCount()
		const verticalSpacing = beforeResize ? this.getVerticalSpacingBeforeResize() : this.getVerticalSpacing()

		let i = fromIndex
		while (i < itemsCount) {
			const currentRowFirstItemIndex = i

			const hasMoreRows = itemsCount > currentRowFirstItemIndex + columnsCount
			const verticalSpacingAfterCurrentRow = hasMoreRows ? verticalSpacing : 0

			let currentRowHeight = 0

			// Calculate current row height.
			let columnIndex = 0
			while (columnIndex < columnsCount && i < itemsCount) {
				const itemHeight = beforeResize ? this.getItemHeightBeforeResize(i) : this.getItemHeight(i)

				// If this item hasn't been measured yet (or re-measured after a resize)
				// then mark it as the first non-measured one.
				//
				// Can't happen by definition when `beforeResize` parameter is `true`.
				//
				if (itemHeight === undefined) {
					return this.getItemNotMeasuredIndexes(i, {
						itemsCount,
						firstShownItemIndex: findLastShownItemIndex ? fromIndex : undefined,
						indexOfTheFirstItemInTheRow: currentRowFirstItemIndex,
						nonMeasuredAreaHeight: (visibleAreaBottom + this.getPrerenderMargin()) - beforeItemsHeight
					})
				}

				currentRowHeight = Math.max(currentRowHeight, itemHeight)

				columnIndex++
				i++
			}

			const itemsHeightFromFirstRowToThisRow = beforeItemsHeight + currentRowHeight

			const rowStepsIntoVisibleAreaTop = itemsHeightFromFirstRowToThisRow > visibleAreaTop - this.getPrerenderMargin()
			const rowStepsOutOfVisibleAreaBottomOrIsAtTheBorder = itemsHeightFromFirstRowToThisRow + verticalSpacingAfterCurrentRow >= visibleAreaBottom + this.getPrerenderMargin()

			// if (backwards) {
			// 	if (findFirstShownItemIndex) {
			// 		if (rowStepsOutOfVisibleAreaTop) {
			// 			return {
			// 				firstShownItemIndex: currentRowFirstItemIndex + columnsCount
			// 			}
			// 		}
			// 	} else if (findLastShownItemIndex) {
			// 		if (rowStepsIntoVisibleAreaBottom) {
			// 			return {
			// 				lastShownItemIndex: currentRowFirstItemIndex + columnsCount - 1
			// 			}
			// 		}
			// 	}
			// }

			if (findFirstShownItemIndex) {
				if (rowStepsIntoVisibleAreaTop) {
					// If item is the first one visible in the viewport
					// then start showing items from this row.
					return {
						firstShownItemIndex: currentRowFirstItemIndex,
						beforeItemsHeight
					}
				}
			} else if (findLastShownItemIndex) {
				if (rowStepsOutOfVisibleAreaBottomOrIsAtTheBorder) {
					return {
						lastShownItemIndex: Math.min(
							// The index of the last item in the current row.
							currentRowFirstItemIndex + columnsCount - 1,
							// Guards against index overflow.
							itemsCount - 1
						)
					}
				}
			}

			beforeItemsHeight += currentRowHeight + verticalSpacingAfterCurrentRow

			// if (backwards) {
			// 	// Set `i` to be the first item of the current row.
			// 	i -= columnsCount
			// 	const prevoiusRowIsBeforeResize = i - 1 < this.getBeforeResizeItemsCount()
			// 	const previousRowColumnsCount = prevoiusRowIsBeforeResize ? this.getColumnsCountBeforeResize() : this.getColumnsCount()
			// 	// Set `i` to be the first item of the previous row.
			// 	i -= previousRowColumnsCount
			// }
		}

		// if (backwards) {
		// 	if (findFirstShownItemIndex) {
		// 		warn('The list is supposed to be visible but no visible item has been found (while traversing backwards)')
		// 		return null
		// 	} else if (findLastShownItemIndex) {
		// 		return {
		// 			firstShownItemIndex: 0
		// 		}
		// 	}
		// }

		if (beforeResize) {
			return {
				notFound: true,
				beforeItemsHeight
			}
		}

		// This case isn't supposed to happen but it could hypothetically happen
		// because the list height is measured from the user's screen and
		// not necessarily can be trusted.
		if (findFirstShownItemIndex) {
			warn('The list is supposed to be visible but no visible item has been found')
			return null
		} else if (findLastShownItemIndex) {
			return {
				lastShownItemIndex: itemsCount - 1
			}
		}
	}

	getNonVisibleListShownItemIndexes() {
		const layout = {
			firstShownItemIndex: 0,
			lastShownItemIndex: 0
		}
		if (this.getItemHeight(0) === undefined) {
			layout.firstNonMeasuredItemIndex = 0
		}
		return layout
	}

	/**
	 * Measures "before" items height.
	 * @param  {number} beforeItemsCount — Basically, first shown item index.
	 * @return {number}
	 */
	getBeforeItemsHeight(
		beforeItemsCount,
		{ beforeResize } = {}
	) {
		// This function could potentially also use `this.getPreviouslyCalculatedLayout()`
		// in order to skip calculating visible item indexes from scratch
		// and instead just calculate the difference from a "previously calculated layout".
		//
		// I did a simple test in a web browser and found out that running the following
		// piece of code is less than 10 milliseconds:
		//
		// var startedAt = Date.now()
		// var i = 0
		// while (i < 1000000) {
		//   i++
		// }
		// console.log(Date.now() - startedAt)
		//
		// Which becomes negligible in my project's use case (a couple thousands items max).

		let beforeItemsHeight = 0
		let i = 0

		if (!beforeResize) {
			const beforeResizeItemsCount = this.getBeforeResizeItemsCount()

			if (beforeResizeItemsCount > 0) {
				// First add all "before resize" item heights.
				beforeItemsHeight = this.getBeforeItemsHeight(
					// `firstShownItemIndex` (called `beforeItemsCount`) could be greater than
					// `beforeResizeItemsCount` when the user scrolls down.
					// `firstShownItemIndex` (called `beforeItemsCount`) could be less than
					// `beforeResizeItemsCount` when the user scrolls up.
					Math.min(beforeItemsCount, beforeResizeItemsCount),
					{ beforeResize: true }
				)
				i = beforeResizeItemsCount
			}
		}

		const columnsCount = beforeResize ? this.getColumnsCountBeforeResize() : this.getColumnsCount()
		const verticalSpacing = beforeResize ? this.getVerticalSpacingBeforeResize() : this.getVerticalSpacing()

		while (i < beforeItemsCount) {
			const currentRowFirstItemIndex = i

			let rowHeight = 0
			let columnIndex = 0
			// Not checking for `itemsCount` overflow here because `i = beforeItemsCount`
			// can only start at the start of a row, meaning that when calculating
			// "before items height" it's not supposed to add item heights from the
			// last row of items because in that case it would have to iterate from
			// `i === beforeItemsCount` and that condition is already checked above.
			// while (i < itemsCount) {
			while (columnIndex < columnsCount) {
				let itemHeight = beforeResize ? this.getItemHeightBeforeResize(i) : this.getItemHeight(i)
				if (itemHeight === undefined) {
					// `itemHeight` can only be `undefined` when not `beforeResize`.
					// Use the current "average item height" as a substitute.
					itemHeight = this.getAverageItemHeight()
				}
				rowHeight = Math.max(rowHeight, itemHeight)
				i++
				columnIndex++
			}

			beforeItemsHeight += rowHeight
			beforeItemsHeight += verticalSpacing
		}

		return beforeItemsHeight
	}

	/**
	 * Measures "after" items height.
	 * @param  {number} lastShownItemIndex — Last shown item index.
	 * @param  {number} itemsCount — Items count.
	 * @return {number}
	 */
	getAfterItemsHeight(
		lastShownItemIndex,
		itemsCount
	) {
		// This function could potentially also use `this.getPreviouslyCalculatedLayout()`
		// in order to skip calculating visible item indexes from scratch
		// and instead just calculate the difference from a "previously calculated layout".
		//
		// I did a simple test in a web browser and found out that running the following
		// piece of code is less than 10 milliseconds:
		//
		// var startedAt = Date.now()
		// var i = 0
		// while (i < 1000000) {
		//   i++
		// }
		// console.log(Date.now() - startedAt)
		//
		// Which becomes negligible in my project's use case (a couple thousands items max).

		const columnsCount = this.getColumnsCount()
		const lastShownRowIndex = Math.floor(lastShownItemIndex / columnsCount)

		let afterItemsHeight = 0

		let i = lastShownItemIndex + 1
		while (i < itemsCount) {
			let rowHeight = 0
			let columnIndex = 0
			while (columnIndex < columnsCount && i < itemsCount) {
				let itemHeight = this.getItemHeight(i)
				if (itemHeight === undefined) {
					itemHeight = this.getAverageItemHeight()
				}
				rowHeight = Math.max(rowHeight, itemHeight)
				i++
				columnIndex++
			}

			// Add all "after" items height.
			afterItemsHeight += this.getVerticalSpacing()
			afterItemsHeight += rowHeight
		}

		return afterItemsHeight
	}

	/**
	 * Returns the items's top offset relative to the top edge of the first item.
	 * @param {number} i — Item index
	 * @return {[number]} Returns `undefined` if any of the previous items haven't been rendered yet.
	 */
	getItemTopOffset(i) {
		let topOffsetInsideScrollableContainer = 0

		const beforeResizeItemsCount = this.getBeforeResizeItemsCount()
		const beforeResizeRowsCount = beforeResizeItemsCount === 0
			? 0
			: Math.ceil(beforeResizeItemsCount / this.getColumnsCountBeforeResize())

		const maxBeforeResizeRowsCount = i < beforeResizeItemsCount
			? Math.floor(i / this.getColumnsCountBeforeResize())
			: beforeResizeRowsCount

		let beforeResizeRowIndex = 0
		while (beforeResizeRowIndex < maxBeforeResizeRowsCount) {
			const rowHeight = this.getItemHeightBeforeResize(
				beforeResizeRowIndex * this.getColumnsCountBeforeResize()
			)

			topOffsetInsideScrollableContainer += rowHeight
			topOffsetInsideScrollableContainer += this.getVerticalSpacingBeforeResize()

			beforeResizeRowIndex++
		}

		const itemRowIndex = Math.floor((i - beforeResizeItemsCount) / this.getColumnsCount())

		let rowIndex = 0
		while (rowIndex < itemRowIndex) {
			let rowHeight = 0
			let columnIndex = 0
			while (columnIndex < this.getColumnsCount()) {
				const itemHeight = this.getItemHeight(
					beforeResizeItemsCount + rowIndex * this.getColumnsCount() + columnIndex
				)
				if (itemHeight === undefined) {
					return
				}
				rowHeight = Math.max(rowHeight, itemHeight)
				columnIndex++
			}

			topOffsetInsideScrollableContainer += rowHeight
			topOffsetInsideScrollableContainer += this.getVerticalSpacing()

			rowIndex++
		}

		return topOffsetInsideScrollableContainer
	}
}

export const LAYOUT_REASON = {
	SCROLL: 'scroll',
	STOPPED_SCROLLING: 'stopped scrolling',
	MANUAL: 'manual',
	STARTED: 'started',
	NON_MEASURED_ITEMS_HAVE_BEEN_MEASURED: 'non-measured item heights have been measured',
	VIEWPORT_WIDTH_CHANGED: 'viewport width changed',
	VIEWPORT_HEIGHT_CHANGED: 'viewport height changed',
	VIEWPORT_SIZE_UNCHANGED: 'viewport size unchanged',
	ITEM_HEIGHT_CHANGED: 'item height changed',
	ITEMS_CHANGED: 'items changed',
	TOP_OFFSET_CHANGED: 'list top offset changed'
}