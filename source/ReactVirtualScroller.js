import React from 'react'
import PropTypes from 'prop-types'

import VirtualScroller, { getItemsDiff } from './VirtualScroller'
import shallowEqual from './shallowEqual'

// `PropTypes.elementType` is available in some version of `prop-types`.
// https://github.com/facebook/prop-types/issues/200
const elementType = PropTypes.elementType || PropTypes.oneOfType([
	PropTypes.func,
	PropTypes.object
])

export default class ReactVirtualScroller extends React.Component {
	static propTypes = {
		items: PropTypes.arrayOf(PropTypes.object).isRequired,
		itemComponent: elementType.isRequired,
		itemComponentProps: PropTypes.object,
		estimatedItemHeight: PropTypes.number,
		onMount: PropTypes.func,
		onLastSeenItemIndexChange: PropTypes.func,
		onStateChange: PropTypes.func,
		initialState: PropTypes.shape({
			items: PropTypes.arrayOf(PropTypes.object).isRequired,
			itemStates: PropTypes.arrayOf(PropTypes.any),
			firstShownItemIndex: PropTypes.number.isRequired,
			lastShownItemIndex: PropTypes.number.isRequired,
			beforeItemsHeight: PropTypes.number.isRequired,
			afterItemsHeight: PropTypes.number.isRequired,
			itemHeights: PropTypes.arrayOf(PropTypes.number).isRequired,
			itemSpacing: PropTypes.number
		})
	}

	// `this.state` is already reserved for `virtual-scroller`.
	// static getDerivedStateFromProps(props, state) {
	// 	return {
	// 		prevProps: {
	// 			items: props.items
	// 		}
	// 	}
	// }

	container = React.createRef()

	// Handler function caches.
	// Just so that the props passed to `itemComponent`
	// are not changed on every `.render()` and so
	// `itemComponent` won't re-render if it's a `PureComponent`.
	onItemStateChange = new Array(this.props.items.length)
	onItemHeightChange = new Array(this.props.items.length)

	// List items are rendered with `key`s
	// so that React doesn't reuse `itemComponent`s
	// in cases when `items` are changed.
	uniquePrefixes = []

	constructor(props) {
		super(props)
		const {
			items,
			initialState,
			estimatedItemHeight,
			onLastSeenItemIndexChange,
			onStateChange
		} = this.props
		// `this.previousItems` are only used for comparing
		// `previousItems` with `newItems` in `render()`.
		this.previousItems = items
		// Create `virtual-scroller` instance.
		this.virtualScroller = new VirtualScroller(
			() => this.container.current,
			items,
			{
				estimatedItemHeight,
				onLastSeenItemIndexChange,
				state: initialState,
				getState: () => this.state,
				setState: (newState, callback) => {
					if (this.state) {
						// Update existing state.
						this.setState(newState, callback)
					} else {
						// Set initial state.
						this.state = newState
						if (onStateChange) {
							onStateChange(newState)
						}
					}
				}
			}
		)
		// Generate unique `key` prefix for list item components.
		this.generateUniquePrefix()
	}

	getOnItemStateChange(i) {
		if (!this.onItemStateChange[i]) {
			this.onItemStateChange[i] = (itemState) => this.virtualScroller.onItemStateChange(i, itemState)
		}
		return this.onItemStateChange[i]
	}

	getOnItemHeightChange(i) {
		if (!this.onItemHeightChange[i]) {
			this.onItemHeightChange[i] = () => this.virtualScroller.onItemHeightChange(i)
		}
		return this.onItemHeightChange[i]
	}

	generateUniquePrefix() {
		const prefix = String(Math.random()).slice(2)
		if (this.uniquePrefixes.indexOf(prefix) >= 0) {
			return this.generateUniquePrefix()
		}
		this.uniquePrefixes.push(prefix)
		this.uniquePrefix = prefix
	}

	componentDidMount() {
		const { onMount } = this.props
		// `onMount()` should be called before `VirtualScroller`'s
		// in order for it to be able to be used for restoring
		// page scroll Y position.
		if (onMount) {
			onMount()
		}
		this.virtualScroller.onMount()
	}

	componentDidUpdate(prevProps, prevState) {
		const { items, onStateChange } = this.props
		this.virtualScroller.onUpdate(prevState)
		if (items !== prevProps.items) {
			this.virtualScroller.updateItems(items)
		}
		if (onStateChange) {
			if (!shallowEqual(this.state, prevState)) {
				onStateChange(this.state, prevState)
			}
		}
	}

	componentWillUnmount() {
		this.virtualScroller.onUnmount()
	}

	render() {
		const {
			itemComponent: Component,
			itemComponentProps,
			// Rest
			items: _items,
			estimatedItemHeight,
			initialState,
			onStateChange,
			onLastSeenItemIndexChange,
			onMount,
			...rest
		} = this.props
		const {
			items,
			itemStates,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		} = this.virtualScroller.getState()
		// If `items` are about to be changed then
		// store the scroll Y position for the first one
		// of the current items.
		// Previously it was being done in `componentDidUpdate()`
		// but it was later found out that it wouldn't work
		// for "Show previous" button because it would
		// get hidden before `componentDidUpdate()` is called.
		//
		// Consider this code example:
		//
		// const { fromIndex, items } = this.state
		// const items = allItems.slice(fromIndex)
		// return (
		// 	{fromIndex > 0 &&
		// 		<button onClick={this.onShowPrevious}>
		// 			Show previous
		// 		</button>
		// 	}
		// 	<VirtualScroller
		// 		items={items}
		// 		itemComponent={ItemComponent}/>
		// )
		//
		// Consider a user clicks "Show previous" to show the items from the start.
		// By the time `componentDidUpdate()` is called on `<VirtualScroller/>`
		// the "Show previous" button has already been hidden
		// which results in the scroll Y position jumping forward
		// by the height of the "Show previous" button.
		// This is because `<VirtualScroller/>` restores scroll Y position
		// when items are prepended via `.updateItems()` and it does that
		// when the "Show previous" button has already been hidden
		// so that's the reason for the scroll Y jump.
		//
		// To prevent that, scroll Y position is stored at `render()` time
		// rather than later in `componentDidUpdate()`.
		//
		const newItems = this.props.items
		// `this.state` is already reserved for `virtual-scroller`.
		// const previousItems = this.state.prevProps.items
		const previousItems = this.previousItems
		this.previousItems = newItems
		// Comparing `this.props.items` to `this.virtualScroller.getState().items`
		// won't work for cases when `initialState.items` are passed.
		if (newItems !== previousItems) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = getItemsDiff(previousItems, newItems)
			if (prependedItemsCount === 0 && appendedItemsCount > 0) {
				// If it's just items that have been appended
				// then no need to re-generate the prefix
				// and to fix scroll position and to clear caches.
			} else {
				this.generateUniquePrefix()
				this.virtualScroller.captureScroll(
					previousItems,
					newItems
				)
				// Reset handler function caches.
				this.onItemStateChange = new Array(newItems.length)
				this.onItemHeightChange = new Array(newItems.length)
			}
		}
		return (
			<div
				{...rest}
				ref={this.container}
				style={{
					paddingTop: beforeItemsHeight + 'px',
					paddingBottom: afterItemsHeight + 'px'
				}}>
				{items.map((item, i) => {
					if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
						return (
							<Component
								{...itemComponentProps}
								key={`${this.uniquePrefix}:${i}`}
								state={itemStates && itemStates[i]}
								onStateChange={this.getOnItemStateChange(i)}
								onHeightChange={this.getOnItemHeightChange(i)}>
								{item}
							</Component>
						)
					}
					return null
				})}
			</div>
		)
	}
}