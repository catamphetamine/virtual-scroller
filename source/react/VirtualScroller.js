import React from 'react'
import PropTypes from 'prop-types'

import VirtualScrollerCore from '../VirtualScroller'

import { reportError } from '../utility/debug'
import px from '../utility/px'

// `PropTypes.elementType` is available in some version of `prop-types`.
// https://github.com/facebook/prop-types/issues/200
const elementType = PropTypes.elementType || PropTypes.oneOfType([
	PropTypes.string,
	PropTypes.func,
	PropTypes.object
])

export default class VirtualScroller extends React.Component {
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
		preserveScrollPositionOfTheBottomOfTheListOnMount: PropTypes.bool,
		// `preserveScrollPositionAtBottomOnMount` property name is deprecated,
		// use `preserveScrollPositionOfTheBottomOfTheListOnMount` property instead.
		preserveScrollPositionAtBottomOnMount: PropTypes.bool,
		measureItemsBatchSize: PropTypes.number,
		scrollableContainer: PropTypes.any,
		// `getScrollableContainer` property is deprecated.
		// Use `scrollableContainer` instead.
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
		initialCustomState: PropTypes.object,
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
	itemKeyPrefixes = []

	constructor(props) {
		super(props)
		// `this.previousItemsProperty` is only used for comparing
		// `previousItems` with `newItems` inside `render()`.
		this.previousItemsProperty = props.items
		// Generate unique `key` prefix for list item components.
		this.generateItemKeyPrefix()
		// Create `VirtualScroller` instance.
		this.createVirtualScroller()
	}

	createVirtualScroller() {
		const {
			as: AsComponent,
			items,
			initialState,
			initialCustomState,
			onStateChange,
			estimatedItemHeight,
			preserveScrollPositionOfTheBottomOfTheListOnMount,
			// `preserveScrollPositionAtBottomOnMount` property name is deprecated,
			// use `preserveScrollPositionOfTheBottomOfTheListOnMount` property instead.
			preserveScrollPositionAtBottomOnMount,
			initialScrollPosition,
			onScrollPositionChange,
			measureItemsBatchSize,
			scrollableContainer,
			// `getScrollableContainer` property is deprecated.
			// Use `scrollableContainer` instead.
			getScrollableContainer,
			getColumnsCount,
			getItemId,
			bypass,
			// bypassBatchSize
		} = this.props
		// Create `virtual-scroller` instance.
		this.virtualScroller = new VirtualScrollerCore(
			() => this.container.current,
			items,
			{
				_useTimeoutInRenderLoop: true,
				estimatedItemHeight,
				bypass,
				// bypassBatchSize,
				onItemInitialRender: this.onItemInitialRender,
				// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
				onItemFirstRender: this.onItemFirstRender,
				preserveScrollPositionOfTheBottomOfTheListOnMount,
				// `preserveScrollPositionAtBottomOnMount` property name is deprecated,
				// use `preserveScrollPositionOfTheBottomOfTheListOnMount` property instead.
				preserveScrollPositionAtBottomOnMount,
				initialScrollPosition,
				onScrollPositionChange,
				shouldUpdateLayoutOnScreenResize: this.shouldUpdateLayoutOnScreenResize,
				measureItemsBatchSize,
				scrollableContainer,
				// `getScrollableContainer` property is deprecated.
				// Use `scrollableContainer` instead.
				getScrollableContainer,
				getColumnsCount,
				getItemId,
				tbody: AsComponent === 'tbody',
				state: initialState,
				customState: initialCustomState,
				onStateChange,
				getState: () => this.state,
				setState: (newState, { willUpdateState, didUpdateState }) => {
					this.willUpdateState = willUpdateState
					this.didUpdateState = didUpdateState
					if (this.state) {
						// Update existing state.
						//
						// In case of hypothetically rewriting this in React hooks,
						// it wouldn't simply be `setState({ ...prevState, ...newState })`.
						// The reason is that `setState()` would be "asynchronous" (not immediate),
						// and `...prevState` would be stale in cases when more than a single
						// `setState()` call is made before the state actually updates,
						// making `prevState` stale, and, as a consequence, losing some
						// of the state updates.
						// For example, the first `setState()` call updates shown item indexes,
						// and the second `setState()` call updates `verticalSpacing`:
						// if it was simply `setState({ ...prevState, ...newState })`,
						// then the second state update could overwrite the first state update,
						// resulting in incorrect items being shown/hidden.
						//
						// I guess, in hooks, it could be something like:
						//
						// const [firstShownItemIndex, setFirstShownItemIndex] = useState()
						// ...
						// const setState = useCallback((newState) => {
						// 	for (const key in newState) {
						// 		switch (key) {
						// 			case 'firstShownItemIndex':
						// 				setFirstShownItemIndex(newState[key])
						// 				break
						// 			...
						// 		}
						// 	}
						// 	setFirstShownItemIndex
						// }, [])
						// const virtualScroller = new VirtualScrollerCore({
						// 	setState,
						// 	...
						// })
						// // `getState()` function would be updated on every render.
						// virtualScroller.getState = () => ({
						// 	firstShownItemIndex,
						// 	...
						// })
						//
						// But as long as it uses the classic `this.setState()`,
						// it's fine and simple.
						this.setState(newState)
					} else {
						// Set initial state.
						willUpdateState(newState)
						this.state = newState
						didUpdateState()
					}
				}
			}
		)
	}

	// This is a proxy for `VirtualScroller`'s `.updateLayout` instance method.
	updateLayout = () => this.virtualScroller.updateLayout()

	// `.layout()` method name is deprecated, use `.updateLayout()` instead.
	layout = () => this.updateLayout()

	// This proxy is required for cases when
	// `onItemInitialRender` property changes at subsequent renders.
	// For example, if it's passed as an "anonymous" function:
	// `<VirtualScroller onItemInitialRender={() => ...}/>`.
	// In such cases, if this "proxy" workaround hasn't been implemented,
	// the `VirtualScroller` instance would have the reference to the old function.
	onItemInitialRender = (...args) => {
		const { onItemInitialRender } = this.props
		if (onItemInitialRender) {
			onItemInitialRender(...args)
		}
	}

	// This proxy is required for cases when
	// `onItemFirstRender` property changes at subsequent renders.
	// For example, if it's passed as an "anonymous" function:
	// `<VirtualScroller onItemFirstRender={() => ...}/>`.
	// In such cases, if this "proxy" workaround hasn't been implemented,
	// the `VirtualScroller` instance would have the reference to the old function.
	// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
	onItemFirstRender = (...args) => {
		const { onItemFirstRender } = this.props
		if (onItemFirstRender) {
			onItemFirstRender(...args)
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
	 * Returns a `key` for an `item`'s element.
	 * @param  {object} item — The item.
	 * @param  {number} i — Item's index in `items` list.
	 * @return {any}
	 */
	getItemKey(item, i) {
		const { getItemId } = this.props
		if (getItemId) {
			return getItemId(item)
		}
		return `${this.itemKeyPrefix}:${i}`
	}

	/**
	 * A proxy to `VirtualScroller.getItemCoordinates(i)`.
	 * @param  {number} i
	 * @return {object}
	 */
	/*
	getItemCoordinates(i) {
		return this.virtualScroller.getItemCoordinates(i)
	}
	*/

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
		i = this.getItemIndex(i)
		if (i === undefined) {
			return reportError(`Item ${JSON.stringify(i)} not found when calling ".renderItem()"`)
		}
		if (!this.shouldUseRefs()) {
			return reportError('`.renderItem(i)` has been called but the `component` doesn\'t allow `ref`s. Only `component`s that\'re `React.Component`s support this feature.')
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

	getItemIndex(i) {
		if (typeof i === 'number') {
			return i
		}
		if (typeof i === 'object' && i !== null) {
			const { items, getItemId } = this.props
			const item = i
			i = 0
			while (i < items.length) {
				if (getItemId) {
					if (getItemId(item) === getItemId(items[i])) {
						return i
					}
				} else {
					if (item === items[i]) {
						return i
					}
				}
				i++
			}
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

	generateItemKeyPrefix() {
		const prefix = String(Math.random()).slice(2)
		if (this.itemKeyPrefixes.indexOf(prefix) >= 0) {
			return this.generateItemKeyPrefix()
		}
		this.itemKeyPrefixes.push(prefix)
		this.itemKeyPrefix = prefix
	}

	componentDidMount() {
		const { onMount } = this.props
		// `onMount()` option is deprecated due to no longer being used.
		// If someone thinks there's a valid use case for it, create an issue.
		if (onMount) {
			onMount()
		}
		this._isMounted = true
		// Start listening to scroll events.
		this.virtualScroller.listen()
	}

	// `getSnapshotBeforeUpdate()` is called right before `componentDidUpdate()`.
	getSnapshotBeforeUpdate(prevProps, prevState) {
		if (this.state !== prevState) {
			this.willUpdateState(this.state, prevState)
		}
		// Returns `null` to avoid React warning:
		// "A snapshot value (or null) must be returned. You have returned undefined".
		return null
	}

	// `componentDidUpdate()` is called immediately after React component has re-rendered.
	// That would correspond to `useLayoutEffect()` in React Hooks.
	componentDidUpdate(prevProps, prevState) {
		// If `state` did change.
		if (this.state !== prevState) {
			this.didUpdateState(prevState)
		}
		// If `items` property did change then update `virtual-scroller` items.
		// This could have been done in `.render()` but `.setItems()` calls
		// `.setState()` internally which would result in React throwing an error.
		const {
			items,
			preserveScrollPosition,
			preserveScrollPositionOnPrependItems
		} = this.props
		if (items !== prevProps.items) {
			this.virtualScroller.setItems(items, {
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				preserveScrollPositionOnPrependItems: preserveScrollPositionOnPrependItems || preserveScrollPosition
			})
		}
	}

	componentWillUnmount() {
		this._isMounted = false
		// Stop listening to scroll events.
		this.virtualScroller.stop()
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
			preserveScrollPositionOfTheBottomOfTheListOnMount,
			// `preserveScrollPositionAtBottomOnMount` property name is deprecated,
			// use `preserveScrollPositionOfTheBottomOfTheListOnMount` property instead.
			preserveScrollPositionAtBottomOnMount,
			initialScrollPosition,
			onScrollPositionChange,
			measureItemsBatchSize,
			scrollableContainer,
			// `getScrollableContainer` property is deprecated.
			// Use `scrollableContainer` instead.
			getScrollableContainer,
			getColumnsCount,
			initialState,
			initialCustomState,
			onStateChange,
			onItemInitialRender,
			// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
			onItemFirstRender,
			getItemId,
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
		// By the time `componentDidUpdate()` is called on `<VirtualScroller/>`,
		// the "Show previous" button has already been hidden
		// (because there're no more "previous" items)
		// which results in the scroll Y position jumping forward
		// by the height of that "Show previous" button.
		// This is because `<VirtualScroller/>` captures scroll Y
		// position when items are prepended via `.setItems()`
		// when the "Show previous" button is still being shown,
		// and then restores scroll Y position in `.didUpdateState()`
		// when the "Show previous" button has already been hidden:
		// that's the reason for the scroll Y "jump".
		//
		// To prevent that, scroll Y position is captured at `render()`
		// time rather than later in `componentDidUpdate()`: this way,
		// scroll Y position is captured while the "Show previous" button
		// is still being shown.
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
			const itemsDiff = this.virtualScroller.getItemsDiff(previousItems, newItems)
			if (itemsDiff && itemsDiff.prependedItemsCount === 0 && itemsDiff.appendedItemsCount > 0) {
				// If it's just items that have been appended
				// then no need to re-generate the prefix
				// and to fix scroll position and to clear caches.
			} else {
				// If the items update was incremental, then it's possible
				// that some items were prepended, and so the scroll Y position
				// should be restored after rendering those new items
				// in order for the currently shown items to stay
				// on the same position on screen.
				// (only if explicitly opted into using this feature)
				//
				// If the items update wasn't incremental
				// then there's no point in restoring scroll position.
				//
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				//
				if (itemsDiff) {
					const { prependedItemsCount } = itemsDiff
					if (prependedItemsCount > 0) {
						if (preserveScrollPositionOnPrependItems || preserveScrollPosition) {
							if (firstShownItemIndex === 0) {
								this.virtualScroller.restoreScroll.captureScroll({
									previousItems,
									newItems,
									prependedItemsCount
								})
							}
						}
					}
				}
				// Reset the unique `key` prefix for item component keys.
				if (!getItemId) {
					this.generateItemKeyPrefix()
				}
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
								key={this.getItemKey(item, i)}
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
