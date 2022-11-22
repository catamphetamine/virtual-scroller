import React, { useRef, useMemo, useLayoutEffect } from 'react'
import PropTypes from 'prop-types'

import useState from './useState.js'
import useVirtualScroller from './useVirtualScroller.js'
import useVirtualScrollerStartStop from './useVirtualScrollerStartStop.js'
import useInstanceMethods from './useInstanceMethods.js'
import useItemKeys from './useItemKeys.js'
import useOnItemStateChange from './useOnItemStateChange.js'
import useOnItemHeightChange from './useOnItemHeightChange.js'
import useHandleItemsChange from './useHandleItemsChange.js'
import useClassName from './useClassName.js'
import useStyle from './useStyle.js'

function VirtualScroller({
	as: AsComponent,
	items,
	itemComponent: Component,
	itemComponentProps,
	estimatedItemHeight,
	bypass,
	tbody,
	// `preserveScrollPosition` property name is deprecated,
	// use `preserveScrollPositionOnPrependItems` property instead.
	preserveScrollPosition,
	preserveScrollPositionOnPrependItems,
	measureItemsBatchSize,
	// `scrollableContainer` property is deprecated.
	// Use `getScrollableContainer()` property instead.
	scrollableContainer,
	getScrollableContainer,
	getColumnsCount,
	getItemId,
	className,
	onMount,
	// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
	onItemFirstRender,
	onItemInitialRender,
	initialScrollPosition,
	onScrollPositionChange,
	onStateChange,
	initialState,
	...rest
}, ref) {
	// List items "container" DOM Element reference.
	const container = useRef()

	// Create a `VirtualScroller` instance.
	const virtualScroller = useVirtualScroller({
		items,
		estimatedItemHeight,
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
	})

	// Only compute the initial state once.
	const _initialState = useMemo(() => {
		return virtualScroller.getInitialState()
	}, [])

	// Create state management functions.
	const {
		getState,
		updateState
	} = useState({
		initialState: _initialState,
		onRender: virtualScroller.onRender,
		items
	})

	// Use custom (external) state storage in the `VirtualScroller`.
	useMemo(() => {
		virtualScroller.useState({
			getState,
			updateState
		})
	}, [])

	// Start `VirtualScroller` on mount.
	// Stop `VirtualScroller` on unmount.
	useVirtualScrollerStartStop(virtualScroller)

	// List items are rendered with `key`s so that React doesn't
	// "reuse" `itemComponent`s in cases when `items` are changed.
	const {
		getItemKey,
		updateItemKeysForNewItems
	} = useItemKeys({
		getItemId
	})

	// Cache per-item `onItemStateChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemStateChange = useOnItemStateChange({
		items,
		virtualScroller
	})

	// Cache per-item `onItemHeightChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemHeightChange = useOnItemHeightChange({
		items,
		virtualScroller
	})

	// Detect if `items` have changed.
	useHandleItemsChange(items, {
		virtualScroller,
		// `preserveScrollPosition` property name is deprecated,
		// use `preserveScrollPositionOnPrependItems` property instead.
		preserveScrollPosition,
		preserveScrollPositionOnPrependItems,
		updateItemKeysForNewItems
	})

	// Add instance methods to the React component.
	useInstanceMethods(ref, {
		virtualScroller
	})

	useLayoutEffect(() => {
		// (deprecated)
		// `onMount()` option is deprecated due to no longer being used.
		// If someone thinks there's a valid use case for it, create an issue.
		if (onMount) {
			onMount()
		}
	}, [])

	// `willRender()` function is no longer used.
	//
	// // `getSnapshotBeforeUpdate()` is called right before `componentDidUpdate()`.
	// // A hook equivalent/workaround for `getSnapshotBeforeUpdate()`:
	// // https://github.com/facebook/react/issues/15221#issuecomment-583448887
	// //
	// getSnapshotBeforeUpdate(prevProps, prevState) {
	// 	if (this.state !== prevState) {
	// 		this.willRender(this.state, prevState)
	// 	}
	// 	// Returns `null` to avoid React warning:
	// 	// "A snapshot value (or null) must be returned. You have returned undefined".
	// 	return null
	// }

	className = useClassName(className, {
		tbody
	})

	const style = useStyle({
		tbody,
		virtualScroller
	})

	const {
		items: renderedItems,
		itemStates,
		firstShownItemIndex,
		lastShownItemIndex
	} = virtualScroller.getState()

	return (
		<AsComponent
			{...rest}
			ref={container}
			className={className}
			style={style}>
			{renderedItems.map((item, i) => {
				if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
					// Passing `item` as `children` property is legacy and is deprecated.
					// If version `2.x` is published in some hypothetical future,
					// the `item` and `itemIndex` properties should be moved below
					// `{...itemComponentProps}`.
					return (
						<Component
							item={item}
							itemIndex={i}
							{...itemComponentProps}
							key={getItemKey(item, i)}
							state={itemStates && itemStates[i]}
							onStateChange={getOnItemStateChange(i)}
							onHeightChange={getOnItemHeightChange(i)}>
							{item}
						</Component>
					)
				}
				return null
			})}
		</AsComponent>
	)
}

VirtualScroller = React.forwardRef(VirtualScroller)

export default VirtualScroller

// `PropTypes.elementType` is available in some version of `prop-types`.
// https://github.com/facebook/prop-types/issues/200
const elementType = PropTypes.elementType || PropTypes.oneOfType([
	PropTypes.string,
	PropTypes.func,
	PropTypes.object
])

VirtualScroller.propTypes = {
	as: elementType,
	items: PropTypes.arrayOf(PropTypes.any).isRequired,
	itemComponent: elementType.isRequired,
	itemComponentProps: PropTypes.object,
	estimatedItemHeight: PropTypes.number,
	bypass: PropTypes.bool,
	// bypassBatchSize: PropTypes.number,
	tbody: PropTypes.bool,
	preserveScrollPositionOnPrependItems: PropTypes.bool,
	// `preserveScrollPosition` property name is deprecated,
	// use `preserveScrollPositionOnPrependItems` instead.
	preserveScrollPosition: PropTypes.bool,
	measureItemsBatchSize: PropTypes.number,
	// `scrollableContainer` property is deprecated.
	// Use `getScrollableContainer()` property instead.
	scrollableContainer: PropTypes.any,
	getScrollableContainer: PropTypes.func,
	getColumnsCount: PropTypes.func,
	getItemId: PropTypes.func,
	className: PropTypes.string,
	onMount: PropTypes.func,
	onItemInitialRender: PropTypes.func,
	// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
	onItemFirstRender: PropTypes.func,
	initialScrollPosition: PropTypes.number,
	onScrollPositionChange: PropTypes.func,
	onStateChange: PropTypes.func,
	initialState: PropTypes.shape({
		items: PropTypes.arrayOf(PropTypes.object).isRequired,
		itemStates: PropTypes.arrayOf(PropTypes.any),
		firstShownItemIndex: PropTypes.number.isRequired,
		lastShownItemIndex: PropTypes.number.isRequired,
		beforeItemsHeight: PropTypes.number.isRequired,
		afterItemsHeight: PropTypes.number.isRequired,
		itemHeights: PropTypes.arrayOf(PropTypes.number).isRequired,
		columnsCount: PropTypes.number,
		verticalSpacing: PropTypes.number
	})
}

VirtualScroller.defaultProps = {
	as: 'div'
}
