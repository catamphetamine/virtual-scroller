import React, { useMemo, useLayoutEffect } from 'react'
import PropTypes from 'prop-types'

import useState from './useState.js'
import useVirtualScroller from './useVirtualScroller.js'
import useVirtualScrollerStartStop from './useVirtualScrollerStartStop.js'
import useInstanceMethods from './useInstanceMethods.js'
import useItemKeys from './useItemKeys.js'
import useSetItemState from './useSetItemState.js'
import useOnItemHeightDidChange from './useOnItemHeightDidChange.js'
import useSetNewItemsOnItemsPropertyChange from './useSetNewItemsOnItemsPropertyChange.js'
import useUpdateItemKeysOnItemsChange from './useUpdateItemKeysOnItemsChange.js'
import useValidateTableBodyItemsContainer from './useValidateTableBodyItemsContainer.js'
import useForwardedRef from './useForwardedRef.js'
import useClassName from './useClassName.js'
import useStyle from './useStyle.js'

import { warn } from '../utility/debug.js'

// When `items` property changes:
// * A new `items` property is supplied to the React component.
// * The React component re-renders itself.
// * `useSetNewItemsOnItemsPropertyChange()` hook is run.
// * `useSetNewItemsOnItemsPropertyChange()` hook detects that the `items` property
//   has changed and calls `VirtualScroller.setItems(items)`.
// * `VirtualScroller.setItems(items)` calls `VirtualScroller.setState()`.
// * `VirtualScroller.setState()` calls the `setState()` function.
// * The `setState()` function calls a setter from a `useState()` hook.
// * The React component re-renders itself the second time.

function VirtualScroller({
	// The following are `<VirtualScroller/>` properties.
	//
	// `as` property is deprecated, use `itemsContainerComponent` property instead.
	as,
	items: itemsProperty,
	itemComponent: ItemComponent,
	itemComponentProps,
	itemsContainerComponent: ItemsContainerComponent,
	itemsContainerComponentProps,
	itemsContainerRef,
	// `estimatedItemHeight` property name is deprecated,
	// use `getEstimatedItemHeight` property instead.
	estimatedItemHeight,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	getEstimatedInterItemVerticalSpacing,
	onMount,
	// `tbody` property is deprecated.
	// Pass `as: "tbody"` property instead.
	tbody,
	readyToStart,
	className: classNameProperty,

	// The following are the "core" component options.
	//
	bypass,
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
	// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
	onItemFirstRender,
	onItemInitialRender,
	initialScrollPosition,
	onScrollPositionChange,
	initialState,
	getInitialItemState,
	onStateChange,

	// "Rest" properties that will be passed through to the `itemsContainerComponent`.
	...rest
}, ref) {
	// Previously, `as` property was being used instead of `itemsContainerComponent`,
	// and the default `as` property value was a generic `<div/>`.
	// Starting from version `1.14.1`, it is recommended to explicitly specify the `itemsContainerComponent`.
	// The default `"div"` fallback value is just a legacy compatibility relic, and so is the `as` property.
	if (!ItemsContainerComponent) {
		ItemsContainerComponent = as || 'div'
	}

	// It turns out that since May 2022, `useVirtualScroller()` hook completely ignored the `tbody` property.
	// Instead, it always derived `tbody` property value from `as` property value by comparing it to `"tbody"` string.
	// As a result, it seemed like the explicit passing of `tbody` property didn't really work as intended.
	// In the end, it was decided that perhaps `tbody` property value should always be derived from `as` property
	// without a developer having to manually specify it. So the `tbody` property was deprecated.
	// It still exists though for backwards compatibility with the older versions of the package.
	if (tbody === undefined) {
		// `tbody` should be somehow detected before any DOM Elements have been mounted.
		// This is because during Server-Side Render there's no DOM Elements tree at all.
		// And server-sider render result is required to be exactly the same as client-side render result.
		// This means that `tbody` detection for the purposes of getting the initial
		// `className` or `style` property values must not rely on any DOM Elements at all,
		// and should use some other means such as explicitly passing a `tbody: true` property
		// (as it used to be in the past) or detecting `<tbody/>` tag usage from the
		// `itemsContainerCompoent` property value.
		tbody = ItemsContainerComponent === 'tbody'
	}

	// List items "container" DOM Element reference.
	const {
		setRef: setItemsContainerRef,
		internalRef: itemsContainer
	} = useForwardedRef(itemsContainerRef)

	// Create a `VirtualScroller` instance.
	const virtualScroller = useVirtualScroller({
		items: itemsProperty,
		// `estimatedItemHeight` property name is deprecated,
		// use `getEstimatedItemHeight` property instead.
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
	})

	// Only compute the initial state once.
	const _initialState = useMemo(() => {
		return virtualScroller.getInitialState()
	}, [])

	// Use React's `useState()` hook for managing `VirtualScroller`'s state lifecycle.
	// This way, React will re-render the component on every state update.
	const {
		getState,
		setState,
		stateToRender
	} = useState({
		initialState: _initialState,
		onRender: virtualScroller.onRender
	})

	// Use custom (external) state storage in the `VirtualScroller`.
	useMemo(() => {
		virtualScroller.useState({
			getState,
			setState
		})
	}, [])

	// Start `VirtualScroller` on mount.
	// Stop `VirtualScroller` on unmount.
	useVirtualScrollerStartStop(virtualScroller, { readyToStart })

	// List items are rendered with `key`s so that React doesn't
	// "reuse" `itemComponent`s in cases when `items` are changed.
	const {
		getItemKey,
		onItemKeysReset,
		usesAutogeneratedItemKeys,
		updateItemKeysForNewItems
	} = useItemKeys({
		getItemId
	})

	// Cache per-item `setItemState` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getSetItemState = useSetItemState({
		getItemKey,
		onItemKeysReset,
		virtualScroller
	})

	// Cache per-item `onItemHeightDidChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemHeightDidChange = useOnItemHeightDidChange({
		getItemKey,
		onItemKeysReset,
		virtualScroller
	})

	// Calls `.setItems()` if `items` property has changed.
	useSetNewItemsOnItemsPropertyChange(itemsProperty, {
		virtualScroller,
		// `preserveScrollPosition` property name is deprecated,
		// use `preserveScrollPositionOnPrependItems` property instead.
		preserveScrollPosition,
		preserveScrollPositionOnPrependItems
	})

	// Updates `key`s if item indexes have changed.
	useUpdateItemKeysOnItemsChange(stateToRender.items, {
		virtualScroller,
		usesAutogeneratedItemKeys,
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
			warn('`onMount` property is deprecated')
			onMount()
		}
	}, [])

	// A developer might "forget" to pass `itemsContainerComponent="tbody"` property
	// when using a `<tbody/>` as a container for list items.
	// This hook validates that the developer didn't "forget" to do that in such case.
	useValidateTableBodyItemsContainer({
		virtualScroller,
		tbody
	})

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

	const classNamePassThrough = classNameProperty || itemsContainerComponentProps && itemsContainerComponentProps.className

	const className = useClassName(classNamePassThrough, {
		tbody
	})

	const stylePassThrough = itemsContainerComponentProps && itemsContainerComponentProps.style

	const style = useStyle(stylePassThrough, {
		tbody,
		state: stateToRender
	})

	const {
		items: currentItems,
		itemStates,
		firstShownItemIndex,
		lastShownItemIndex
	} = stateToRender

	return (
		<ItemsContainerComponent
			{...itemsContainerComponentProps}
			{...rest}
			ref={setItemsContainerRef}
			className={className}
			style={style}>
			{currentItems.map((item, i) => {
				if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
					// * Passing the `item` as `children` property is legacy and is deprecated.
					//   If version `2.x` is published in some hypothetical future,
					//   the `item` property should be moved below `{...itemComponentProps}`.
					//
					// * Passing `itemIndex` property is legacy and is deprecated
					//   and could be removed in some future.
					//   The rationale for deprecation is that the `items` property
					//   is not constant and could change, in which case the `itemIndex` value
					//   would be of no use because the application wouldn't know
					//   which exact `items` it corresponds to at any given moment in time.
					//   Having just the `itemIndex` and no actual `item` is therefore considered useless.
					//   Instead, a developer could simply use `getItemKey(item)` function.
					//
					// * `onStateChange` property is passed here for legacy reasons.
					//   The new property name is `setState`.
					//   The old property name `onStateChange` is deprecated
					//   and could be removed in some future.
					//
					// * `onHeightChange` property is passed here for legacy reasons.
					//   The new property name is `onHeightDidChange`.
					//   The old property name `onHeightChange` is deprecated
					//   and could be removed in some future.
					//
					return (
						<ItemComponent
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
						</ItemComponent>
					)
				}
				return null
			})}
		</ItemsContainerComponent>
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
	// `as` property is deprecated, use `itemsContainerComponent` property instead.
	as: elementType,
	items: PropTypes.arrayOf(PropTypes.any).isRequired,
	itemComponent: elementType.isRequired,
	itemComponentProps: PropTypes.object,
	// `itemsContainerComponent` property is not required just for legacy compatibility reasons.
	// Any new applications should explicitly specify it.
	itemsContainerComponent: elementType,
	itemsContainerComponentProps: PropTypes.object,
	itemsContainerRef: PropTypes.oneOfType([
		PropTypes.func,
		PropTypes.shape({ current: PropTypes.object })
	]),
	// `estimatedItemHeight` property name is deprecated,
	// use `getEstimatedItemHeight` property instead.
	estimatedItemHeight: PropTypes.number,
	getEstimatedItemHeight: PropTypes.func,
	getEstimatedVisibleItemRowsCount: PropTypes.func,
	getEstimatedInterItemVerticalSpacing: PropTypes.func,
	bypass: PropTypes.bool,
	// bypassBatchSize: PropTypes.number,
	// `tbody` property is deprecated.
	// Pass `as: "tbody"` property instead.
	// tbody: PropTypes.bool,
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
	readyToStart: PropTypes.bool,
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
