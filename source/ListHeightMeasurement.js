export default class ListHeightMeasurement {
	constructor({
		itemsContainer,
		getListTopOffset
	}) {
		this.itemsContainer = itemsContainer
		this.getListTopOffset = getListTopOffset
	}

	/**
	 * Snapshots the list height while `previousItems` are still rendered,
	 * before rendering `newItems`. The list height will be re-measured
	 * after the new items have been rendered, yielding the list height difference
	 * which is gonna be the amount to scroll vertically in order to restore
	 * the previous scroll position. Is only used when prepending items.
	 * @param  {any[]} previousItems
	 * @param  {any[]} newItems
	 * @param  {number} prependedItemsCount
	 */
	snapshotListHeightBeforeAddingNewItems({
		previousItems,
		newItems,
		prependedItemsCount
	}) {
		// If there were no items in the list
		// then there's no point in restoring scroll position.
		if (previousItems.length === 0) {
			return
		}

		// If no items were prepended then no need to restore scroll position.
		if (prependedItemsCount === 0) {
			return
		}

		// The first item is supposed to be shown when the user clicks
		// "Show previous items" button. If it isn't shown though,
		// could still calculate the first item's top position using
		// the values from `itemHeights` and `verticalSpacing`.
		// But that would be a weird non-realistic scenario.
		// if (firstShownItemIndex > 0) {
		// 	let i = firstShownItemIndex - 1
		// 	while (i >= 0) {
		// 		firstItemTopOffset += itemHeights[i] + verticalSpacing
		// 		i--
		// 	}
		// }

		// This part is longer relevant: <ReactVirtualScroller/> no longer calls
		// this function two times consequtively.
		//
		// // If the scroll position has already been captured for restoration,
		// // then don't capture it the second time.
		// if (this._snapshot &&
		// 	this._snapshot.previousItems === previousItems &&
		// 	this._snapshot.newItems === newItems) {
		// 	return
		// }

		this._snapshot = {
			previousItems,
			newItems,
			itemIndex: prependedItemsCount,
			itemTopOffset: this.itemsContainer.getNthRenderedItemTopOffset(0),
			// Snapshot list top offset inside the scrollable container too
			// because it's common to hide the "Show previous items" button
			// when the user has browsed to the top of the list, which causes
			// the list's top position to shift upwards due to the button
			// no longer being rendered. Tracking list top offset doesn't
			// fit here that well, but it makes sense in real-world applications.
			listTopOffset: this.getListTopOffset()
		}
	}

	getAnchorItemIndex() {
		return this._snapshot.itemIndex
	}

	hasSnapshot() {
		return this._snapshot !== undefined
	}

	getListBottomOffsetChange() {
		const { itemIndex, itemTopOffset, listTopOffset } = this._snapshot
		// `firstShownItemIndex` is supposed to be `0` at this point,
		// so `renderedElementIndex` would be the same as the `itemIndex`.
		const itemTopOffsetNew = this.itemsContainer.getNthRenderedItemTopOffset(itemIndex)
		const listTopOffsetNew = this.getListTopOffset()
		return (itemTopOffsetNew - itemTopOffset) + (listTopOffsetNew - listTopOffset)
	}

	reset() {
		this._snapshot = undefined
	}
}