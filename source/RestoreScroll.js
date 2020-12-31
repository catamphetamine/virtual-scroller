export default class RestoreScroll {
	constructor({
		screen,
		getContainerElement,
		scrollBy
	}) {
		this.screen = screen
		this.getContainerElement = getContainerElement
		this.scrollBy = scrollBy
	}

	/**
	 * `<ReactVirtualScroller/>` calls this method.
	 * @param  {any[]} previousItems
	 * @param  {any[]} newItems
	 * @param  {number} prependedItemsCount
	 */
	captureScroll({
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
		const container = this.getContainerElement()
		const firstItemTopOffset = this.screen.getChildElementTopOffset(container, 0)
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
		// If the scroll position has already been captured for restoration,
		// then don't capture it the second time.
		// Capturing scroll position could happen when using `<ReactVirtualScroller/>`
		// because it calls `.captureScroll()` inside `ReactVirtualScroller.render()`
		// which is followed by `<VirtualScroller/>`'s `.componentDidUpdate()`
		// that also calls `.captureScroll()` with the same arguments,
		// so that second call to `.captureScroll()` is ignored.
		// Calling `.captureScroll()` inside `ReactVirtualScroller.render()`
		// is done to prevent scroll Y position from jumping
		// when showing the first page of the "Previous items".
		// See the long section of comments in `ReactVirtualScroller.render()`
		// method for more info on why is `.captureScroll()` called there.
		if (this.restoreScrollAfterRenderValues &&
			this.restoreScrollAfterRenderValues.previousItems === previousItems &&
			this.restoreScrollAfterRenderValues.newItems === newItems) {
			return
		}
		this.restoreScrollAfterRenderValues = {
			previousItems,
			newItems,
			index: prependedItemsCount,
			visibleAreaTop: firstItemTopOffset
		}
	}

	getAnchorItemIndex() {
		return this.restoreScrollAfterRenderValues.index
	}

	shouldRestoreScrollAfterRender() {
		return this.restoreScrollAfterRenderValues !== undefined
	}

	getScrollDifference() {
		const { index, visibleAreaTop } = this.restoreScrollAfterRenderValues
		this.restoreScrollAfterRenderValues = undefined
		// `firstShownItemIndex` is supposed to be `0` here.
		const newVisibleAreaTop = this.screen.getChildElementTopOffset(this.getContainerElement(), index)
		return newVisibleAreaTop - visibleAreaTop
	}
}