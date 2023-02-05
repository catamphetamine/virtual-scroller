import React, { useRef, useMemo, useLayoutEffect } from 'react'
import PropTypes from 'prop-types'

import useState from './useState.js'
import useVirtualScroller from './useVirtualScroller.js'
import useVirtualScrollerStartStop from './useVirtualScrollerStartStop.js'
import useInstanceMethods from './useInstanceMethods.js'
import useItemKeys from './useItemKeys.js'
import useSetItemState from './useSetItemState.js'
import useOnItemHeightDidChange from './useOnItemHeightDidChange.js'
import useHandleItemsPropertyChange from './useHandleItemsPropertyChange.js'
import useHandleItemIndexesChange from './useHandleItemIndexesChange.js'
import useClassName from './useClassName.js'
import useStyle from './useStyle.js'

// When `items` property changes, `useHandleItemsPropertyChange()` hook detects that
// and calls `VirtualScroller.setItems()` which in turn calls the `updateState()` function.
// At this point, an insignificant optimization could be applied:
// the component could avoid re-rendering the second time.
// Instead, the state update could be applied "immediately" if it originated
// from `.setItems()` function call, eliminating the unneeded second re-render.
//
// I could see how this minor optimization could get brittle when modifiying the code,
// so I put it under a feature flag so that it could potentially be turned off
// in case of any potential weird issues in some future.
//
// Another reason for using this feature is:
//
// Since `useHandleItemsPropertyChange()` runs at render time
// and not after the render has finished (not in an "effect"),
// if the state update was done "conventionally" (by calling `_setNewState()`),
// React would throw an error about updating state during render.
// No one knows what the original error message was.
// Perhaps it's no longer relevant in newer versions of React.
//
const USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION = true

function VirtualScroller({
	as: AsComponent,
	items: itemsProperty,
	itemComponent: Component,
	itemComponentProps,
	// `estimatedItemHeight` property name is deprecated,
	// use `getEstimatedItemHeight` property instead.
	estimatedItemHeight,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
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
	getInitialItemState,
	...rest
}, ref) {
	// List items "container" DOM Element reference.
	const container = useRef()

	// Create a `VirtualScroller` instance.
	const virtualScroller = useVirtualScroller({
		items: itemsProperty,
		// `estimatedItemHeight` property name is deprecated,
		// use `getEstimatedItemHeight` property instead.
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
		getInitialItemState,
		onStateChange
	}, {
		container
	})

	// Only compute the initial state once.
	const _initialState = useMemo(() => {
		return virtualScroller.getInitialState()
	}, [])

	// Use React's `useState()` hook for managing `VirtualScroller`'s state lifecycle.
	// This way, React will re-render the component on every state update.
	const {
		getState,
		updateState,
		getNextState
	} = useState({
		initialState: _initialState,
		onRender: virtualScroller.onRender,
		itemsProperty,
		USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION
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

	// Cache per-item `setItemState` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getSetItemState = useSetItemState({
		initialItemsCount: itemsProperty.length,
		virtualScroller
	})

	// Cache per-item `onItemHeightDidChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemHeightDidChange = useOnItemHeightDidChange({
		initialItemsCount: itemsProperty.length,
		virtualScroller
	})

	// Calls `.setItems()` if `items` property has changed.
	useHandleItemsPropertyChange(itemsProperty, {
		virtualScroller,
		// `preserveScrollPosition` property name is deprecated,
		// use `preserveScrollPositionOnPrependItems` property instead.
		preserveScrollPosition,
		preserveScrollPositionOnPrependItems,
		nextItems: getNextState().items
	})

	// Updates `key`s if item indexes have changed.
	useHandleItemIndexesChange({
		virtualScroller,
		itemsBeingRendered: getNextState().items,
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
		getNextState
	})

	const {
		items: currentItems,
		itemStates,
		firstShownItemIndex,
		lastShownItemIndex
	} = getNextState()

	return (
		<AsComponent
			{...rest}
			ref={container}
			className={className}
			style={style}>
			{currentItems.map((item, i) => {
				if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
					// * Passing `item` as `children` property is legacy and is deprecated.
					//   If version `2.x` is published in some hypothetical future,
					//   the `item` and `itemIndex` properties should be moved below
					//   `{...itemComponentProps}`.
					//
					// * Passing `itemIndex` property is legacy and is deprecated.
					//   The rationale is that setting new `items` on a React component
					//   is an asynchronous operation, so when a user obtains `itemIndex`,
					//   they don't know which `items` list does that index correspond to,
					//   therefore making it useless, or even buggy if used incorreclty.
					//
					// * Passing `onStateChange` property for legacy reasons.
					//   The new property name is `setState`.
					//   The old property name `onStateChange` is deprecated.
					//
					return (
						<Component
							item={item}
							itemIndex={i}
							{...itemComponentProps}
							key={getItemKey(item, i)}
							state={itemStates && itemStates[i]}
							setState={getSetItemState(i)}
							onStateChange={getSetItemState(i)}
							onHeightChange={getOnItemHeightDidChange(i)}
							onHeightDidChange={getOnItemHeightDidChange(i)}>
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
	// `estimatedItemHeight` property name is deprecated,
	// use `getEstimatedItemHeight` property instead.
	estimatedItemHeight: PropTypes.number,
	getEstimatedItemHeight: PropTypes.func,
	getEstimatedVisibleItemRowsCount: PropTypes.func,
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
		itemStates: PropTypes.arrayOf(PropTypes.any).isRequired,
		firstShownItemIndex: PropTypes.number.isRequired,
		lastShownItemIndex: PropTypes.number.isRequired,
		beforeItemsHeight: PropTypes.number.isRequired,
		afterItemsHeight: PropTypes.number.isRequired,
		itemHeights: PropTypes.arrayOf(PropTypes.number).isRequired,
		columnsCount: PropTypes.number,
		verticalSpacing: PropTypes.number
	}),
	getInitialItemState: PropTypes.func
}

VirtualScroller.defaultProps = {
	as: 'div'
}
