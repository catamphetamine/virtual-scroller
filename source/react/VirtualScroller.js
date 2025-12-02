import React, { useLayoutEffect } from 'react'
import PropTypes from 'prop-types'

import useVirtualScroller from './useVirtualScroller.js'
import useItemKeys from './useItemKeys.js'
import useSetItemState from './useSetItemState.js'
import useOnItemHeightDidChange from './useOnItemHeightDidChange.js'
import useMergeRefs from './useMergeRefs.js'
import useInstanceMethods from './useInstanceMethods.js'
import useUpdateItemKeysOnItemsChange from './useUpdateItemKeysOnItemsChange.js'

import { warn } from '../utility/debug.js'

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
	itemsContainerRef: itemsContainerRefProperty,
	onMount,
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
	// `estimatedItemHeight` property name is deprecated,
	// use `getEstimatedItemHeight` property instead.
	estimatedItemHeight,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	getEstimatedInterItemVerticalSpacing,

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

	// In simple cases, the use of a `<tbody/>` tag as an items container component could be auto-detected.
	if (tbody === undefined) {
		// `tbody` auto-detection should happen before any DOM Elements have been mounted,
		// i.e. it can't rely on the trivial `getItemsContainerElement().tagName === 'TBODY'` check.
		// This is because during Server-Side Render there's no DOM Elements tree at all.
		// And server-sider render result is required to be exactly the same as client-side render result.
		// This means that `tbody` detection for the purposes of getting the initial
		// `className` or `style` property values must not rely on any DOM Elements at all,
		// and should use some other means such as explicitly passing a `tbody: true` property
		// or detecting `<tbody/>` tag usage from the `itemsContainerCompoent` property value.
		tbody = ItemsContainerComponent === 'tbody'
	}

	const {
		state: stateToRender,
		style,
		className,
		itemsContainerRef,
		virtualScroller
	} = useVirtualScroller({
		items: itemsProperty,
		tbody,
		readyToStart,
		style: itemsContainerComponentProps && itemsContainerComponentProps.style,
		className: classNameProperty || itemsContainerComponentProps && itemsContainerComponentProps.className,

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
		getEstimatedItemHeight: getEstimatedItemHeight ||
			// `estimatedItemHeight` property name is deprecated,
			// use `getEstimatedItemHeight` property instead.
			(typeof estimatedItemHeight === 'number' ? () => estimatedItemHeight : undefined),
		getEstimatedVisibleItemRowsCount,
		getEstimatedInterItemVerticalSpacing
	})

	// List items "container" DOM Element reference.
	const setItemsContainerRef = useMergeRefs(itemsContainerRef, itemsContainerRefProperty)

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

	// Updates `key`s if item indexes have changed.
	useUpdateItemKeysOnItemsChange(stateToRender.items, {
		virtualScroller,
		usesAutogeneratedItemKeys,
		updateItemKeysForNewItems
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

// Legacy compatibility:
//
// Originally, the default export of the `virtual-scroller/react` subpackage
// was only the `VirtualScroller` component, and there were no other exports.
//
// Later, `useVirtualScroller()` hook export was added.
// In order to maintain legacy compatibility, the new exports shouldn't "break"
// the existing environments that were using the old versions of the package.
// This means that in non-ES6-import environments, any additional exports
// should be added directly to the default `VirtualScroller` export.
//
VirtualScroller.useVirtualScroller = useVirtualScroller