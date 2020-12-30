// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import ScrollableContainer, {
	ScrollableWindowContainer
} from './ScrollableContainer'

import {
	supportsTbody,
	BROWSER_NOT_SUPPORTED_ERROR,
	addTbodyStyles,
	setTbodyPadding
} from './tbody'

import Screen from './Screen'
import ItemHeights from './ItemHeights'
import getItemsDiff from './getItemsDiff'
import log, { isDebug, reportError } from './log'
import { debounce } from './utility'
import shallowEqual from './shallowEqual'

const WATCH_CONTAINER_ELEMENT_TOP_COORDINATE_INTERVAL = 500
const WATCH_CONTAINER_ELEMENT_TOP_COORDINATE_MAX_DURATION = 3000
const SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL = 250
const WAIT_FOR_USER_TO_STOP_SCROLLING_TIMEOUT = 100

export default class VirtualScroller {
	/**
	 * @param  {function} getContainerElement — Returns the container DOM `Element`.
	 * @param  {any[]} items — The list of items.
	 * @param  {Object} [options] — See README.md.
	 * @return {VirtualScroller}
	 */
	constructor(
		getContainerElement,
		items,
		options = {}
	) {
		const {
			getState,
			setState,
			onStateChange,
			customState,
			// `preserveScrollPositionAtBottomOnMount` option name is deprecated,
			// use `preserveScrollPositionOfTheBottomOfTheListOnMount` option instead.
			preserveScrollPositionAtBottomOnMount,
			measureItemsBatchSize,
			// `getScrollableContainer` option is deprecated.
			// Use `scrollableContainer` instead.
			getScrollableContainer,
			getColumnsCount,
			getItemId,
			tbody,
			_useTimeoutInRenderLoop,
			// bypassBatchSize
		} = options

		let {
			bypass,
			// margin,
			estimatedItemHeight,
			// getItemState,
			onItemInitialRender,
			// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
			onItemFirstRender,
			scrollableContainer,
			preserveScrollPositionOfTheBottomOfTheListOnMount,
			state
		} = options

		// Could support React Native.
		this.renderer = 'DOM'

		log('~ Initialize ~')

		// If `state` is passed then use `items` from `state`
		// instead of the `items` argument.
		if (state) {
			items = state.items
		}

		// `getScrollableContainer` option is deprecated.
		// Use `scrollableContainer` instead.
		if (!scrollableContainer && getScrollableContainer) {
			scrollableContainer = getScrollableContainer()
		}

		// Create `this.scrollableContainer`.
		// On client side, `this.scrollableContainer` is always created.
		// On server side, `this.scrollableContainer` is not created (and not used).
		if (this.renderer === 'DOM') {
			if (scrollableContainer) {
				this.scrollableContainer = new ScrollableContainer(scrollableContainer)
			} else if (typeof window !== 'undefined') {
				this.scrollableContainer = new ScrollableWindowContainer()
			}
		} else {
			throw new Error(`Unknown renderer: "${this.renderer}"`)
		}

		// if (margin === undefined) {
		// 	// Renders items which are outside of the screen by this "margin".
		// 	// Is the screen height by default: seems to be the optimal value
		// 	// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
		// 	margin = this.scrollableContainer ? this.scrollableContainer.getHeight() : 0
		// }

		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (tbody) {
			if (this.renderer !== 'DOM') {
				throw new Error('`tbody` option is only supported for DOM renderer')
			}
			log('~ <tbody/> detected ~')
			this.tbody = true
			if (!supportsTbody()) {
				log('~ <tbody/> not supported ~')
				reportError(BROWSER_NOT_SUPPORTED_ERROR)
				bypass = true
			}
		}

		if (bypass) {
			log('~ "bypass" mode ~')
		}

		// In `bypass` mode, `VirtualScroller` doesn't wait
		// for the user to scroll down to render all items:
		// instead, it renders all items right away, as if
		// the list is rendered without using `VirtualScroller`.
		// It was added just to measure how much is the
		// performance difference between using a `VirtualScroller`
		// and not using a `VirtualScroller`.
		// It turned out that unmounting large React component trees
		// is a very long process, so `VirtualScroller` does seem to
		// make sense when used in a React application.
		this.bypass = bypass
		// this.bypassBatchSize = bypassBatchSize || 10

		// Using `setTimeout()` in render loop is a workaround
		// for avoiding a React error message:
		// "Maximum update depth exceeded.
		//  This can happen when a component repeatedly calls
		//  `.setState()` inside `componentWillUpdate()` or `componentDidUpdate()`.
		//  React limits the number of nested updates to prevent infinite loops."
		this._useTimeoutInRenderLoop = _useTimeoutInRenderLoop

		if (getItemId) {
			this.isItemEqual = (a, b) => getItemId(a) === getItemId(b)
		} else {
			this.isItemEqual = (a, b) => a === b
		}

		this.initialItems = items
		// this.margin = margin

		this.estimatedItemHeight = estimatedItemHeight
		// this.getItemState = getItemState

		this.onStateChange = onStateChange

		this.measureItemsBatchSize = measureItemsBatchSize === undefined ? 50 : measureItemsBatchSize
		this._getColumnsCount = getColumnsCount

		if (onItemInitialRender) {
			this.onItemInitialRender = onItemInitialRender
		}
		// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
		else if (onItemFirstRender) {
			this.onItemInitialRender = (item) => {
				console.warn("[virtual-scroller] `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.")
				const { items } = this.getState()
				const i = items.indexOf(item)
				// The `item` could also be non-found due to the inconsistency bug:
				// The reason is that `i` can be non-consistent with the `items`
				// passed to `<VirtualScroller/>` in React due to `setState()` not being
				// instanteneous: when new `items` are passed to `<VirtualScroller/>`,
				// `VirtualScroller.setState({ items })` is called, and if `onItemFirstRender(i)`
				// is called after the aforementioned `setState()` is called but before it finishes,
				// `i` would point to an index in "previous" `items` while the application
				// would assume that `i` points to an index in the "new" `items`,
				// resulting in an incorrect item being assumed by the application
				// or even in an "array index out of bounds" error.
				if (i >= 0) {
					onItemFirstRender(i)
				}
			}
		}

		log('Items count', items.length)
		if (estimatedItemHeight) {
			log('Estimated item height', estimatedItemHeight)
		}

		if (setState) {
			this.getState = getState
			this.setState = (state) => {
				log('Set state', state)
				setState(state, {
					willUpdateState: this.willUpdateState,
					didUpdateState: this.didUpdateState
				})
			}
		} else {
			this.getState = () => this.state
			this.setState = (state) => {
				log('Set state', state)
				const prevState = this.getState()
				// Because this variant of `.setState()` is "synchronous" (immediate),
				// it can be written like `...prevState`, and no state updates would be lost.
				// But if it was "asynchronous" (not immediate), then `...prevState`
				// wouldn't work in all cases, because it could be stale in cases
				// when more than a single `setState()` call is made before
				// the state actually updates, making `prevState` stale.
				const newState = {
					...prevState,
					...state
				}
				this.willUpdateState(newState, prevState)
				this.state = newState
				this.didUpdateState(prevState)
			}
		}

		if (state) {
			log('Initial state (passed)', state)
		}

		if (this.renderer === 'DOM') {
			this.screen = new Screen()
		} else {
			throw new Error(`Unknown renderer: "${this.renderer}"`)
		}

		// Sometimes, when `new VirtualScroller()` instance is created,
		// `getContainerElement()` might not be ready to return the "container" DOM Element yet
		// (for example, because it's not rendered yet). That's the reason why it's a getter function.
		// For example, in React `<VirtualScroller/>` component, a `VirtualScroller`
		// instance is created in the React component's `constructor()`, and at that time
		// the container Element is not yet available. The container Element is available
		// in `componentDidMount()`, but `componentDidMount()` is not executed on server,
		// which would mean that React `<VirtualScroller/>` wouldn't render at all
		// on server side, while with the `getContainerElement()` approach, on server side,
		// it still "renders" a list with a predefined amount of items in it by default.
		// (`initiallyRenderedItemsCount`, or `1`).
		this.getContainerElement = getContainerElement
		// Remove any accidental text nodes from container (like whitespace).
		// Also guards against cases when someone accidentally tries
		// using `VirtualScroller` on a non-empty element.
		if (getContainerElement()) {
			this.screen.clearElement(getContainerElement())
		}

		this.itemHeights = new ItemHeights(this.screen, this.getContainerElement, this.getState)

		if (this.scrollableContainer) {
			if (preserveScrollPositionAtBottomOnMount) {
				console.warn('[virtual-scroller] `preserveScrollPositionAtBottomOnMount` option/property has been renamed to `preserveScrollPositionOfTheBottomOfTheListOnMount`')
				preserveScrollPositionOfTheBottomOfTheListOnMount = preserveScrollPositionAtBottomOnMount
			}
			if (preserveScrollPositionOfTheBottomOfTheListOnMount) {
				this.preserveScrollPositionOfTheBottomOfTheListOnMount = {
					scrollableContainerContentHeight: this.scrollableContainer.getContentHeight()
				}
			}
		}

		this.setState(state || this.getInitialState(customState))
	}

	/**
	 * Returns the initial state of the `VirtualScroller`.
	 * @param  {object} [customState] — Any additional "custom" state may be stored in `VirtualScroller`'s state. For example, React implementation stores item "refs" as "custom" state.
	 * @return {object}
	 */
	getInitialState(customState) {
		const itemsCount = this.initialItems.length
		const state = {
			...customState,
			...this.getInitialLayoutState(),
			items: this.initialItems,
			itemStates: new Array(itemsCount)
		}
		log('Initial state (autogenerated)', state)
		log('First shown item index', state.firstShownItemIndex)
		log('Last shown item index', state.lastShownItemIndex)
		return state
	}

	getInitialLayoutState() {
		let firstShownItemIndex
		let lastShownItemIndex
		const items = this.initialItems
		const itemsCount = items.length
		const columnsCount = this._getColumnsCount ? this._getColumnsCount(this.scrollableContainer) : undefined
		// If there're no items then `firstShownItemIndex` stays `undefined`.
		if (itemsCount > 0) {
			firstShownItemIndex = 0
			lastShownItemIndex = this.getLastShownItemIndex(
				firstShownItemIndex,
				itemsCount,
				columnsCount || 1
			)
		}
		if (this.preserveScrollPositionOfTheBottomOfTheListOnMount) {
			firstShownItemIndex = 0
			lastShownItemIndex = itemsCount - 1
		}
		const itemHeights = new Array(itemsCount)
		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			items,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)
		return {
			itemHeights,
			columnsCount,
			verticalSpacing: undefined,
			beforeItemsHeight: 0,
			afterItemsHeight: 0,
			firstShownItemIndex,
			lastShownItemIndex,
			scrollY: undefined
		}
	}

	/**
	 * Returns estimated list item height.
	 * (depends on which items have been previously rendered and measured).
	 * @return {number}
	 */
	getEstimatedItemHeight() {
		return this.itemHeights && this.itemHeights.getAverage() || this.estimatedItemHeight || 0
	}

	getVerticalSpacing() {
		return this.getState() && this.getState().verticalSpacing || 0
	}

	getColumnsCount() {
		return this.getState() && this.getState().columnsCount || 1
	}

	getEstimatedItemsCount(height) {
		return this.getEstimatedRowsCount(height) * this.getColumnsCount()
	}

	getEstimatedRowsCount(height) {
		if (this.getEstimatedItemHeight()) {
			return Math.ceil((height + this.getVerticalSpacing()) / (this.getEstimatedItemHeight() + this.getVerticalSpacing()))
		} else {
			return 1
		}
	}

	getEstimatedItemsCountOnScreen(columnsCount) {
		return this.getEstimatedRowsCountOnScreen() * columnsCount
	}

	getEstimatedRowsCountOnScreen() {
		if (this.scrollableContainer) {
			return this.getEstimatedRowsCount(this.getMargin() * 2 + this.scrollableContainer.getHeight())
		} else {
			return 1
		}
	}

	getLastShownItemIndex(firstShownItemIndex, itemsCount, columnsCount) {
		if (this.bypass) {
			return itemsCount - 1
		}
		return Math.min(
			firstShownItemIndex + (this.getEstimatedItemsCountOnScreen(columnsCount) - 1),
			itemsCount - 1
		)
	}

	getItemsCount() {
		return this.getState().items.length
	}

	getMargin() {
		// `VirtualScroller` also items that are outside of the screen
		// by the amount of this "render ahead margin" (both on top and bottom).
		// The default "render ahead margin" is equal to the screen height:
		// this seems to be the optimal value for "Page Up" / "Page Down" navigation
		// and optimized mouse wheel scrolling (a user is unlikely to continuously
		// scroll past the height of a screen, and when they stop scrolling,
		// the list is re-rendered).
		const renderAheadMarginRatio = 1 // in scrollable container heights.
		return this.scrollableContainer.getHeight() * renderAheadMarginRatio
	}

	/**
	 * Calls `onItemFirstRender()` for items that haven't been
	 * "seen" previously.
	 * @param  {any[]} items
	 * @param  {number[]} itemHeights
	 * @param  {number} firstShownItemIndex
	 * @param  {number} lastShownItemIndex
	 */
	onBeforeShowItems(
		items,
		itemHeights,
		firstShownItemIndex,
		lastShownItemIndex
	) {
		if (this.onItemInitialRender) {
			let i = firstShownItemIndex
			while (i <= lastShownItemIndex) {
				if (itemHeights[i] === undefined) {
					this.onItemInitialRender(items[i])
				}
				i++
			}
		}
	}

	onMount() {
		console.warn('[virtual-scroller] `.onMount()` instance method name is deprecated, use `.listen()` instance method name instead.')
		this.listen()
	}

	render() {
		console.warn('[virtual-scroller] `.render()` instance method name is deprecated, use `.listen()` instance method name instead.')
		this.listen()
	}

	/**
	 * Should be invoked after a "container" DOM Element is mounted (inserted into the DOM tree).
	 */
	listen() {
		if (this.isRendered === false) {
			throw new Error('[virtual-scroller] Can\'t restart a `VirtualScroller` after it has been stopped')
		}
		log('~ Rendered (initial) ~')
		// `this.isRendered = true` should be the first statement in this function,
		// otherwise `DOMVirtualScroller` would enter an infinite re-render loop.
		this.isRendered = true
		this.onRendered()
		this.scrollableContainerWidth = this.scrollableContainer.getWidth()
		this.scrollableContainerHeight = this.scrollableContainer.getHeight()
		this.restoreScrollPositionFromState()
		this.updateScrollPosition()
		this.removeScrollPositionListener = this.scrollableContainer.addScrollListener(this.updateScrollPosition)
		if (!this.bypass) {
			this.removeScrollListener = this.scrollableContainer.addScrollListener(this.onScroll)
			this.scrollableContainerUnlistenResize = this.scrollableContainer.onResize(this.onResize, { container: this.getContainerElement() })
		}
		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			addTbodyStyles(this.getContainerElement())
		}
		if (this.preserveScrollPositionOfTheBottomOfTheListOnMount) {
			// In this case, all items are shown, so there's no need to call
			// `this.onUpdateShownItemIndexes()` after the initial render.
			this.scrollTo(0, this.getScrollY() + (this.scrollableContainer.getContentHeight() - this.preserveScrollPositionOfTheBottomOfTheListOnMount.scrollableContainerContentHeight))
		} else {
			this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MOUNT })
		}
	}

	onRendered() {
		// Update item vertical spacing.
		this.measureVerticalSpacing()
		// Measure "newly shown" item heights.
		this.measureNonPreviouslyMeasuredItemHeights()
		// Update `<tbody/>` `padding`.
		// (`<tbody/>` is different in a way that it can't have `margin`, only `padding`).
		if (this.tbody) {
			this.updateTbodyPadding()
		}
	}

	updateLayout = () => this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MANUAL })
	onScroll = () => this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.SCROLL })

	/**
	 * Restores page scroll Y on `VirtualScroller` mount
	 * if a previously captured `VirtualScroller` `state` was passed.
	 */
	restoreScrollPositionFromState = () => {
		const { scrollY } = this.getState()
		if (scrollY !== undefined) {
			this.scrollTo(0, scrollY)
		}
	}

	updateScrollPosition = () => this.getState().scrollY = this.getScrollY()

	// `.layout()` method name is deprecated, use `.updateLayout()` instead.
	layout = () => this.updateLayout()

	scrollTo(scrollX, scrollY) {
		this.scrollableContainer.scrollTo(scrollX, scrollY)
	}

	getScrollY() {
		return this.scrollableContainer.getScrollY()
	}

	/**
	 * Returns visible area coordinates relative to the scrollable container.
	 * @return {object} `{ top: number, bottom: number }`
	 */
	getVisibleAreaBounds() {
		const scrollY = this.getScrollY()
		return {
			// The first pixel of the screen.
			top: scrollY,
			// The pixel after the last pixel of the screen.
			bottom: scrollY + this.scrollableContainer.getHeight()
		}
	}

	/**
	 * Returns list height.
	 * @return {number}
	 */
	getHeight() {
		return this.screen.getElementHeight(this.getContainerElement())
	}

	/**
	 * Returns list top coordinate relative to the scrollable container.
	 * @return {number}
	 */
	getTopOffset() {
		return this.scrollableContainer.getTopOffset(this.getContainerElement())
	}

	/**
	 * On scrollable container resize.
	 */
	onResize = debounce(() => {
		// If `VirtualScroller` has been unmounted
		// while `debounce()`'s `setTimeout()` was waiting, then exit.
		if (!this.isRendered) {
			return
		}
		const prevScrollableContainerWidth = this.scrollableContainerWidth
		const prevScrollableContainerHeight = this.scrollableContainerHeight
		this.scrollableContainerWidth = this.scrollableContainer.getWidth()
		this.scrollableContainerHeight = this.scrollableContainer.getHeight()
		if (this.scrollableContainerWidth === prevScrollableContainerWidth) {
			if (this.scrollableContainerHeight === prevScrollableContainerHeight) {
				// The dimensions of the container didn't change,
				// so there's no need to re-layout anything.
				return
			} else {
				// Scrollable container height has changed,
				// so just recalculate shown item indexes.
				// No need to perform a re-layout from scratch.
				this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.RESIZE })
			}
		} else {
			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			log('~ Scrollable container size changed, re-measure item heights. ~')
			this.redoLayoutReason = LAYOUT_REASON.RESIZE
			const state = this.getInitialLayoutState()
			log('Reset state to', state)
			// Calling `this.setState(state)` will trigger `didUpdateState()`.
			// `didUpdateState()` will detect `this.redoLayoutReason`.
			this.setState(state)
		}
	}, SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL)

	onUnmount() {
		console.warn('[virtual-scroller] `.onUnmount()` instance method name is deprecated, use `.stop()` instance method name instead.')
		this.stop()
	}

	destroy() {
		console.warn('[virtual-scroller] `.destroy()` instance method name is deprecated, use `.stop()` instance method name instead.')
		this.stop()
	}

	stop() {
		this.isRendered = false
		this.removeScrollPositionListener()
		if (!this.bypass) {
			this.removeScrollListener()
			this.scrollableContainerUnlistenResize()
			// this.untrackScrollableContainer
			clearTimeout(this.onUserStopsScrollingTimer)
			clearTimeout(this.watchContainerElementCoordinatesTimer)
			clearTimeout(this.layoutTimer)
		}
	}

	/**
	 * Should be called right before `state` is updated.
	 * @param  {object} prevState
	 * @param  {object} newState
	 */
	willUpdateState = (newState, prevState) => {
		// Ignore setting initial state.
		if (!prevState) {
			return
		}
		// This function isn't currently used.
		// Was previously used to capture scroll position in order to
		// restore it later after the new state is rendered.
	}

	/**
	 * Should be called right after `state` is updated.
	 * @param  {object} prevState
	 */
	didUpdateState = (prevState) => {
		const newState = this.getState()
		if (this.onStateChange) {
			if (!shallowEqual(newState, prevState)) {
				this.onStateChange(newState, prevState)
			}
		}
		// Ignore setting initial state.
		if (!prevState) {
			return
		}
		if (!this.isRendered) {
			return
		}
		log('~ Rendered ~')
		let redoLayoutReason = this.redoLayoutReason
		this.redoLayoutReason = undefined
		const { items: previousItems } = prevState
		const { items: newItems } = newState
		if (newItems !== previousItems) {
			let layoutNeedsReCalculating = true
			const itemsDiff = this.getItemsDiff(previousItems, newItems)
			// If it's an "incremental" update.
			if (itemsDiff) {
				const {
					prependedItemsCount,
					appendedItemsCount
				} = itemsDiff
				if (prependedItemsCount > 0) {
					// The call to `.onPrepend()` must precede
					// the call to `.measureNonPreviouslyMeasuredItemHeights()`
					// which is called in `.onRendered()`.
					this.itemHeights.onPrepend(prependedItemsCount)
					if (this.restoreScrollAfterRenderValues) {
						layoutNeedsReCalculating = false
						this.restoreScrollAfterRender()
					}
				}
			} else {
				this.itemHeights.initialize()
			}
			if (layoutNeedsReCalculating) {
				redoLayoutReason = LAYOUT_REASON.ITEMS_CHANGED
			}
		}
		// Call `.onRendered()` if shown items configuration changed.
		if (newState.firstShownItemIndex !== prevState.firstShownItemIndex ||
			newState.lastShownItemIndex !== prevState.lastShownItemIndex ||
			newState.items !== prevState.items) {
			this.onRendered()
		}
		if (redoLayoutReason) {
			return this.redoLayoutRightAfterRender({
				reason: redoLayoutReason
			})
		}
	}

	redoLayoutRightAfterRender({ reason }) {
		// In React, `setTimeout()` is used to prevent a React error:
		// "Maximum update depth exceeded.
		//  This can happen when a component repeatedly calls
		//  `.setState()` inside `componentWillUpdate()` or `componentDidUpdate()`.
		//  React limits the number of nested updates to prevent infinite loops."
		if (this._useTimeoutInRenderLoop) {
			// Cancel a previously scheduled re-layout.
			if (this.layoutTimer) {
				clearTimeout(this.layoutTimer)
			}
			// Schedule a new re-layout.
			this.layoutTimer = setTimeout(() => {
				this.layoutTimer = undefined
				this.onUpdateShownItemIndexes({ reason })
			}, 0)
		} else {
			this.onUpdateShownItemIndexes({ reason })
		}
	}

  /**
   * Is part of a workaround for `<tbody/>` not being able to have `padding`.
   * https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
   * CSS variables aren't supported in Internet Explorer.
   */
	updateTbodyPadding() {
		const { beforeItemsHeight, afterItemsHeight } = this.getState()
		setTbodyPadding(this.getContainerElement(), beforeItemsHeight, afterItemsHeight)
	}

	measureVerticalSpacing() {
		if (this.getState().verticalSpacing === undefined) {
			log('~ Measure item vertical spacing ~')
			const verticalSpacing = this.measureVerticalSpacingValue()
			if (verticalSpacing === undefined) {
				log('Not enough items rendered to measure vertical spacing')
			} else {
				log('Item vertical spacing', verticalSpacing)
				this.setState({ verticalSpacing })
			}
		}
	}

	measureVerticalSpacingValue() {
		const container = this.getContainerElement()
		if (this.screen.getChildElementsCount(container) > 1) {
			const firstShownRowTopCoordinate = this.screen.getChildElementTopCoordinate(container, 0)
			let firstShownRowHeight = this.screen.getChildElementHeight(container, 0)
			let i = 1
			while (i < this.screen.getChildElementsCount(container)) {
				const itemTopCoordinate = this.screen.getChildElementTopCoordinate(container, i)
				const itemHeight = this.screen.getChildElementHeight(container, i)
				// If next row is detected.
				if (itemTopCoordinate !== firstShownRowTopCoordinate) {
					// Measure inter-row spacing.
					return itemTopCoordinate - (firstShownRowTopCoordinate + firstShownRowHeight)
				}
				// A row height is the maximum of its item heights.
				firstShownRowHeight = Math.max(firstShownRowHeight, itemHeight)
				i++
			}
		}
	}

	measureNonPreviouslyMeasuredItemHeights() {
		const {
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()
		if (firstShownItemIndex !== undefined) {
			// log('~ Measure non-previously-measured items\' heights ~')
			const nonPreviouslyMeasuredItemIndexes = this.itemHeights.measureNonPreviouslyMeasuredItemHeights(
				firstShownItemIndex,
				lastShownItemIndex
			)
			// if (isDebug()) {
			// 	if (nonPreviouslyMeasuredItemIndexes.length === 0) {
			// 		log('All shown items have been previously measured')
			// 	} else {
			// 		// const { itemHeights } = this.getState()
			// 		// for (const i of nonPreviouslyMeasuredItemIndexes) {
			// 		// 	log('Item', i, 'hasn\'t been measured before. Height:', itemHeights[i])
			// 		// }
			// 	}
			// 	// log('Item heights', this.getState().itemHeights.slice())
			// }
		}
	}

	remeasureItemHeight(i) {
		const { firstShownItemIndex } = this.getState()
		return this.itemHeights.remeasureItemHeight(i, firstShownItemIndex)
	}

	onItemStateChange(i, itemState) {
		if (isDebug()) {
			log('~ Item state changed ~')
			log('Item', i)
			log('Previous state' + '\n' + JSON.stringify(this.getState().itemStates[i], null, 2))
			log('New state' + '\n' + JSON.stringify(itemState, null, 2))
		}
		this.getState().itemStates[i] = itemState
	}

	onItemHeightChange(i) {
		log('~ Re-measure item height ~')
		log('Item', i)
		const { itemHeights } = this.getState()
		const previousHeight = itemHeights[i]
		if (previousHeight === undefined) {
			return reportError(`"onItemHeightChange()" has been called for item ${i}, but that item hasn't been rendered before.`)
		}
		const newHeight = this.remeasureItemHeight(i)
		// Check if the item is still rendered.
		if (newHeight === undefined) {
			// There could be valid cases when an item is no longer rendered
			// by the time `.onItemHeightChange(i)` gets called.
			// For example, suppose there's a list of several items on a page,
			// and those items are in "minimized" state (having height 100px).
			// Then, a user clicks an "Expand all items" button, and all items
			// in the list are expanded (expanded item height is gonna be 700px).
			// `VirtualScroller` demands that `.onItemHeightChange(i)` is called
			// in such cases, and the developer has properly added the code to do that.
			// So, if there were 10 "minimized" items visible on a page, then there
			// will be 10 individual `.onItemHeightChange(i)` calls. No issues so far.
			// But, as the first `.onItemHeightChange(i)` call executes, it immediately
			// ("synchronously") triggers a re-layout, and that re-layout finds out
			// that now, because the first item is big, it occupies most of the screen
			// space, and only the first 3 items are visible on screen instead of 10,
			// and so it leaves the first 3 items mounted and unmounts the rest 7.
			// Then, after `VirtualScroller` has rerendered, the code returns to
			// where it was executing, and calls `.onItemHeightChange(i)` for the
			// second item. It also triggers an immediate re-layout that finds out
			// that only the first 2 items are visible on screen, and it unmounts
			// the third one too. After that, it calls `.onItemHeightChange(i)`
			// for the third item, but that item is no longer rendered, so its height
			// can't be measured, and the same's for all the rest of the original 10 items.
			// So, even though the developer has written their code properly, there're
			// still situations when the item could be no longer rendered by the time
			// `.onItemHeightChange(i)` gets called.
			return log('The item is no longer rendered. This is not necessarily a bug, and could happen, for example, when there\'re several `onItemHeightChange(i)` calls issued at the same time.')
		}
		log('Previous height', previousHeight)
		log('New height', newHeight)
		if (previousHeight !== newHeight) {
			log('~ Item height has changed ~')
			// log('Item', i)
			this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.ITEM_HEIGHT_CHANGED })
		}
	}

	/**
	 * Returns coordinates of item with index `i` relative to the document.
	 * `top` is the top offset of the item relative to the start of the document.
	 * `bottom` is the top offset of the item's bottom edge relative to the start of the document.
	 * `height` is the item's height.
	 * @param  {number} i
	 * @return {object} coordinates — An object of shape `{ top, bottom, height }`.
	 */
	getItemCoordinates(i) {
		const { itemHeights } = this.getState()
		const columnsCount = this.getColumnsCount()
		let rowTop = this.getTopOffset()
		const itemRowIndex = Math.floor(i / columnsCount)
		let rowIndex = 0
		while (rowIndex < itemRowIndex) {
			let rowHeight = 0
			let columnIndex = 0
			while (columnIndex < columnsCount) {
				rowHeight = Math.max(rowHeight, itemHeights[rowIndex * columnsCount + columnIndex])
				columnIndex++
			}
			rowTop += rowHeight
			rowTop += this.getVerticalSpacing()
			rowIndex++
		}
		return {
			top: rowTop,
			bottom: rowTop + itemHeights[i],
			height: itemHeights[i]
		}
	}

	_getVisibleItemIndexes(visibleAreaTop, visibleAreaBottom, listTopOffset) {
		let firstShownItemIndex
		let lastShownItemIndex
		let previousRowsHeight = 0
		const itemsCount = this.getItemsCount()
		const columnsCount = this.getColumnsCount()
		const rowsCount = Math.ceil(itemsCount / columnsCount)
		let rowIndex = 0
		while (rowIndex < rowsCount) {
			const hasMoreRows = itemsCount > (rowIndex + 1) * columnsCount
			const verticalSpaceAfterCurrentRow = hasMoreRows ? this.getVerticalSpacing() : 0
			let currentRowHeight = 0
			let columnIndex = 0
			let i
			while (columnIndex < columnsCount
				&& (i = rowIndex * columnsCount + columnIndex) < itemsCount) {
				const itemHeight = this.getState().itemHeights[i]
				// If an item that hasn't been shown (and measured) yet is encountered
				// then show such item and then retry after it has been measured.
				if (itemHeight === undefined) {
					log(`Item index ${i} lies within the visible area or its "margins", but its height hasn't been measured yet. Mark the item as "shown", render the list, measure the item's height and redo the layout.`)
					if (firstShownItemIndex === undefined) {
						firstShownItemIndex = rowIndex * columnsCount
					}
					const heightLeft = visibleAreaBottom - (listTopOffset + previousRowsHeight)
					lastShownItemIndex = Math.min(
						(rowIndex + this.getEstimatedRowsCount(heightLeft)) * columnsCount - 1,
						// Guard against index overflow.
						itemsCount - 1
					)
					return {
						firstNonMeasuredItemIndex: i,
						firstShownItemIndex,
						lastShownItemIndex
					}
				}
				currentRowHeight = Math.max(currentRowHeight, itemHeight)
				// If this is the first item visible
				// then start showing items from this row.
				if (firstShownItemIndex === undefined) {
					if (listTopOffset + previousRowsHeight + currentRowHeight > visibleAreaTop) {
						log('First shown row index', rowIndex)
						firstShownItemIndex = rowIndex * columnsCount
					}
				}
				// If this item is the last one visible in the viewport then exit.
				if (listTopOffset + previousRowsHeight + currentRowHeight + verticalSpaceAfterCurrentRow > visibleAreaBottom) {
					log('Last shown row index', rowIndex)
					// The list height is estimated until all items have been seen,
					// so it's possible that even when the list DOM element happens
					// to be in the viewport in reality the list isn't visible
					// in which case `firstShownItemIndex` will be `undefined`.
					if (firstShownItemIndex !== undefined) {
						lastShownItemIndex = Math.min(
							// The index of the last item in the current row.
							(rowIndex + 1) * columnsCount - 1,
							// Guards against index overflow.
							itemsCount - 1
						)
					}
					return {
						firstShownItemIndex,
						lastShownItemIndex
					}
				}
				columnIndex++
			}
			previousRowsHeight += currentRowHeight
			// If there're more rows below the current row, then add vertical spacing.
			previousRowsHeight += verticalSpaceAfterCurrentRow
			rowIndex++
		}
		// If there're no more items then the last item is the last one to show.
		if (firstShownItemIndex !== undefined && lastShownItemIndex === undefined) {
			lastShownItemIndex = itemsCount - 1
			log('Last item index (is fully visible)', lastShownItemIndex)
		}
		return {
			firstShownItemIndex,
			lastShownItemIndex
		}
	}

	// Finds the items which are displayed in the viewport.
	getVisibleItemIndexes(visibleAreaTop, visibleAreaBottom, listTopOffset) {
		let {
			firstNonMeasuredItemIndex,
			firstShownItemIndex,
			lastShownItemIndex
		} = this._getVisibleItemIndexes(
			visibleAreaTop,
			visibleAreaBottom,
			listTopOffset
		)
		let redoLayoutAfterMeasuringItemHeights = firstNonMeasuredItemIndex !== undefined
		// If scroll position is scheduled to be restored after render,
		// then the "anchor" item must be rendered, and all of the prepended
		// items before it, all in a single pass. This way, all of the
		// prepended items' heights could be measured right after the render
		// has finished, and the scroll position can then be immediately restored.
		if (this.restoreScrollAfterRenderValues) {
			if (lastShownItemIndex < this.restoreScrollAfterRenderValues.index) {
				lastShownItemIndex = this.restoreScrollAfterRenderValues.index
			}
			// `firstShownItemIndex` is always `0` when prepending items.
			// And `lastShownItemIndex` always covers all prepended items in this case.
			// None of the prepended items have been rendered before,
			// so their heights are unknown. The code at the start of this function
			// did therefore set `redoLayoutAfterMeasuringItemHeights` to `true`
			// in order to render just the first prepended item in order to
			// measure it, and only then make a decision on how many other
			// prepended items to render. But since we've instructed the code
			// to show all of the prepended items at once, there's no need to
			// "redo layout after render". Additionally, if layout was re-done
			// after render, then there would be a short interval of visual
			// "jitter" due to the scroll position not being restored because it'd
			// wait for the second layout to finish instead of being restored
			// right after the first one.
			redoLayoutAfterMeasuringItemHeights = false
		}
		// If some items will be rendered in order to measure their height,
		// and it's not a `preserveScrollPositionOnPrependItems` case,
		// then limit the amount of such items being measured in a single pass.
		if (redoLayoutAfterMeasuringItemHeights && this.measureItemsBatchSize) {
			const columnsCount = this.getColumnsCount()
			const maxAllowedLastShownItemIndex = firstNonMeasuredItemIndex + this.measureItemsBatchSize - 1
			lastShownItemIndex = Math.min(
				// Also guards against index overflow.
				lastShownItemIndex,
				// The index of the last item in the row.
				Math.ceil(maxAllowedLastShownItemIndex / columnsCount) * columnsCount - 1
			)
		}
		return {
			firstShownItemIndex,
			lastShownItemIndex,
			redoLayoutAfterMeasuringItemHeights
		}
	}

	getOffscreenListShownItemIndexes() {
		return {
			firstShownItemIndex: 0,
			lastShownItemIndex: 0,
			redoLayoutAfterMeasuringItemHeights: this.getState().itemHeights[0] === undefined
		}
	}

	getItemIndexes(visibleAreaTop, visibleAreaBottom, listTopOffset, listHeight) {
		const isVisible = listTopOffset + listHeight > visibleAreaTop && listTopOffset < visibleAreaBottom
		if (!isVisible) {
			log('The entire list is off-screen. No items are visible.')
			return
		}
		// Find the items which are displayed in the viewport.
		const indexes = this.getVisibleItemIndexes(visibleAreaTop, visibleAreaBottom, listTopOffset)
		// The list height is estimated until all items have been seen,
		// so it's possible that even when the list DOM element happens
		// to be in the viewport, in reality the list isn't visible
		// in which case `firstShownItemIndex` will be `undefined`.
		if (indexes.firstShownItemIndex === undefined) {
			log('The entire list is off-screen. No items are visible.')
			return
		}
		return indexes
	}

	/**
	 * Measures "before" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @param  {number[]} itemHeights — All known item heights.
	 * @return {number}
	 */
	getBeforeItemsHeight(firstShownItemIndex, lastShownItemIndex, itemHeights) {
		const columnsCount = this.getColumnsCount()
		const firstShownRowIndex = Math.floor(firstShownItemIndex / columnsCount)
		let beforeItemsHeight = 0
		// Add all "before" items height.
		let rowIndex = 0
		while (rowIndex < firstShownRowIndex) {
			let rowHeight = 0
			let columnIndex = 0
			while (columnIndex < columnsCount) {
				rowHeight = Math.max(
					rowHeight,
					itemHeights[rowIndex * columnsCount + columnIndex]
						|| this.itemHeights.getAverage()
				)
				columnIndex++
			}
			beforeItemsHeight += rowHeight
			beforeItemsHeight += this.getVerticalSpacing()
			rowIndex++
		}
		return beforeItemsHeight
	}

	/**
	 * Measures "after" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @param  {number[]} itemHeights — All known item heights.
	 * @return {number}
	 */
	getAfterItemsHeight(firstShownItemIndex, lastShownItemIndex, itemHeights) {
		const itemsCount = this.getItemsCount()
		const columnsCount = this.getColumnsCount()
		const rowsCount = Math.ceil(itemsCount / columnsCount)
		const lastShownRowIndex = Math.floor(lastShownItemIndex / columnsCount)
		let afterItemsHeight = 0
		let rowIndex = lastShownRowIndex + 1
		while (rowIndex < rowsCount) {
			let rowHeight = 0
			let columnIndex = 0
			let i
			while (columnIndex < columnsCount
				&& (i = rowIndex * columnsCount + columnIndex) < itemsCount) {
				rowHeight = Math.max(
					rowHeight,
					itemHeights[i] || this.itemHeights.getAverage()
				)
				columnIndex++
			}
			// Add all "after" items height.
			afterItemsHeight += this.getVerticalSpacing()
			afterItemsHeight += rowHeight
			rowIndex++
		}
		return afterItemsHeight
	}

	/**
	 * Validates the heights of items to be hidden on next render.
	 * For example, a user could click a "Show more" button,
	 * or an "Expand YouTube video" button, which would result
	 * in the actual height of the list item being different
	 * from what has been initially measured in `this.itemHeights[i]`,
	 * if the developer didn't call `.onItemStateChange()` and `.onItemHeightChange(i)`.
	 */
	validateWillBeHiddenItemHeightsAndState(firstShownItemIndex, lastShownItemIndex) {
		let i = this.getState().firstShownItemIndex
		while (i <= this.getState().lastShownItemIndex) {
			if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
				// The item's still visible.
			} else {
				// The item will be hidden. Re-measure its height.
				// The rationale is that there could be a situation when an item's
				// height has changed, and the developer has properly added an
				// `.onItemHeightChange(i)` call to notify `VirtualScroller`
				// about that change, but at the same time that wouldn't work.
				// For example, suppose there's a list of several items on a page,
				// and those items are in "minimized" state (having height 100px).
				// Then, a user clicks an "Expand all items" button, and all items
				// in the list are expanded (expanded item height is gonna be 700px).
				// `VirtualScroller` demands that `.onItemHeightChange(i)` is called
				// in such cases, and the developer has properly added the code to do that.
				// So, if there were 10 "minimized" items visible on a page, then there
				// will be 10 individual `.onItemHeightChange(i)` calls. No issues so far.
				// But, as the first `.onItemHeightChange(i)` call executes, it immediately
				// ("synchronously") triggers a re-layout, and that re-layout finds out
				// that now, because the first item is big, it occupies most of the screen
				// space, and only the first 3 items are visible on screen instead of 10,
				// and so it leaves the first 3 items mounted and unmounts the rest 7.
				// Then, after `VirtualScroller` has rerendered, the code returns to
				// where it was executing, and calls `.onItemHeightChange(i)` for the
				// second item. It also triggers an immediate re-layout that finds out
				// that only the first 2 items are visible on screen, and it unmounts
				// the third one too. After that, it calls `.onItemHeightChange(i)`
				// for the third item, but that item is no longer rendered, so its height
				// can't be measured, and the same's for all the rest of the original 10 items.
				// So, even though the developer has written their code properly, the
				// `VirtualScroller` still ends up having incorrect `itemHeights[]`:
				// `[700px, 700px, 100px, 100px, 100px, 100px, 100px, 100px, 100px, 100px]`
				// while it should have been `700px` for all of them.
				// To work around such issues, every item's height is re-measured before it
				// gets hidden.
				const previouslyMeasuredItemHeight = this.getState().itemHeights[i]
				const actualItemHeight = this.remeasureItemHeight(i)
				if (actualItemHeight !== previouslyMeasuredItemHeight) {
					log('Item', i, 'will be unmounted at next render. Its height has changed from', previouslyMeasuredItemHeight, 'to', actualItemHeight, 'while it was shown. This is not necessarily a bug, and could happen, for example, when there\'re several `onItemHeightChange(i)` calls issued at the same time.')
				}
			}
			i++
		}
	}

	// `VirtualScroller` calls `getShownItemIndexes()` on mount,
	// but if the page styles are applied after `VirtualScroller` mounts
	// (for example, if styles are applied via javascript, like Webpack does)
	// then the list might not render correctly and will only show the first item.
	// The reason for that would be that calling `.getTopOffset()` on mount
	// returns "incorrect" `top` position because the styles haven't been applied yet.
	// For example, consider a page:
	// <div class="page">
	//   <nav class="sidebar">...</nav>
	//   <main>...</main>
	// </div>
	// The sidebar is styled as `position: fixed`, but until
	// the page styles have been applied it's gonna be a regular `<div/>`
	// meaning that `<main/>` will be rendered below the sidebar
	// and will appear offscreen and so it will only render the first item.
	// Then, the page styles are loaded and applied and the sidebar
	// is now `position: fixed` so `<main/>` is now rendered at the top of the page
	// but `VirtualScroller`'s `.render()` has already been called
	// and it won't re-render until the user scrolls or the window is resized.
	// This type of a bug doesn't occur in production, but it can appear
	// in development mode when using Webpack. The workaround `VirtualScroller`
	// implements for such cases is calling `.getTopOffset()` on the
	// list container DOM element periodically (every second) to check if the
	// `top` coordinate has changed as a result of CSS being applied:
	// if it has then it recalculates the shown item indexes.
	watchContainerElementCoordinates() {
		const startedAt = Date.now()
		const check = () => {
			// If `VirtualScroller` has been unmounted
			// while `setTimeout()` was waiting, then exit.
			if (!this.isRendered) {
				return
			}
			// Skip comparing `top` coordinate of the list
			// when this function is called the first time.
			if (this.topOffset !== undefined) {
				// Calling `this.getTopOffset()` on an element is about
				// 0.003 milliseconds on a modern desktop CPU,
				// so I guess it's fine calling it twice a second.
				const topOffset = this.getTopOffset()
				if (topOffset !== this.topOffset) {
					this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.TOP_OFFSET_CHANGED })
				}
			}
			// Compare `top` coordinate of the list twice a second
			// to find out if it has changed as a result of loading CSS styles.
			// The total duration of 3 seconds would be enough for any styles to load, I guess.
			// There could be other cases changing the `top` coordinate
			// of the list (like collapsing an "accordeon" panel above the list
			// without scrolling the page), but those cases should be handled
			// by manually calling `.updateLayout()` instance method on `VirtualScroller` instance.
			if (Date.now() - startedAt < WATCH_CONTAINER_ELEMENT_TOP_COORDINATE_MAX_DURATION) {
				this.watchContainerElementCoordinatesTimer = setTimeout(check, WATCH_CONTAINER_ELEMENT_TOP_COORDINATE_INTERVAL)
			}
		}
		// Run the cycle.
		check()
	}

	/**
	 * Finds the items that are displayed in the viewport.
	 * @return {object} `{ firstShownItemIndex: number, lastShownItemIndex: number, redoLayoutAfterMeasuringItemHeights: boolean }`
	 */
	getShownItemIndexes() {
		if (this.bypass) {
			return {
				firstShownItemIndex: 0,
				lastShownItemIndex: this.getItemsCount() - 1
			}
			// This code emulates batch loading in bypass mode.
			// const { firstShownItemIndex } = this.getState()
			// let { lastShownItemIndex } = this.getState()
			// lastShownItemIndex = Math.min(
			// 	lastShownItemIndex + this.bypassBatchSize,
			// 	this.getItemsCount() - 1
			// )
			// return {
			// 	firstShownItemIndex,
			// 	lastShownItemIndex,
			// 	// Redo layout until all items are rendered.
			// 	redoLayoutAfterMeasuringItemHeights: lastShownItemIndex < this.getItemsCount() - 1
			// }
		}
		// // A minor optimization. Just because I can.
		// let topOffset
		// if (this.topOffsetCached !== undefined) {
		// 	topOffset = this.topOffsetCached
		// 	this.topOffsetCached = undefined
		// } else {
		// 	topOffset = this.getTopOffset()
		// }
		const topOffset = this.getTopOffset()
		// `this.topOffset` is not used for any "caching",
		// it's only used in `this.watchContainerElementCoordinates()` method.
		if (this.topOffset === undefined) {
			// See the comments for `watchContainerElementCoordinates()` method
			// for the rationale on why it's here.
			this.watchContainerElementCoordinates()
		}
		this.topOffset = topOffset
		const { top: visibleAreaTop, bottom: visibleAreaBottom } = this.getVisibleAreaBounds()
		// Set screen top and bottom for current layout.
		this.latestLayoutVisibleAreaTopAfterIncludingMargin = visibleAreaTop - this.getMargin()
		this.latestLayoutVisibleAreaBottomAfterIncludingMargin = visibleAreaBottom + this.getMargin()
		// For scrollable containers, this function could not only check
		// the scrollable container visibility here, but also
		// adjust `visibleAreaTop` and `visibleAreaBottom`
		// because some parts of the scrollable container
		// could be off the screen and therefore not actually visible.
		// That would also involve somehow fixing the "should rerender on scroll"
		// function, because currently it only checks the scrollable container's
		// `this.getScrollY()` and compares it to the latest `visibleAreaTop` and `visibleAreaBottom`,
		// so if those "actual visibility" adjustments were applied, they would have to
		// be somehow accounted for in that "should rerender on scroll" function.
		// Overall, I suppose that such "actual visibility" feature would be
		// a very minor optimization and not something I'd deal with.
		// Find the items that are displayed in the viewport.
		return this.getItemIndexes(
			visibleAreaTop - this.getMargin(),
			visibleAreaBottom + this.getMargin(),
			topOffset,
			this.getHeight()
		) || this.getOffscreenListShownItemIndexes()
	}

	/**
	 * Updates the "from" and "to" shown item indexes.
	 * If the list is visible and some of the items being shown are new
	 * and are required to be measured first, then
	 * `redoLayoutAfterMeasuringItemHeights` is `true`.
	 * If the list is visible and all items being shown have been encountered
	 * (and measured) before, then `redoLayoutAfterMeasuringItemHeights` is `false`.
	 */
	updateShownItemIndexes = () => {
		log('~ Layout results ' + (this.bypass ? '(bypass) ' : '') + '~')
		// Find the items which are displayed in the viewport.
		const {
			firstShownItemIndex,
			lastShownItemIndex,
			redoLayoutAfterMeasuringItemHeights
		} = this.getShownItemIndexes()
		const { itemHeights } = this.getState()
		// Measure "before" items height.
		const beforeItemsHeight = this.getBeforeItemsHeight(
			firstShownItemIndex,
			lastShownItemIndex,
			itemHeights
		)
		// Measure "after" items height.
		const afterItemsHeight = this.getAfterItemsHeight(
			firstShownItemIndex,
			lastShownItemIndex,
			itemHeights
		)
		// Debugging.
		if (this._getColumnsCount) {
			log('Columns count', this.getColumnsCount())
		}
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		log('Before items height', beforeItemsHeight)
		log('After items height (actual or estimated)', afterItemsHeight)
		log('Average item height (calculated on previous render)', this.itemHeights.getAverage())
		if (isDebug()) {
			log('Item heights', this.getState().itemHeights.slice())
			log('Item states', this.getState().itemStates.slice())
		}
		if (redoLayoutAfterMeasuringItemHeights) {
			// `this.redoLayoutReason` will be detected in `didUpdateState()`.
			// `didUpdateState()` is triggered by `this.setState()` below.
			this.redoLayoutReason = LAYOUT_REASON.ITEM_HEIGHT_NOT_MEASURED
		}
		// Validate the heights of items to be hidden on next render.
		// For example, a user could click a "Show more" button,
		// or an "Expand YouTube video" button, which would result
		// in the actual height of the list item being different
		// from what has been initially measured in `this.itemHeights[i]`,
		// if the developer didn't call `.onItemStateChange()` and `.onItemHeightChange(i)`.
		this.validateWillBeHiddenItemHeightsAndState(firstShownItemIndex, lastShownItemIndex)
		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			this.getState().items,
			this.getState().itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)
		// Render.
		this.setState({
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			// // Average item height is stored in state to differentiate between
			// // the initial state and "anything has been measured already" state.
			// averageItemHeight: this.itemHeights.getAverage()
		})
	}

	updateShownItemIndexesRecursive = () => {
		this.layoutInProgress = true
		this.updateShownItemIndexes()
	}

	/**
	 * `<ReactVirtualScroller/>` calls this method.
	 * @param  {any[]} previousItems
	 * @param  {any[]} nextItems
	 * @param  {number} prependedItemsCount
	 */
	captureScroll(previousItems, nextItems, prependedItemsCount) {
		// If there were no items in the list
		// then there's no point in restoring scroll position.
		if (previousItems.length === 0) {
			return
		}
		// If no items were prepended then no need to restore scroll position.
		if (prependedItemsCount === 0) {
			return
		}
		// `firstShownItemIndex` can't be `undefined` because `items` aren't empty.
		const { firstShownItemIndex } = this.getState()
		const container = this.getContainerElement()
		let firstItemTopPosition = this.screen.getChildElementTopCoordinate(container, 0)
		// The first item is usually shown when the user clicks
		// "Show previous items" button. If it isn't shown though,
		// can also calculate the first item's top position using
		// the values from `itemHeights` and `verticalSpacing`.
		if (firstShownItemIndex > 0) {
			const { itemHeights } = this.getState()
			let i = firstShownItemIndex - 1
			while (i >= 0) {
				firstItemTopPosition += itemHeights[i] + this.getVerticalSpacing()
				i--
			}
		}
		// If the scroll position has already been captured for restoration,
		// then don't capture it the second time.
		// Capturing scroll position could happen when using `<ReactVirtualScroller/>`
		// because it calls `.captureScroll()` inside `ReactVirtualScroller.render()`
		// which is followed by `<VirtualScroller/>`'s `.componentDidUpdate()`
		// that also calls `.captureScroll()` with the same arguments,
		// so that second call to `.captureScroll()` is ignored.
		// Calling `.captureScroll()` inside `ReactVirtualScroller.render()`
		// is done to prevent scroll Y position from jumping
		// when showing the first page of the "Previous items".
		// See the long section of comments in `ReactVirtualScroller.render()`
		// method for more info on why is `.captureScroll()` called there.
		if (this.restoreScrollAfterRenderValues &&
			this.restoreScrollAfterRenderValues.previousItems === previousItems &&
			this.restoreScrollAfterRenderValues.nextItems === nextItems) {
			return
		}
		this.restoreScrollAfterRenderValues = {
			previousItems,
			nextItems,
			index: prependedItemsCount,
			visibleAreaTop: firstItemTopPosition
		}
	}

	restoreScrollAfterRender() {
		log('~ Restore Scroll Position ~')
		const { index, visibleAreaTop } = this.restoreScrollAfterRenderValues
		this.restoreScrollAfterRenderValues = undefined
		// `firstShownItemIndex` is supposed to be `0` here.
		const newVisibleAreaTop = this.screen.getChildElementTopCoordinate(this.getContainerElement(), index)
		const scrollByY = newVisibleAreaTop - visibleAreaTop
		if (scrollByY === 0) {
			log('Scroll position hasn\'t changed')
		} else {
			log('Scroll down by', scrollByY)
			this.scrollTo(0, this.getScrollY() + scrollByY)
		}
	}

	// This turned out to not work so well:
	// scrolling becomes "janky" with this feature turned on
	// when there're items whose height did change while they were hidden.
	// adjustScrollPositionIfNeeded(i, prevItemHeight) {
	// 	const itemHeight = this.getState().itemHeights[i]
	// 	if (itemHeight !== prevItemHeight) {
	// 		const { bottom } = this.getItemCoordinates(i)
	// 		const scrollY = this.getScrollY()
	// 		const horizonLine = scrollY + this.scrollableContainer.getHeight() / 2
	// 		if (bottom < horizonLine) {
	// 			this.scrollTo(0, scrollY + (itemHeight - prevItemHeight))
	// 		}
	// 	}
	// }

	onUpdateShownItemIndexes = ({ reason }) => {
		// Not implementing the "delayed" layout feature for now.
		// if (this.delayLayout({ reason })) {
		// 	return
		// }
		//
		// If there're no items then there's no need to re-layout anything.
		if (this.getItemsCount() === 0) {
			return
		}
		// Prefer not re-rendering the list as the user's scrolling (if possible).
		// Instead, prefer delaying such re-renders until the user stops scrolling.
		// Presumably, this results in better scrolling performance.
		//
		// If the current re-layout request was triggered by a scroll event,
		// then `this.onUserStopsScrollingTimer` will be refreshed (re-created).
		// In any other case, a re-layout is performed anyway,
		// so this timer should be cancelled in any case.
		if (this.onUserStopsScrollingTimer) {
			clearTimeout(this.onUserStopsScrollingTimer)
			this.onUserStopsScrollingTimer = undefined
		}
		// On scroll.
		if (reason === LAYOUT_REASON.SCROLL) {
			// See whether rendering "new" previous/next items is required right now
			// or it can wait until the user stops scrolling.
			// Presumably, deferring a re-layout until the user stops scrolling
			// would result in better perceived performance.
			// const top = this.getTopOffset()
			// const height = this.scrollableContainer.getHeight()
			// const bottom = top + height
			// const { top: visibleAreaTop, bottom: visibleAreaBottom } = this.getVisibleAreaBounds()
			// const renderedItemsTop = top + this.getState().beforeItemsHeight
			// const renderedItemsBottom = top + height - this.getState().afterItemsHeight
			// const forceUpdate = (visibleAreaTop < renderedItemsTop && this.getState().firstShownItemIndex > 0) ||
			// 	(visibleAreaBottom > renderedItemsBottom && this.getState().lastShownItemIndex < this.getItemsCount() - 1)
			const forceUpdate = (
				// If the items have been rendered at least one
				this.latestLayoutVisibleAreaTopAfterIncludingMargin !== undefined &&
					// If the user has scrolled up past the extra "margin"
					(this.getScrollY() < this.latestLayoutVisibleAreaTopAfterIncludingMargin) &&
					// and if there're any previous non-rendered items to render.
					(this.getState().firstShownItemIndex > 0)
			) || (
				// If the items have been rendered at least one
				this.latestLayoutVisibleAreaBottomAfterIncludingMargin !== undefined &&
					// If the user has scrolled down past the extra "margin"
					(this.getScrollY() + this.scrollableContainer.getHeight() > this.latestLayoutVisibleAreaBottomAfterIncludingMargin) &&
					// and if there're any next non-rendered items to render.
					(this.getState().lastShownItemIndex < this.getItemsCount() - 1)
			)
			if (forceUpdate) {
				log('The user has scrolled far enough: force re-render')
			} else {
				log('The user hasn\'t scrolled too much: delay re-render')
			}
			if (!forceUpdate) {
				// If a re-layout is already scheduled,
				// don't schedule another one.
				if (this.layoutTimer) {
					return
				}
				this.onUserStopsScrollingTimer = setTimeout(
					() => {
						if (this.isRendered) {
							// Update shown item indexes.
							this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.STOPPED_SCROLLING })
						}
					},
					// "scroll" events are usually dispatched every 16 milliseconds
					// for 60fps refresh rate, so waiting for 100 milliseconds feels
					// reasonable: that would be about 6 frames of inactivity period,
					// which could mean that either the user has stopped scrolling
					// (for a moment) or the browser is lagging and stuttering
					// (skipping frames due to high load).
					// If the user continues scrolling then this timeout is constantly
					// refreshed (cancelled and then re-created).
					WAIT_FOR_USER_TO_STOP_SCROLLING_TIMEOUT
				)
				return
			}
		}
		// Cancel an already scheduled re-layout,
		// because a new layout is about to be performed.
		if (this.layoutTimer) {
			clearTimeout(this.layoutTimer)
			this.layoutTimer = undefined
		}
		// // A minor optimization. Just because I can.
		// this.listCoordinatesCached = listCoordinates
		// Perform a re-layout.
		log(`~ Calculate Layout (on ${reason}) ~`)
		this.updateShownItemIndexesRecursive()
	}

	/**
	 * @deprecated
	 * `.updateItems()` has been renamed to `.setItems()`.
	 */
	updateItems(newItems, options) {
		return this.setItems(newItems, options)
	}

	/**
	 * Updates `items`. For example, can prepend or append new items to the list.
	 * @param  {any[]} newItems
	 * @param {boolean} [options.preserveScrollPositionOnPrependItems] — Set to `true` to enable "restore scroll position after prepending items" feature (could be useful when implementing "Show previous items" button).
	 */
	setItems(newItems, options = {}) {
		// * @param  {object} [newCustomState] — If `customState` was passed to `getInitialState()`, this `newCustomState` updates it.
		const {
			items: previousItems
		} = this.getState()
		let {
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			itemStates,
			itemHeights
		} = this.getState()
		log('~ Update items ~')
		const itemsDiff = this.getItemsDiff(previousItems, newItems)
		// If it's an "incremental" update.
		if (itemsDiff) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff
			if (prependedItemsCount > 0) {
				log('Prepend', prependedItemsCount, 'items')
				itemHeights = new Array(prependedItemsCount).concat(itemHeights)
				if (itemStates) {
					itemStates = new Array(prependedItemsCount).concat(itemStates)
				}
			}
			if (appendedItemsCount > 0) {
				log('Append', appendedItemsCount, 'items')
				itemHeights = itemHeights.concat(new Array(appendedItemsCount))
				if (itemStates) {
					itemStates = itemStates.concat(new Array(appendedItemsCount))
				}
			}
			firstShownItemIndex += prependedItemsCount
			lastShownItemIndex += prependedItemsCount
			const verticalSpacing = this.getVerticalSpacing()
			const columnsCount = this.getColumnsCount()
			if (prependedItemsCount % columnsCount === 0) {
				// If the layout stays the same, then simply increase
				// the top and bottom margins proportionally to the amount
				// of the items added.
				const prependedRowsCount = prependedItemsCount / columnsCount
				const appendedRowsCount = Math.ceil(appendedItemsCount / columnsCount)
				beforeItemsHeight += prependedRowsCount * (this.itemHeights.getAverage() + this.getVerticalSpacing())
				afterItemsHeight += appendedRowsCount * (this.getVerticalSpacing() + this.itemHeights.getAverage())
			} else {
				// Rows will be rebalanced as a result of prepending the items,
				// and the row heights can change as a result, so recalculate
				// `beforeItemsHeight` and `afterItemsHeight` from scratch.
				// `this.itemHeights[]` and `firstShownItemIndex`/`lastShownItemIndex`
				// have already been updated at this point.
				beforeItemsHeight = this.getBeforeItemsHeight(
					firstShownItemIndex,
					lastShownItemIndex,
					itemHeights
				)
				afterItemsHeight = this.getAfterItemsHeight(
					firstShownItemIndex,
					lastShownItemIndex,
					itemHeights
				)
			}
			if (prependedItemsCount > 0) {
				// `preserveScrollPosition` option name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				if (options.preserveScrollPositionOnPrependItems || options.preserveScrollPosition) {
					firstShownItemIndex = 0
					beforeItemsHeight = 0
					this.captureScroll(
						previousItems,
						newItems,
						prependedItemsCount
					)
				}
			}
		} else {
			log('Items have changed, and it\'s not a simple append and/or prepend: rerender the entire list from scratch.')
			log('Previous items', previousItems)
			log('New items', newItems)
			itemHeights = new Array(newItems.length)
			itemStates = new Array(newItems.length)
			if (newItems.length === 0) {
				firstShownItemIndex = undefined
				lastShownItemIndex = undefined
			} else {
				firstShownItemIndex = 0
				lastShownItemIndex = this.getLastShownItemIndex(
					firstShownItemIndex,
					newItems.length,
					this.getColumnsCount()
				)
			}
			beforeItemsHeight = 0
			afterItemsHeight = 0
		}
		// let customState
		// `newCustomState` argument is not currently being used.
		// if (newCustomState) {
		// 	if (typeof newCustomState === 'function') {
		// 		customState = newCustomState(this.getState(), {
		// 			prependedCount: isIncrementalUpdate ? undefined : prependedItemsCount,
		// 			appendedCount: isIncrementalUpdate ? undefined : appendedItemsCount
		// 		})
		// 	} else {
		// 		customState = newCustomState
		// 	}
		// }
		log('~ Update state ~')
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		log('Before items height', beforeItemsHeight)
		log('After items height (actual or estimated)', afterItemsHeight)
		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			newItems,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)
		// Render.
		this.setState({
			// ...customState,
			items: newItems,
			itemStates,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		})
	}

	getItemsDiff(previousItems, newItems) {
		return getItemsDiff(previousItems, newItems, this.isItemEqual)
	}

	// Turns out this optimization won't work
	// because sometimes item height is an average approximation
	// and the other times it's the real item height
	// and sometimes it can change while item's not visible.
	// /**
	//  * Measures new "before" items height.
	//  * @param  {number} firstShownItemIndex — New first shown item index.
	//  * @param  {number} lastShownItemIndex — New last shown item index.
	//  * @return {number}
	//  */
	// getBeforeItemsHeightOptimized(firstShownItemIndex, lastShownItemIndex) {
	// 	// If the previous and new shown item indexes intersect
	// 	// then the new "before" items height may be calculated
	// 	// based on the previous "before" items height.
	// 	if (this.getState().averageItemHeight !== undefined &&
	// 		this.doPrevAndNextItemIndexesIntersect(firstShownItemIndex, lastShownItemIndex)) {
	// 		let beforeItemsHeight = this.getState().beforeItemsHeight
	// 		// Add all "before" will-be-hidden items' height.
	// 		let i = this.getState().firstShownItemIndex
	// 		while (i <= this.getState().lastShownItemIndex && i < firstShownItemIndex) {
	// 			beforeItemsHeight += (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			beforeItemsHeight += this.getVerticalSpacing()
	// 			i++
	// 		}
	// 		// Subtract all "before" will-be-shown items' height.
	// 		i = firstShownItemIndex
	// 		while (i <= lastShownItemIndex && i < this.getState().firstShownItemIndex) {
	// 			beforeItemsHeight -= (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			beforeItemsHeight -= this.getVerticalSpacing()
	// 			i++
	// 		}
	// 		return beforeItemsHeight
	// 	}
	// 	// If the previous and new shown item indexes don't intersect
	// 	// then re-calculate "before" items height.
	// 	else {
	// 		return this.getBeforeItemsHeight(firstShownItemIndex, lastShownItemIndex)
	// 	}
	// }

	// Turns out this optimization won't work
	// because sometimes item height is an average approximation
	// and the other times it's the real item height
	// and sometimes it can change while item's not visible.
	// /**
	//  * Measures new "after" items height.
	//  * @param  {number} firstShownItemIndex — New first shown item index.
	//  * @param  {number} lastShownItemIndex — New last shown item index.
	//  * @return {number}
	//  */
	// getAfterItemsHeightOptimized(firstShownItemIndex, lastShownItemIndex) {
	// 	// If the previous and new shown item indexes intersect
	// 	// then the new "after" items height may be calculated
	// 	// based on the previous "after" items height.
	// 	if (this.getState().averageItemHeight !== undefined &&
	// 		this.doPrevAndNextItemIndexesIntersect(firstShownItemIndex, lastShownItemIndex)) {
	// 		let afterItemsHeight = this.getState().afterItemsHeight
	// 		// Add all "after" will-be-hidden items' height.
	// 		let i = this.getState().lastShownItemIndex
	// 		while (i >= this.getState().firstShownItemIndex && i > lastShownItemIndex) {
	// 			afterItemsHeight += (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			afterItemsHeight += this.getVerticalSpacing()
	// 			i--
	// 		}
	// 		// Subtract all "after" will-be-shown items' height.
	// 		i = lastShownItemIndex
	// 		while (i >= firstShownItemIndex && i > this.getState().lastShownItemIndex) {
	// 			afterItemsHeight -= (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			afterItemsHeight -= this.getVerticalSpacing()
	// 			i--
	// 		}
	// 		return afterItemsHeight
	// 	}
	// 	// If the previous and new shown item indexes don't intersect
	// 	// then re-calculate "after" items height.
	// 	else {
	// 		return this.getAfterItemsHeight(firstShownItemIndex, lastShownItemIndex)
	// 	}
	// }

	// Was used it `.getBeforeItemsHeightOptimized()` and `.getAfterItemsHeightOptimized()`.
	// doPrevAndNextItemIndexesIntersect(firstShownItemIndex, lastShownItemIndex) {
	// 	return firstShownItemIndex <= this.getState().lastShownItemIndex &&
	// 		lastShownItemIndex >= this.getState().firstShownItemIndex
	// }

	// Not implementing the "delayed" layout feature for now.
	// delayLayout(args) {
	// 	// Suppose there's a "router" library which restores scroll position
	// 	// on "Back" navigation but only does so after `componentDidMount()`
	// 	// is called on the underlying page meaning that by the time
	// 	// the scroll position is restored the `VirtualScroller` component
	// 	// has already rendered with previous page's scroll position
	// 	// resulting in an unnecessary layout. "Delaying" layout
	// 	// means that the layout is called in a `setTimeout(..., 0)` call
	// 	// rather than immediately on mount.
	// 	if (this.shouldDelayLayout) {
	// 		this.layoutDelayedWithArgs = args
	// 		// Then in `.render()`:
	// 		// if (this.layoutDelayedWithArgs) {
	// 		// 	this.shouldDelayLayout = false
	// 		// 	setTimeout(() => {
	// 		// 		if (this.isRendered) {
	// 		// 			this.onUpdateShownItemIndexes(this.layoutDelayedWithArgs)
	// 		// 			this.layoutDelayedWithArgs = undefined
	// 		// 		}
	// 		// 	}, 0)
	// 		// }
	// 		return true
	// 	}
	// }
}

const LAYOUT_REASON = {
	SCROLL: 'scroll',
	STOPPED_SCROLLING: 'stopped scrolling',
	MANUAL: 'manual',
	MOUNT: 'mount',
	ITEM_HEIGHT_NOT_MEASURED: 'some item height wasn\'t measured',
	RESIZE: 'resize',
	ITEM_HEIGHT_CHANGED: 'item height changed',
	ITEMS_CHANGED: 'items changed',
	TOP_OFFSET_CHANGED: 'top offset changed'
}