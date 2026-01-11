import { useLayoutEffect, useMemo, useRef } from 'react'

import useState from './useState.js'
import useCreateVirtualScroller from './useCreateVirtualScroller.js'
import useStartStopVirtualScroller from './useStartStopVirtualScroller.js'
import useSetNewItemsOnItemsPropertyChange from './useSetNewItemsOnItemsPropertyChange.js'
import useValidateTableBodyItemsContainer from './useValidateTableBodyItemsContainer.js'
import useClassName from './useClassName.js'
import useStyle from './useStyle.js'

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

export default function useVirtualScroller({
	// The following are `<VirtualScroller/>` properties.
	//
	items: itemsProperty,
	// Because the use of a `<tbody/>` tag as an items container component can't always be auto-detected,
	// a developer could manually pass a `tbody: boolean` property.
	// Futhermore, when using `useVirtualScroller()` hook instead of `<VirtualScroller/>` component,
	// `itemsContainerComponent` property is not accessible for tag name detection.
	tbody,
	readyToStart,
	style: styleProperty,
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
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	getEstimatedInterItemVerticalSpacing
}) {
	// A `ref` to the items container element.
	const itemsContainerRef = useRef()

	// Use `hasMounted` flag to decide if `itemsContainerRef` value should be validated.
	const hasMounted = useRef(false)
	useLayoutEffect(() => {
		hasMounted.current = true
	}, [])

	// Create a `VirtualScroller` instance.
	const virtualScroller = useCreateVirtualScroller({
		items: itemsProperty,
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
		getItemsContainerElement: () => {
			// Validate that the developer has correctly passed the returned `itemsContainerRef` property
			// as the items container component's `ref`.
			//
			// `getItemsContainerElement()` function is called both before it has mounted
			// and after it has mounted. Only validate the ref's value after it has mounted.
			//
			if (!itemsContainerRef.current) {
				if (hasMounted.current) {
					throw new Error('[virtual-scroller] Did you forget to pass the returned `itemsContainerRef` property as the items container component\'s `ref`?')
				}
			}
			// Return the items container element.
			return itemsContainerRef.current
		}
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
	useStartStopVirtualScroller(virtualScroller, { readyToStart })

	// Calls `.setItems()` if `items` property has changed.
	useSetNewItemsOnItemsPropertyChange(itemsProperty, {
		virtualScroller,
		// `preserveScrollPosition` property name is deprecated,
		// use `preserveScrollPositionOnPrependItems` property instead.
		preserveScrollPosition,
		preserveScrollPositionOnPrependItems
	})

	// A developer might "forget" to pass `itemsContainerComponent="tbody"` property
	// when using a `<tbody/>` as a container for list items.
	// This hook validates that the developer didn't "forget" to do that in such case.
	useValidateTableBodyItemsContainer({
		virtualScroller,
		tbody
	})

	const className = useClassName(classNameProperty, {
		tbody
	})

	const style = useStyle(styleProperty, {
		tbody,
		state: stateToRender
	})

	return {
		state: stateToRender,
		style,
		className,
		itemsContainerRef,
		virtualScroller
	}
}