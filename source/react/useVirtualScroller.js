import { useMemo } from 'react'

import VirtualScroller from '../VirtualScroller.js'

// Creates a `VirtualScroller` instance.
export default function useVirtualScroller({
	items,
	// `estimatedItemHeight` is deprecated, use `getEstimatedItemHeight()` instead.
	estimatedItemHeight,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	getEstimatedInterItemVerticalSpacing,
	bypass,
	// bypassBatchSize,
	onItemInitialRender,
	// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
	onItemFirstRender,
	initialScrollPosition,
	onScrollPositionChange,
	measureItemsBatchSize,
	// `scrollableContainer` property is deprecated.
	// Use `getScrollableContainer()` property instead.
	scrollableContainer,
	getScrollableContainer,
	getColumnsCount,
	getItemId,
	initialState,
	getInitialItemState,
	onStateChange
}, {
	itemsContainer
}) {
	return useMemo(() => {
		// Create `virtual-scroller` instance.
		return new VirtualScroller(
			() => itemsContainer.current,
			items,
			{
				_useTimeoutInRenderLoop: true,
				// `estimatedItemHeight` is deprecated, use `getEstimatedItemHeight()` instead.
				estimatedItemHeight,
				getEstimatedItemHeight,
				getEstimatedVisibleItemRowsCount,
				getEstimatedInterItemVerticalSpacing,
				bypass,
				// bypassBatchSize,
				onItemInitialRender,
				// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
				onItemFirstRender,
				initialScrollPosition,
				onScrollPositionChange,
				measureItemsBatchSize,
				// `scrollableContainer` property is deprecated.
				// Use `getScrollableContainer()` property instead.
				scrollableContainer,
				getScrollableContainer,
				getColumnsCount,
				getItemId,
				state: initialState,
				getInitialItemState,
				onStateChange
			}
		)
	}, [])
}