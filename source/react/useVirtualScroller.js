import { useMemo } from 'react'

import VirtualScroller from '../VirtualScroller.js'

// Creates a `VirtualScroller` instance.
export default function useVirtualScroller({
	items,
	// `estimatedItemHeight` is deprecated, use `getEstimatedItemHeight()` instead.
	estimatedItemHeight,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	bypass,
	// bypassBatchSize,
	tbody,
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
	AsComponent,
	initialState,
	onStateChange
}, {
	container
}) {
	return useMemo(() => {
		// Create `virtual-scroller` instance.
		return new VirtualScroller(
			() => container.current,
			items,
			{
				_useTimeoutInRenderLoop: true,
				// `estimatedItemHeight` is deprecated, use `getEstimatedItemHeight()` instead.
				estimatedItemHeight,
				getEstimatedItemHeight,
				getEstimatedVisibleItemRowsCount,
				bypass,
				// bypassBatchSize,
				tbody,
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
				tbody: AsComponent === 'tbody',
				state: initialState,
				onStateChange
			}
		)
	}, [])
}