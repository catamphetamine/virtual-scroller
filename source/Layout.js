import log from './utility/debug'

export default class Layout {
	constructor({
		bypass,
		estimatedItemHeight,
		measureItemsBatchSize,
		getVerticalSpacing,
		getColumnsCount,
		getItemHeight,
		getAverageItemHeight
	}) {
		this.bypass = bypass
		this.estimatedItemHeight = estimatedItemHeight
		this.measureItemsBatchSize = measureItemsBatchSize
		this.getVerticalSpacing = getVerticalSpacing
		this.getColumnsCount = getColumnsCount
		this.getItemHeight = getItemHeight
		this.getAverageItemHeight = getAverageItemHeight
	}

	getInitialLayoutValues({
		bypass,
		itemsCount,
		visibleAreaHeightIncludingMargins
	}) {
		// On server side, at initialization time, there's no "visible area height",
		// so default to `1` estimated rows count.
		const estimatedRowsCount = visibleAreaHeightIncludingMargins
			? this.getEstimatedRowsCountForHeight(visibleAreaHeightIncludingMargins)
			: 1
		let firstShownItemIndex
		let lastShownItemIndex
		// If there're no items then `firstShownItemIndex` stays `undefined`.
		if (itemsCount > 0) {
			firstShownItemIndex = 0
			lastShownItemIndex = this.getLastShownItemIndex(
				firstShownItemIndex,
				itemsCount,
				estimatedRowsCount,
				bypass
			)
		}
		return {
			beforeItemsHeight: 0,
			afterItemsHeight: 0,
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	getLastShownItemIndex(
		firstShownItemIndex,
		itemsCount,
		estimatedRowsCount,
		bypass
	) {
		if (this.bypass || bypass) {
			return itemsCount - 1
		}
		return Math.min(
			firstShownItemIndex + (estimatedRowsCount * this.getColumnsCount() - 1),
			itemsCount - 1
		)
	}

	getEstimatedRowsCountForHeight(height) {
		const estimatedItemHeight = this.getEstimatedItemHeight()
		if (estimatedItemHeight) {
			return Math.ceil((height + this.getVerticalSpacing()) / (estimatedItemHeight + this.getVerticalSpacing()))
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

	updateLayoutForItemsDiff(layout, {
		prependedItemsCount,
		appendedItemsCount
	}, {
		itemsCount
	}) {
		layout.firstShownItemIndex += prependedItemsCount
		layout.lastShownItemIndex += prependedItemsCount
		const columnsCount = this.getColumnsCount()
		if (prependedItemsCount % columnsCount === 0) {
			// If the layout stays the same, then simply increase
			// the top and bottom margins proportionally to the amount
			// of the items added.
			const prependedRowsCount = prependedItemsCount / columnsCount
			const appendedRowsCount = Math.ceil(appendedItemsCount / columnsCount)
			const averageItemHeight = this.getAverageItemHeight()
			const verticalSpacing = this.getVerticalSpacing()
			layout.beforeItemsHeight += prependedRowsCount * (averageItemHeight + verticalSpacing)
			layout.afterItemsHeight += appendedRowsCount * (verticalSpacing + averageItemHeight)
		} else {
			// Rows will be rebalanced as a result of prepending the items,
			// and the row heights can change as a result, so recalculate
			// `beforeItemsHeight` and `afterItemsHeight` from scratch.
			// `this.itemHeights[]` and `firstShownItemIndex`/`lastShownItemIndex`
			// have already been updated at this point.
			layout.beforeItemsHeight = this.getBeforeItemsHeight(
				firstShownItemIndex,
				lastShownItemIndex
			)
			layout.afterItemsHeight = this.getAfterItemsHeight(
				firstShownItemIndex,
				lastShownItemIndex,
				itemsCount
			)
		}
	}

	_getVisibleItemIndexes(
		visibleAreaTop,
		visibleAreaBottom,
		listTopOffset,
		itemsCount
	) {
		const columnsCount = this.getColumnsCount()
		let firstShownItemIndex
		let lastShownItemIndex
		let previousRowsHeight = 0
		const rowsCount = Math.ceil(itemsCount / columnsCount)
		let rowIndex = 0
		while (rowIndex < rowsCount) {
			const hasMoreRows = itemsCount > (rowIndex + 1) * columnsCount
			const verticalSpaceAfterCurrentRow = hasMoreRows ? this.getVerticalSpacing() : 0
			let currentRowHeight = 0
			let columnIndex = 0
			let i
			while (columnIndex < columnsCount
				&& (i = rowIndex * columnsCount + columnIndex) < itemsCount) {
				const itemHeight = this.getItemHeight(i)
				// If an item that hasn't been shown (and measured) yet is encountered
				// then show such item and then retry after it has been measured.
				if (itemHeight === undefined) {
					log(`Item index ${i} lies within the visible area or its "margins", but its height hasn't been measured yet. Mark the item as "shown", render the list, measure the item's height and redo the layout.`)
					if (firstShownItemIndex === undefined) {
						firstShownItemIndex = rowIndex * columnsCount
					}
					const heightLeft = visibleAreaBottom - (listTopOffset + previousRowsHeight)
					lastShownItemIndex = Math.min(
						(rowIndex + this.getEstimatedRowsCountForHeight(heightLeft)) * columnsCount - 1,
						// Guard against index overflow.
						itemsCount - 1
					)
					return {
						firstNonMeasuredItemIndex: i,
						firstShownItemIndex,
						lastShownItemIndex
					}
				}
				currentRowHeight = Math.max(currentRowHeight, itemHeight)
				// If this is the first item visible
				// then start showing items from this row.
				if (firstShownItemIndex === undefined) {
					if (listTopOffset + previousRowsHeight + currentRowHeight > visibleAreaTop) {
						log('First shown row index', rowIndex)
						firstShownItemIndex = rowIndex * columnsCount
					}
				}
				// If this item is the last one visible in the viewport then exit.
				if (listTopOffset + previousRowsHeight + currentRowHeight + verticalSpaceAfterCurrentRow > visibleAreaBottom) {
					log('Last shown row index', rowIndex)
					// The list height is estimated until all items have been seen,
					// so it's possible that even when the list DOM element happens
					// to be in the viewport in reality the list isn't visible
					// in which case `firstShownItemIndex` will be `undefined`.
					if (firstShownItemIndex !== undefined) {
						lastShownItemIndex = Math.min(
							// The index of the last item in the current row.
							(rowIndex + 1) * columnsCount - 1,
							// Guards against index overflow.
							itemsCount - 1
						)
					}
					return {
						firstShownItemIndex,
						lastShownItemIndex
					}
				}
				columnIndex++
			}
			previousRowsHeight += currentRowHeight
			// If there're more rows below the current row, then add vertical spacing.
			previousRowsHeight += verticalSpaceAfterCurrentRow
			rowIndex++
		}
		// If there're no more items then the last item is the last one to show.
		if (firstShownItemIndex !== undefined && lastShownItemIndex === undefined) {
			lastShownItemIndex = itemsCount - 1
			log('Last item index (is fully visible)', lastShownItemIndex)
		}
		return {
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	// Finds the items which are displayed in the viewport.
	getVisibleItemIndexes(
		visibleAreaTop,
		visibleAreaBottom,
		listTopOffset,
		itemsCount
	) {
		let {
			firstNonMeasuredItemIndex,
			firstShownItemIndex,
			lastShownItemIndex
		} = this._getVisibleItemIndexes(
			visibleAreaTop,
			visibleAreaBottom,
			listTopOffset,
			itemsCount
		)
		const redoLayoutAfterMeasuringItemHeights = firstNonMeasuredItemIndex !== undefined
		// If some items will be rendered in order to measure their height,
		// and it's not a `preserveScrollPositionOnPrependItems` case,
		// then limit the amount of such items being measured in a single pass.
		if (redoLayoutAfterMeasuringItemHeights && this.measureItemsBatchSize) {
			const maxAllowedLastShownItemIndex = firstNonMeasuredItemIndex + this.measureItemsBatchSize - 1
			const columnsCount = this.getColumnsCount()
			lastShownItemIndex = Math.min(
				// Also guards against index overflow.
				lastShownItemIndex,
				// The index of the last item in the row.
				Math.ceil(maxAllowedLastShownItemIndex / columnsCount) * columnsCount - 1
			)
		}
		return {
			firstShownItemIndex,
			lastShownItemIndex,
			redoLayoutAfterMeasuringItemHeights
		}
	}

	getNonVisibleListShownItemIndexes() {
		return {
			firstShownItemIndex: 0,
			lastShownItemIndex: 0,
			redoLayoutAfterMeasuringItemHeights: this.getItemHeight(0) === undefined
		}
	}

	getItemIndexes(
		visibleAreaTop,
		visibleAreaBottom,
		listTopOffset,
		listHeight,
		itemsCount
	) {
		const isVisible = listTopOffset + listHeight > visibleAreaTop && listTopOffset < visibleAreaBottom
		if (!isVisible) {
			log('The entire list is off-screen. No items are visible.')
			return
		}
		// Find the items which are displayed in the viewport.
		const indexes = this.getVisibleItemIndexes(
			visibleAreaTop,
			visibleAreaBottom,
			listTopOffset,
			itemsCount
		)
		// The list height is estimated until all items have been seen,
		// so it's possible that even when the list DOM element happens
		// to be in the viewport, in reality the list isn't visible
		// in which case `firstShownItemIndex` will be `undefined`.
		if (indexes.firstShownItemIndex === undefined) {
			log('The entire list is off-screen. No items are visible.')
			return
		}
		return indexes
	}

	/**
	 * Measures "before" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @return {number}
	 */
	getBeforeItemsHeight(
		firstShownItemIndex,
		lastShownItemIndex
	) {
		const columnsCount = this.getColumnsCount()
		const firstShownRowIndex = Math.floor(firstShownItemIndex / columnsCount)
		let beforeItemsHeight = 0
		// Add all "before" items height.
		let rowIndex = 0
		while (rowIndex < firstShownRowIndex) {
			let rowHeight = 0
			let columnIndex = 0
			while (columnIndex < columnsCount) {
				rowHeight = Math.max(
					rowHeight,
					this.getItemHeight(rowIndex * columnsCount + columnIndex)
						|| this.getAverageItemHeight()
				)
				columnIndex++
			}
			beforeItemsHeight += rowHeight
			beforeItemsHeight += this.getVerticalSpacing()
			rowIndex++
		}
		return beforeItemsHeight
	}

	/**
	 * Measures "after" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @param  {number} averageItemHeight — Average item height.
	 * @param  {number} verticalSpacing — Item vertical spacing.
	 * @param  {number} itemsCount — Items count.
	 * @return {number}
	 */
	getAfterItemsHeight(
		firstShownItemIndex,
		lastShownItemIndex,
		itemsCount
	) {
		const columnsCount = this.getColumnsCount()
		const rowsCount = Math.ceil(itemsCount / columnsCount)
		const lastShownRowIndex = Math.floor(lastShownItemIndex / columnsCount)
		let afterItemsHeight = 0
		let rowIndex = lastShownRowIndex + 1
		while (rowIndex < rowsCount) {
			let rowHeight = 0
			let columnIndex = 0
			let i
			while (columnIndex < columnsCount
				&& (i = rowIndex * columnsCount + columnIndex) < itemsCount) {
				rowHeight = Math.max(
					rowHeight,
					this.getItemHeight(i) || this.getAverageItemHeight()
				)
				columnIndex++
			}
			// Add all "after" items height.
			afterItemsHeight += this.getVerticalSpacing()
			afterItemsHeight += rowHeight
			rowIndex++
		}
		return afterItemsHeight
	}

	/**
	 * Finds the indexes of the currently visible items.
	 * @return {object} `{ firstShownItemIndex: number, lastShownItemIndex: number, redoLayoutAfterMeasuringItemHeights: boolean }`
	 */
	getShownItemIndexes({
		listHeight,
		itemsCount,
		visibleAreaIncludingMargins,
		listTopOffsetInsideScrollableContainer
	}) {
		if (this.bypass) {
			return {
				firstShownItemIndex: 0,
				lastShownItemIndex: itemsCount - 1
			}
		}
		// Finds the indexes of the items that are currently visible
		// (or close to being visible) in the scrollable container.
		// For scrollable containers other than the main screen, it could also
		// check the visibility of such scrollable container itself, because it
		// might be not visible.
		// If such kind of an optimization would hypothetically be implemented,
		// then it would also require listening for "scroll" events on the screen.
		// Overall, I suppose that such "actual visibility" feature would be
		// a very minor optimization and not something I'd deal with.
		return this.getItemIndexes(
			visibleAreaIncludingMargins.top,
			visibleAreaIncludingMargins.bottom,
			listTopOffsetInsideScrollableContainer,
			listHeight,
			itemsCount
		) || this.getNonVisibleListShownItemIndexes()
	}

	showItemsFromTheStart(layout) {
		layout.firstShownItemIndex = 0
		layout.beforeItemsHeight = 0
	}
}

export const LAYOUT_REASON = {
	SCROLL: 'scroll',
	STOPPED_SCROLLING: 'stopped scrolling',
	MANUAL: 'manual',
	MOUNT: 'mount',
	ITEM_HEIGHT_NOT_MEASURED: 'some item height wasn\'t measured',
	RESIZE: 'resize',
	ITEM_HEIGHT_CHANGED: 'item height changed',
	ITEMS_CHANGED: 'items changed',
	TOP_OFFSET_CHANGED: 'list top offset changed'
}