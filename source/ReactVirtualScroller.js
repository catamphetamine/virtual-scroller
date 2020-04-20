import React from 'react'
import PropTypes from 'prop-types'

import VirtualScroller, { getItemsDiff } from './VirtualScroller'
import shallowEqual from './shallowEqual'
import { px } from './utility'

// `PropTypes.elementType` is available in some version of `prop-types`.
// https://github.com/facebook/prop-types/issues/200
const elementType = PropTypes.elementType || PropTypes.oneOfType([
	PropTypes.string,
	PropTypes.func,
	PropTypes.object
])

export default class ReactVirtualScroller extends React.Component {
	static propTypes = {
		as: elementType,
		items: PropTypes.arrayOf(PropTypes.object).isRequired,
		itemComponent: elementType.isRequired,
		itemComponentProps: PropTypes.object,
		estimatedItemHeight: PropTypes.number,
		bypass: PropTypes.bool,
		// bypassBatchSize: PropTypes.number,
		preserveScrollPositionOnPrependItems: PropTypes.bool,
		// `preserveScrollPosition` property name is deprecated,
		// use `preserveScrollPositionOnPrependItems` instead.
		preserveScrollPosition: PropTypes.bool,
		preserveScrollPositionAtBottomOnMount: PropTypes.bool,
		shouldUpdateLayoutOnWindowResize: PropTypes.func,
		measureItemsBatchSize: PropTypes.number,
		getScrollableContainer: PropTypes.func,
		className: PropTypes.string,
		onMount: PropTypes.func,
		onItemFirstRender: PropTypes.func,
		onStateChange: PropTypes.func,
		initialCustomState: PropTypes.object,
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

	static defaultProps = {
		as: 'div'
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

	// Item refs for `.renderItem(i)`.
	itemRefs = new Array(this.props.items.length)

	// List items are rendered with `key`s
	// so that React doesn't reuse `itemComponent`s
	// in cases when `items` are changed.
	uniquePrefixes = []

	constructor(props) {
		super(props)
		const {
			as: AsComponent,
			items,
			initialState,
			initialCustomState,
			estimatedItemHeight,
			preserveScrollPositionAtBottomOnMount,
			measureItemsBatchSize,
			getScrollableContainer,
			bypass,
			// bypassBatchSize
		} = this.props
		// `this.previousItemsProperty` is only used for comparing
		// `previousItems` with `newItems` in `render()`.
		this.previousItemsProperty = items
		// Create `virtual-scroller` instance.
		this.virtualScroller = new VirtualScroller(
			() => this.container.current,
			items,
			{
				estimatedItemHeight,
				bypass,
				// bypassBatchSize,
				onItemFirstRender: this.onItemFirstRender,
				preserveScrollPositionAtBottomOnMount,
				shouldUpdateLayoutOnWindowResize: this.shouldUpdateLayoutOnWindowResize,
				measureItemsBatchSize,
				getScrollableContainer,
				tbody: AsComponent === 'tbody',
				state: initialState,
				customState: initialCustomState,
				getState: () => this.state,
				setState: (newState, callback) => {
					if (this.state) {
						// Update existing state.
						this.setState(newState, callback)
					} else {
						// Set initial state.
						this.state = newState
						this.onStateChange(newState)
					}
				}
			}
		)
		// Generate unique `key` prefix for list item components.
		this.generateUniquePrefix()
	}

	// This is a proxy for `VirtualScroller`'s `.updateLayout` instance method.
	updateLayout = () => this.virtualScroller.updateLayout()

	// `.layout()` method name is deprecated, use `.updateLayout()` instead.
	layout = () => this.updateLayout()

	// This proxy is required for cases when
	// `onItemFirstRender` property changes at subsequent renders.
	// For example, if it's passed as an "anonymous" function:
	// `<VirtualScroller onItemFirstRender={() => ...}/>`.
	onItemFirstRender = (...args) => {
		const { onItemFirstRender } = this.props
		if (onItemFirstRender) {
			onItemFirstRender(...args)
		}
	}

	// This proxy is required for cases when
	// `shouldUpdateLayoutOnWindowResize` property changes at subsequent renders.
	// For example, if it's passed as an "anonymous" function:
	// `<VirtualScroller shouldUpdateLayoutOnWindowResize={() => ...}/>`.
	shouldUpdateLayoutOnWindowResize = (...args) => {
		const { shouldUpdateLayoutOnWindowResize } = this.props
		if (shouldUpdateLayoutOnWindowResize) {
			return shouldUpdateLayoutOnWindowResize(...args)
		}
	}

	// This proxy is required for cases when
	// `onStateChange` property changes.
	// For example, if it's passed as:
	// `<VirtualScroller onStateChange={() => ...}/>`.
	onStateChange = (...args) => {
		const { onStateChange } = this.props
		if (onStateChange) {
			onStateChange(...args)
		}
	}

	shouldUseRefs() {
		// There's no way to detect if `ref` can be passed to `component`:
		// https://github.com/facebook/react/issues/16309
		// So only uses `ref`s for `React.Component`s.
		const { itemComponent } = this.props
		return isComponentClass(itemComponent)
	}

	/**
	 * A proxy to `VirtualScroller.getItemCoordinates(i)`.
	 * @param  {number} i
	 * @return {object}
	 */
	getItemCoordinates(i) {
		return this.virtualScroller.getItemCoordinates(i)
	}

	/**
	 * `updateItem(i)` has been renamed to `renderItem(i)`.
	 * @param {number} i
	 */
	updateItem(i) {
		return this.renderItem(i)
	}

	/**
	 * Re-renders an item.
	 * @param {number} i
	 */
	renderItem(i) {
		if (!this.shouldUseRefs()) {
			return console.error('[virtual-scroller] `.renderItem(i)` has been called but the `component` doesn\'t allow `ref`s. Only `component`s that\'re `React.Component`s support this feature.')
		}
		// The item may be non-rendered when `.renderItem(i)` is called on it.
		// For example, when there's a "parent comment" having several "replies"
		// each of which has an autogenerated quote of the "parent comment"
		// and then the "parent comment" is updated (for example, a YouTube video
		// link gets parsed into an embedded video player) and all of its "replies"
		// should be updated too to show the parsed video title instead of the URL,
		// so `.renderItem(i)` is simply called on all of the "parent post"'s replies
		// regardless of some of those replies being rendered or not.
		if (this.itemRefs[i] && this.itemRefs[i].current) {
			const { items } = this.props
			// Stores `item` here because the `i` index
			// might have changed when the callback is called,
			// or the item even may have been removed.
			const item = items[i]
			this.itemRefs[i].current.forceUpdate(() => {
				if (this._isMounted) {
					// Recalculates the `i` index here because it
					// might have changed when the callback is called,
					// or the item even may have been removed.
					const i = items.indexOf(item)
					if (i >= 0) {
						this.virtualScroller.onItemHeightChange(i)
					}
				}
			})
		}
	}

	// Functional components can't have a `ref` assigned to them.
	// Item `ref`s are only used for calling `.renderItem(i)` instance method.
	// If a developer is not using the `.renderItem(i)` instance method
	// then `ref`s aren't required and will be omitted.
	getItemRef(i) {
		if (!this.itemRefs[i]) {
			this.itemRefs[i] = React.createRef()
		}
		return this.itemRefs[i]
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
		// `onMount()` option is deprecated due to no longer being used.
		// If someone thinks there's a valid use case for it, create an issue.
		if (onMount) {
			onMount()
		}
		this.virtualScroller.onMount()
		this._isMounted = true
	}

	componentDidUpdate(prevProps, prevState) {
		const { onStateChange } = this.props
		// An application may choose to track `virtual-scroller` state
		// for restoring it later on "Back" navigation.
		if (onStateChange) {
			if (!shallowEqual(this.state, prevState)) {
				onStateChange(this.state, prevState)
			}
		}
		// Re-measure rendered items' heights.
		this.virtualScroller.onUpdate(prevState)
		// If `items` property did change then update `virtual-scroller` items.
		// This could have been done in `.render()` but `.setItems()` calls
		// `.setState()` internally which would result in React throwing an error.
		const { items, preserveScrollPosition, preserveScrollPositionOnPrependItems } = this.props
		if (items !== prevProps.items) {
			this.virtualScroller.setItems(items, {
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				preserveScrollPositionOnPrependItems: preserveScrollPositionOnPrependItems || preserveScrollPosition
			})
		}
	}

	componentWillUnmount() {
		this.virtualScroller.onUnmount()
		this._isMounted = false
	}

	render() {
		const {
			as: AsComponent,
			itemComponent: Component,
			itemComponentProps,
			// Rest
			items: _items,
			estimatedItemHeight,
			bypass,
			// bypassBatchSize,
			preserveScrollPositionOnPrependItems,
			// `preserveScrollPosition` property name is deprecated,
			// use `preserveScrollPositionOnPrependItems` instead.
			preserveScrollPosition,
			preserveScrollPositionAtBottomOnMount,
			shouldUpdateLayoutOnWindowResize,
			measureItemsBatchSize,
			getScrollableContainer,
			initialState,
			initialCustomState,
			onStateChange,
			onItemFirstRender,
			onMount,
			className,
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
		// when items are prepended via `.setItems()` and it does that
		// when the "Show previous" button has already been hidden
		// so that's the reason for the scroll Y jump.
		//
		// To prevent that, scroll Y position is stored at `render()` time
		// rather than later in `componentDidUpdate()`.
		//
		const newItems = this.props.items
		const previousItems = items // this.virtualScroller.getState().items
		// There's one case when `newItems !== previousItems` is `true`
		// from the start: when `initialState.items` are passed.
		// To handle that single case `this.previousItemsProperty`
		// is tracked and `this.itemsPropertyHasChanged` flag is set.
		if (!this.itemsPropertyWasChanged) {
			this.itemsPropertyWasChanged = this.props.items !== this.previousItemsProperty
		}
		this.previousItemsProperty = this.props.items
		if (this.itemsPropertyWasChanged && newItems !== previousItems) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = getItemsDiff(previousItems, newItems)
			if (prependedItemsCount === 0 && appendedItemsCount > 0) {
				// If it's just items that have been appended
				// then no need to re-generate the prefix
				// and to fix scroll position and to clear caches.
			} else {
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				if (preserveScrollPositionOnPrependItems || preserveScrollPosition) {
					this.virtualScroller.captureScroll(
						previousItems,
						newItems
					)
				}
				// Reset the unique `key` prefix for item component keys.
				this.generateUniquePrefix()
				// Reset handler function caches.
				this.onItemStateChange = new Array(newItems.length)
				this.onItemHeightChange = new Array(newItems.length)
				// Reset item refs.
				this.itemRefs = new Array(newItems.length)
			}
		}
		const tbody = this.virtualScroller.tbody
		return (
			<AsComponent
				{...rest}
				ref={this.container}
				className={tbody ? (className ? className + ' ' + 'VirtualScroller' : 'VirtualScroller') : className}
				style={{
					paddingTop: tbody ? undefined : px(beforeItemsHeight),
					paddingBottom: tbody ? undefined : px(afterItemsHeight)
				}}>
				{items.map((item, i) => {
					if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
						return (
							<Component
								{...itemComponentProps}
								ref={this.shouldUseRefs() ? this.getItemRef(i) : undefined}
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
			</AsComponent>
		)
	}
}

/**
 * Checks if the argument is a `React.Component` class.
 * https://overreacted.io/how-does-react-tell-a-class-from-a-function/
 * @param  {any}  Component
 * @return {object} [result] Returns `undefined` if it's not a `React.Component`. Returns an empty object if it's a `React.Component` (`.isReactComponent` is an empty object).
 */
function isComponentClass(Component) {
	// return Component.prototype instanceof React.Component
	// `React.memo()` returns `.prototype === undefined` for some reason.
	return Component.prototype && Component.prototype.isReactComponent
}
