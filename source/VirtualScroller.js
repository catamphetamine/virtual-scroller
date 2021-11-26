// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import {
	supportsTbody,
	BROWSER_NOT_SUPPORTED_ERROR,
	addTbodyStyles,
	setTbodyPadding
} from './DOM/tbody'

import DOMEngine from './DOM/Engine'

import Layout, { LAYOUT_REASON } from './Layout'
import Resize from './Resize'
import BeforeResize from './BeforeResize'
import Scroll from './Scroll'
import ListHeightChangeWatcher from './ListHeightChangeWatcher'
import ItemHeights from './ItemHeights'
import getItemsDiff from './getItemsDiff'
import getVerticalSpacing from './getVerticalSpacing'

import log, { warn, isDebug, reportError } from './utility/debug'
import shallowEqual from './utility/shallowEqual'
import getStateSnapshot from './utility/getStateSnapshot'

export default class VirtualScroller {
	/**
	 * @param  {function} getItemsContainerElement — Returns the container DOM `Element`.
	 * @param  {any[]} items — The list of items.
	 * @param  {Object} [options] — See README.md.
	 * @return {VirtualScroller}
	 */
	constructor(
		getItemsContainerElement,
		items,
		options = {}
	) {
		const {
			onStateChange,
			customState,
			initialScrollPosition,
			onScrollPositionChange,
			measureItemsBatchSize,
			// `getScrollableContainer` option is deprecated.
			// Use `scrollableContainer` instead.
			getScrollableContainer,
			getColumnsCount,
			getItemId,
			tbody,
			_useTimeoutInRenderLoop,
			_waitForScrollingToStop,
			// bypassBatchSize
		} = options

		let {
			getState,
			setState
		} = options

		let {
			bypass,
			// prerenderMargin,
			estimatedItemHeight,
			// getItemState,
			onItemInitialRender,
			// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
			onItemFirstRender,
			scrollableContainer,
			state,
			engine
		} = options

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

		// Could support non-DOM rendering engines.
		// For example, React Native, `<canvas/>`, etc.
		if (!engine) {
			engine = DOMEngine
		}

		// Sometimes, when `new VirtualScroller()` instance is created,
		// `getItemsContainerElement()` might not be ready to return the "container" DOM Element yet
		// (for example, because it's not rendered yet). That's the reason why it's a getter function.
		// For example, in React `<VirtualScroller/>` component, a `VirtualScroller`
		// instance is created in the React component's `constructor()`, and at that time
		// the container Element is not yet available. The container Element is available
		// in `componentDidMount()`, but `componentDidMount()` is not executed on server,
		// which would mean that React `<VirtualScroller/>` wouldn't render at all
		// on server side, while with the `getItemsContainerElement()` approach, on server side,
		// it still "renders" a list with a predefined amount of items in it by default.
		// (`initiallyRenderedItemsCount`, or `1`).
		this.getItemsContainerElement = getItemsContainerElement
		this.itemsContainer = engine.createItemsContainer(getItemsContainerElement)

		// Remove any accidental text nodes from container (like whitespace).
		// Also guards against cases when someone accidentally tries
		// using `VirtualScroller` on a non-empty element.
		if (getItemsContainerElement()) {
			this.itemsContainer.clear()
		}

		this.scrollableContainer = engine.createScrollableContainer(
			scrollableContainer,
			getItemsContainerElement
		)

		// if (prerenderMargin === undefined) {
		// 	// Renders items which are outside of the screen by this "prerender margin".
		// 	// Is the screen height by default: seems to be the optimal value
		// 	// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
		// 	prerenderMargin = this.scrollableContainer ? this.scrollableContainer.getHeight() : 0
		// }

		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (tbody) {
			if (engine !== DOMEngine) {
				throw new Error('[virtual-scroller] `tbody` option is only supported for DOM rendering engine')
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
		// this.prerenderMargin = prerenderMargin

		this.onStateChange = onStateChange

		this._getColumnsCount = getColumnsCount

		if (onItemInitialRender) {
			this.onItemInitialRender = onItemInitialRender
		}
		// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
		else if (onItemFirstRender) {
			this.onItemInitialRender = (item) => {
				warn('`onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.')
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

		// There're three main places where state is updated:
		//
		// * On scroll.
		// * On window resize.
		// * On set new items.
		//
		// State updates may be "asynchronous" (like in React), in which case the
		// corresponding operation is "pending" until the state update is applied.
		//
		// If there's a "pending" window resize or a "pending" update of the set of items,
		// then "on scroll" updates aren't dispatched.
		//
		// If there's a "pending" on scroll update and the window is resize or a new set
		// of items is set, then that "pending" on scroll update gets overwritten.
		//
		// If there's a "pending" update of the set of items, then window resize handler
		// sees that "pending" update and dispatches its own state update so that the
		// "pending" state update originating from `setItems()` is not lost.
		//
		// If there's a "pending" window resize, and a new set of items is set,
		// then the state update of the window resize handler gets overwritten.

		// Create default `getState()`/`setState()` functions.
		if (!getState) {
			getState = () => this.state
			setState = (stateUpdate, { willUpdateState, didUpdateState }) => {
				const prevState = getState()
				// Because this variant of `.setState()` is "synchronous" (immediate),
				// it can be written like `...prevState`, and no state updates would be lost.
				// But if it was "asynchronous" (not immediate), then `...prevState`
				// wouldn't work in all cases, because it could be stale in cases
				// when more than a single `setState()` call is made before
				// the state actually updates, making `prevState` stale.
				const newState = {
					...prevState,
					...stateUpdate
				}
				willUpdateState(newState, prevState)
				this.state = newState
				// // Is only used in tests.
				// if (this._onStateUpdate) {
				// 	this._onStateUpdate(stateUpdate)
				// }
				didUpdateState(prevState)
			}
		}

		this.getState = getState
		this.setState = (stateUpdate) => {
			if (isDebug()) {
				log('Set state', getStateSnapshot(stateUpdate))
			}
			setState(stateUpdate, {
				willUpdateState: this.willUpdateState,
				didUpdateState: this.didUpdateState
			})
		}

		if (state) {
			if (isDebug()) {
				log('Initial state (passed)', getStateSnapshot(state))
			}
		}

		// Check if the current `columnsCount` matches the one from state.
		// For example, a developer might snapshot `VirtualScroller` state
		// when the user navigates from the page containing the list
		// in order to later restore the list's state when the user goes "Back".
		// But, the user might have also resized the window while being on that
		// "other" page, and when they come "Back", their snapshotted state
		// no longer qualifies. Well, it does qualify, but only partially.
		// For example, `itemStates` are still valid, but first and last shown
		// item indexes aren't.
		if (state) {
			let shouldResetLayout
			const columnsCountForState = this.getActualColumnsCountForState()
			if (columnsCountForState !== state.columnsCount) {
				warn('~ Columns Count changed from', state.columnsCount || 1, 'to', columnsCountForState || 1, '~')
				shouldResetLayout = true
			}
			const columnsCount = this.getActualColumnsCount()
			const firstShownItemIndex = Math.floor(state.firstShownItemIndex / columnsCount) * columnsCount
			if (firstShownItemIndex !== state.firstShownItemIndex) {
				warn('~ First Shown Item Index', state.firstShownItemIndex, 'is not divisible by Columns Count', columnsCount, '~')
				shouldResetLayout = true
			}
			if (shouldResetLayout) {
				warn('Reset Layout')
				state = {
					...state,
					...this.getInitialLayoutState(state.items)
				}
			}
		}

		// Reset `verticalSpacing` so that it re-measures it after the list
		// has been rendered initially. The rationale is that the `state`
		// can't be "trusted" in a sense that the user might have resized
		// their window after the `state` has been snapshotted, and changing
		// window width might have activated different CSS `@media()` "queries"
		// resulting in a potentially different vertical spacing.
		if (state) {
			state = {
				...state,
				verticalSpacing: undefined
			}
		}

		// Create `ItemHeights` instance.
		this.itemHeights = new ItemHeights(
			this.itemsContainer,
			(i) => this.getState().itemHeights[i],
			(i, height) => this.getState().itemHeights[i] = height
		)

		// Initialize `ItemHeights` from the initially passed `state`.
		if (state) {
			this.itemHeights.initialize(state.itemHeights)
		}

		this.layout = new Layout({
			bypass,
			estimatedItemHeight,
			measureItemsBatchSize: measureItemsBatchSize === undefined ? 50 : measureItemsBatchSize,
			getPrerenderMargin: () => this.getPrerenderMargin(),
			getVerticalSpacing: () => this.getVerticalSpacing(),
			getVerticalSpacingBeforeResize: () => this.getVerticalSpacingBeforeResize(),
			getColumnsCount: () => this.getColumnsCount(),
			getColumnsCountBeforeResize: () => this.getState().beforeResize && this.getState().beforeResize.columnsCount,
			getItemHeight: (i) => this.getState().itemHeights[i],
			getItemHeightBeforeResize: (i) => this.getState().beforeResize && this.getState().beforeResize.itemHeights[i],
			getBeforeResizeItemsCount: () => this.getState().beforeResize ? this.getState().beforeResize.itemHeights.length : 0,
			getAverageItemHeight: () => this.itemHeights.getAverage(),
			getMaxVisibleAreaHeight: () => this.scrollableContainer && this.scrollableContainer.getHeight(),
			//
			// The "previously calculated layout" feature is not currently used.
			//
			// The current layout snapshot could be stored as a "previously calculated layout" variable
			// so that it could theoretically be used when calculating new layout incrementally
			// rather than from scratch, which would be an optimization.
			//
			getPreviouslyCalculatedLayout: () => this.previouslyCalculatedLayout
		})

		this.resize = new Resize({
			bypass,
			scrollableContainer: this.scrollableContainer,
			onStart: () => {
				log('~ Scrollable container resize started ~')
				this.isResizing = true
			},
			onStop: () => {
				log('~ Scrollable container resize finished ~')
				this.isResizing = undefined
			},
			onNoChange: () => {
				// There might have been some missed `this.onUpdateShownItemIndexes()` calls
				// due to setting `this.isResizing` flag to `true` during the resize.
				// So, update shown item indexes just in case.
				this.onUpdateShownItemIndexes({
					reason: LAYOUT_REASON.VIEWPORT_SIZE_UNCHANGED
				})
			},
			onHeightChange: () => this.onUpdateShownItemIndexes({
				reason: LAYOUT_REASON.VIEWPORT_HEIGHT_CHANGED
			}),
			onWidthChange: (prevWidth, newWidth) => {
				log('~ Scrollable container width changed from', prevWidth, 'to', newWidth, '~')
				this.onResize()
			}
		})

		this.scroll = new Scroll({
			bypass: this.bypass,
			scrollableContainer: this.scrollableContainer,
			itemsContainer: this.itemsContainer,
			waitForScrollingToStop: _waitForScrollingToStop,
			onScroll: ({ delayed } = {}) => {
				this.onUpdateShownItemIndexes({
					reason: delayed ? LAYOUT_REASON.STOPPED_SCROLLING : LAYOUT_REASON.SCROLL
				})
			},
			initialScrollPosition,
			onScrollPositionChange,
			isImmediateLayoutScheduled: () => this.layoutTimer,
			hasNonRenderedItemsAtTheTop: () => this.getState().firstShownItemIndex > 0,
			hasNonRenderedItemsAtTheBottom: () => this.getState().lastShownItemIndex < this.getItemsCount() - 1,
			getLatestLayoutVisibleArea: () => this.latestLayoutVisibleArea,
			getListTopOffset: this.getListTopOffsetInsideScrollableContainer,
			getPrerenderMargin: () => this.getPrerenderMargin()
		})

		this.listHeightChangeWatcher = new ListHeightChangeWatcher({
			itemsContainer: this.itemsContainer,
			getListTopOffset: this.getListTopOffsetInsideScrollableContainer
		})

		if (engine.watchListTopOffset) {
			this.listTopOffsetWatcher = engine.watchListTopOffset({
				getListTopOffset: this.getListTopOffsetInsideScrollableContainer,
				onListTopOffsetChange: ({ reason }) => this.onUpdateShownItemIndexes({
					reason: LAYOUT_REASON.TOP_OFFSET_CHANGED
				})
			})
		}

		this.beforeResize = new BeforeResize({
			getState: this.getState,
			getVerticalSpacing: this.getVerticalSpacing,
			getColumnsCount: this.getColumnsCount
		})

		// Possibly clean up "before resize" property in state.
		// "Before resize" state property is cleaned up when all "before resize" item heights
		// have been re-measured in an asynchronous `this.setState({ beforeResize: undefined })` call.
		// If `VirtualScroller` state was snapshotted externally before that `this.setState()` call
		// has been applied, then "before resize" property might have not been cleaned up properly.
		this.beforeResize.onInitialState(state)

		// `this.verticalSpacing` acts as a "true" source for vertical spacing value.
		// Vertical spacing is also stored in `state` but `state` updates could be
		// "asynchronous" (not applied immediately) and `this.onUpdateShownItemIndexes()`
		// requires vertical spacing to be correct at any time, without any delays.
		// So, vertical spacing is also duplicated in `state`, but the "true" source
		// is still `this.verticalSpacing`.
		//
		// `this.verticalSpacing` must be initialized before calling `this.getInitialState()`.
		//
		this.verticalSpacing = state ? state.verticalSpacing : undefined

		// Set initial `state`.
		this.setState(state || this.getInitialState(customState))
	}

	/**
	 * Returns the initial state of the `VirtualScroller`.
	 * @param  {object} [customState] — Any additional "custom" state may be stored in `VirtualScroller`'s state. For example, React implementation stores item "refs" as "custom" state.
	 * @return {object}
	 */
	getInitialState(customState) {
		const items = this.initialItems
		const state = {
			...customState,
			...this.getInitialLayoutState(items),
			items,
			itemStates: new Array(items.length)
		}
		if (isDebug()) {
			log('Initial state (autogenerated)', getStateSnapshot(state))
		}
		log('First shown item index', state.firstShownItemIndex)
		log('Last shown item index', state.lastShownItemIndex)
		return state
	}

	getInitialLayoutState(items) {
		const itemsCount = items.length
		const {
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		} = this.layout.getInitialLayoutValues({
			itemsCount,
			columnsCount: this.getColumnsCount()
		})
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
			columnsCount: this.getActualColumnsCountForState(),
			verticalSpacing: this.verticalSpacing,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		}
	}

	// Bind to `this` in order to prevent bugs when this function is passed by reference
	// and then called with its `this` being unintentionally `window` resulting in
	// the `if` condition being "falsy".
	getActualColumnsCountForState = () => {
		return this._getColumnsCount ? this._getColumnsCount(this.scrollableContainer) : undefined
	}

	getActualColumnsCount() {
		return this.getActualColumnsCountForState() || 1
	}

	// Bind to `this` in order to prevent bugs when this function is passed by reference
	// and then called with its `this` being unintentionally `window` resulting in
	// the `if` condition being "falsy".
	getVerticalSpacing = () => {
		return this.verticalSpacing || 0
	}

	getVerticalSpacingBeforeResize() {
		// `beforeResize.verticalSpacing` can be `undefined`.
		// For example, if `this.setState({ verticalSpacing })` call hasn't been applied
		// before the resize happened (in case of an "asynchronous" state update).
		return this.getState().beforeResize && this.getState().beforeResize.verticalSpacing || 0
	}

	getColumnsCount() {
		return this.getState() && this.getState().columnsCount || 1
	}

	getItemsCount() {
		return this.getState().items.length
	}

	getPrerenderMargin() {
		// The list component renders not only the items that're currently visible
		// but also the items that lie within some extra vertical margin (called
		// "prerender margin") on top and bottom for future scrolling: this way,
		// there'll be significantly less layout recalculations as the user scrolls,
		// because now it doesn't have to recalculate layout on each scroll event.
		// By default, the "prerender margin" is equal to the screen height:
		// this seems to be the optimal value for "Page Up" / "Page Down" navigation
		// and optimized mouse wheel scrolling (a user is unlikely to continuously
		// scroll past the screen height, because they'd stop to read through
		// the newly visible items first, and when they do stop scrolling, that's
		// when layout gets recalculated).
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
		warn('`.onMount()` instance method name is deprecated, use `.listen()` instance method name instead.')
		this.listen()
	}

	render() {
		warn('`.render()` instance method name is deprecated, use `.listen()` instance method name instead.')
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

		const stateUpdate = this.measureItemHeightsAndSpacingAndUpdateTablePadding()

		this.resize.listen()
		this.scroll.listen()

		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			addTbodyStyles(this.getItemsContainerElement())
		}

		// Re-calculate layout and re-render the list.
		// Do that even if when an initial `state` parameter, containing layout values,
		// has been passed. The reason is that the `state` parameter can't be "trusted"
		// in a way that it could have been snapshotted for another window width and
		// the user might have resized their window since then.
		this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MOUNTED, stateUpdate })
	}

	measureItemHeightsAndSpacingAndUpdateTablePadding() {
		// Measure "newly shown" item heights.
		// Also re-validate already measured items' heights.
		this.itemHeights.measureItemHeights(
			this.getState().firstShownItemIndex,
			this.getState().lastShownItemIndex
		)

		// Update item vertical spacing.
		const verticalSpacing = this.measureVerticalSpacing()

		// Update `<tbody/>` `padding`.
		// (`<tbody/>` is different in a way that it can't have `margin`, only `padding`).
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			setTbodyPadding(
				this.getItemsContainerElement(),
				this.getState().beforeItemsHeight,
				this.getState().afterItemsHeight
			)
		}

		// Return a state update.
		if (verticalSpacing !== undefined) {
			return { verticalSpacing }
		}
	}

	getVisibleArea() {
		const visibleArea = this.scroll.getVisibleAreaBounds()
		this.latestLayoutVisibleArea = visibleArea

		// Subtract the top offset of the list inside the scrollable container.
		const listTopOffsetInsideScrollableContainer = this.getListTopOffsetInsideScrollableContainer()
		return {
			top: visibleArea.top - listTopOffsetInsideScrollableContainer,
			bottom: visibleArea.bottom - listTopOffsetInsideScrollableContainer
		}
	}

	/**
	 * Returns the list's top offset relative to the scrollable container's top edge.
	 * @return {number}
	 */
	getListTopOffsetInsideScrollableContainer = () => {
		const listTopOffset = this.scrollableContainer.getItemsContainerTopOffset()
		if (this.listTopOffsetWatcher) {
			this.listTopOffsetWatcher.onListTopOffset(listTopOffset)
		}
		return listTopOffset
	}

	/**
	 * Returns the items's top offset relative to the scrollable container's top edge.
	 * @param {number} i — Item index
	 * @return {[number]} Returns the item's scroll Y position. Returns `undefined` if any of the previous items haven't been rendered yet.
	 */
	getItemScrollPosition(i) {
		const itemTopOffsetInList = this.layout.getItemTopOffset(i)
		if (itemTopOffsetInList === undefined) {
			return
		}
		return this.getListTopOffsetInsideScrollableContainer() + itemTopOffsetInList
	}

	onUnmount() {
		warn('`.onUnmount()` instance method name is deprecated, use `.stop()` instance method name instead.')
		this.stop()
	}

	destroy() {
		warn('`.destroy()` instance method name is deprecated, use `.stop()` instance method name instead.')
		this.stop()
	}

	stop = () => {
		this.isRendered = false
		this.resize.stop()
		this.scroll.stop()
		if (this.listTopOffsetWatcher) {
			this.listTopOffsetWatcher.stop()
		}
		this.cancelLayoutTimer({})
	}

	cancelLayoutTimer({ stateUpdate }) {
		if (this.layoutTimer) {
			clearTimeout(this.layoutTimer)
			this.layoutTimer = undefined
			// Merge state updates.
			if (stateUpdate || this.layoutTimerStateUpdate) {
				stateUpdate = {
					...this.layoutTimerStateUpdate,
					...stateUpdate
				}
				this.layoutTimerStateUpdate = undefined
				return stateUpdate
			}
		} else {
			return stateUpdate
		}
	}

	scheduleLayoutTimer({ reason, stateUpdate }) {
		this.layoutTimerStateUpdate = stateUpdate
		this.layoutTimer = setTimeout(() => {
			this.layoutTimerStateUpdate = undefined
			this.layoutTimer = undefined
			this.onUpdateShownItemIndexes({
				reason,
				stateUpdate
			})
		}, 0)
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
		if (isDebug()) {
			log('State', getStateSnapshot(newState))
		}

		let layoutUpdateReason

		if (this.firstNonMeasuredItemIndex !== undefined) {
			layoutUpdateReason = LAYOUT_REASON.ACTUAL_ITEM_HEIGHTS_HAVE_BEEN_MEASURED
		}

		if (this.resetLayoutAfterResize) {
			layoutUpdateReason = LAYOUT_REASON.VIEWPORT_WIDTH_CHANGED
		}

		// If `this.resetLayoutAfterResize` flag was reset after calling
		// `this.measureItemHeightsAndSpacingAndUpdateTablePadding()`
		// then there would be a bug because
		// `this.measureItemHeightsAndSpacingAndUpdateTablePadding()`
		// calls `this.setState({ verticalSpacing })` which calls
		// `this.didUpdateState()` immediately, so `this.resetLayoutAfterResize`
		// flag wouldn't be reset by that time and would trigger things
		// like `this.itemHeights.reset()` a second time.
		//
		// So, instead read the value of `this.resetLayoutAfterResize` flag
		// and reset it right away to prevent any such potential bugs.
		//
		const resetLayoutAfterResize = this.resetLayoutAfterResize

		// Reset `this.firstNonMeasuredItemIndex`.
		this.firstNonMeasuredItemIndex = undefined

		// Reset `this.resetLayoutAfterResize` flag.
		this.resetLayoutAfterResize = undefined

		// Reset `this.newItemsWillBeRendered` flag.
		this.newItemsWillBeRendered = undefined

		// Reset `this.itemHeightsThatChangedWhileNewItemsWereBeingRendered`.
		this.itemHeightsThatChangedWhileNewItemsWereBeingRendered = undefined

		// Reset `this.itemStatesThatChangedWhileNewItemsWereBeingRendered`.
		this.itemStatesThatChangedWhileNewItemsWereBeingRendered = undefined

		if (resetLayoutAfterResize) {
			// Reset measured item heights on viewport width change.
			this.itemHeights.reset()

			// Reset `verticalSpacing` (will be re-measured).
			this.verticalSpacing = undefined
		}

		const { items: previousItems } = prevState
		const { items: newItems } = newState
		// Even if `this.newItemsWillBeRendered` flag is `true`,
		// `newItems` could still be equal to `previousItems`.
		// For example, when `setState()` calls don't update `state` immediately
		// and a developer first calls `setItems(newItems)` and then calls `setItems(oldItems)`:
		// in that case, `this.newItemsWillBeRendered` flag will be `true` but the actual `items`
		// in state wouldn't have changed due to the first `setState()` call being overwritten
		// by the second `setState()` call (that's called "batching state updates" in React).
		if (newItems !== previousItems) {
			const itemsDiff = this.getItemsDiff(previousItems, newItems)
			if (itemsDiff) {
				// The call to `.onPrepend()` must precede the call to `.measureItemHeights()`
				// which is called in `.onRendered()`.
				// `this.itemHeights.onPrepend()` updates `firstMeasuredItemIndex`
				// and `lastMeasuredItemIndex` of `this.itemHeights`.
				const { prependedItemsCount } = itemsDiff
				this.itemHeights.onPrepend(prependedItemsCount)
			} else {
				this.itemHeights.reset()
				// `newState.itemHeights` is an array of `undefined`s.
				this.itemHeights.initialize(newState.itemHeights)
			}

			if (!resetLayoutAfterResize) {
				// The call to `this.onNewItemsRendered()` must precede the call to
				// `.measureItemHeights()` which is called in `.onRendered()` because
				// `this.onNewItemsRendered()` updates `firstMeasuredItemIndex` and
				// `lastMeasuredItemIndex` of `this.itemHeights` in case of a prepend.
				//
				// If after prepending items the scroll position
				// should be "restored" so that there's no "jump" of content
				// then it means that all previous items have just been rendered
				// in a single pass, and there's no need to update layout again.
				//
				if (this.onNewItemsRendered(itemsDiff, newState) !== 'SEAMLESS_PREPEND') {
					layoutUpdateReason = LAYOUT_REASON.ITEMS_CHANGED
				}
			}
		}

		let stateUpdate

		// Re-measure item heights.
		// Also, measure vertical spacing (if not measured) and fix `<table/>` padding.
		//
		// This block should go after `if (newItems !== previousItems) {}`
		// because `this.itemHeights` can get `.reset()` there, which would
		// discard all the measurements done here, and having currently shown
		// item height measurements is required.
		//
		if (
			newState.firstShownItemIndex !== prevState.firstShownItemIndex ||
			newState.lastShownItemIndex !== prevState.lastShownItemIndex ||
			newState.items !== prevState.items ||
			resetLayoutAfterResize
		) {
			const verticalSpacingStateUpdate = this.measureItemHeightsAndSpacingAndUpdateTablePadding()
			if (verticalSpacingStateUpdate) {
				stateUpdate = {
					...stateUpdate,
					...verticalSpacingStateUpdate
				}
			}
		}

		// Clean up "before resize" item heights and adjust the scroll position accordingly.
		// Calling `this.beforeResize.cleanUpBeforeResizeItemHeights()` might trigger
		// a `this.setState()` call but that wouldn't matter because `beforeResize`
		// properties have already been modified directly in `state` (a hacky technique)
		const cleanedUpBeforeResize = this.beforeResize.cleanUpBeforeResizeItemHeights(prevState)
		if (cleanedUpBeforeResize !== undefined) {
			const { scrollBy, beforeResize } = cleanedUpBeforeResize
			log('Correct scroll position by', scrollBy)
			this.scroll.scrollByY(scrollBy)
			stateUpdate = {
				...stateUpdate,
				beforeResize
			}
		}

		if (layoutUpdateReason) {
			this.updateStateRightAfterRender({
				stateUpdate,
				reason: layoutUpdateReason
			})
		} else if (stateUpdate) {
			this.setState(stateUpdate)
		}
	}

	// After a new set of items has been rendered:
	//
	// * Restores scroll position when using `preserveScrollPositionOnPrependItems`
	//   and items have been prepended.
	//
	// * Applies any "pending" `itemHeights` updates — those ones that happened
	//   while an asynchronous `setState()` call in `setItems()` was pending.
	//
	// * Either creates or resets the snapshot of the current layout.
	//
	//   The current layout snapshot could be stored as a "previously calculated layout" variable
	//   so that it could theoretically be used when calculating new layout incrementally
	//   rather than from scratch, which would be an optimization.
	//
	//   The "previously calculated layout" feature is not currently used.
	//
	onNewItemsRendered(itemsDiff, newLayout) {
		// If it's an "incremental" update.
		if (itemsDiff) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff

			const {
				itemHeights,
				itemStates
			} = this.getState()

			// See if any items' heights changed while new items were being rendered.
			if (this.itemHeightsThatChangedWhileNewItemsWereBeingRendered) {
				for (const i of Object.keys(this.itemHeightsThatChangedWhileNewItemsWereBeingRendered)) {
					itemHeights[prependedItemsCount + parseInt(i)] = this.itemHeightsThatChangedWhileNewItemsWereBeingRendered[i]
				}
			}

			// See if any items' states changed while new items were being rendered.
			if (this.itemStatesThatChangedWhileNewItemsWereBeingRendered) {
				for (const i of Object.keys(this.itemStatesThatChangedWhileNewItemsWereBeingRendered)) {
					itemStates[prependedItemsCount + parseInt(i)] = this.itemStatesThatChangedWhileNewItemsWereBeingRendered[i]
				}
			}

			if (prependedItemsCount === 0) {
				// Adjust `this.previouslyCalculatedLayout`.
				if (this.previouslyCalculatedLayout) {
					if (
						this.previouslyCalculatedLayout.firstShownItemIndex === newLayout.firstShownItemIndex &&
						this.previouslyCalculatedLayout.lastShownItemIndex === newLayout.lastShownItemIndex
					) {
						// `this.previouslyCalculatedLayout` stays the same.
						// `firstShownItemIndex` / `lastShownItemIndex` didn't get changed in `setItems()`,
						// so `beforeItemsHeight` and `shownItemsHeight` also stayed the same.
					} else {
						warn('Unexpected (non-matching) "firstShownItemIndex" or "lastShownItemIndex" encountered in "didUpdateState()" after appending items')
						warn('Previously calculated layout', this.previouslyCalculatedLayout)
						warn('New layout', newLayout)
						this.previouslyCalculatedLayout = undefined
					}
				}
				return 'SEAMLESS_APPEND'
			} else {
				if (this.listHeightChangeWatcher.hasSnapshot()) {
					if (newLayout.firstShownItemIndex === 0) {
						// Restore (adjust) scroll position.
						log('~ Restore Scroll Position ~')
						const listBottomOffsetChange = this.listHeightChangeWatcher.getListBottomOffsetChange({
							beforeItemsHeight: newLayout.beforeItemsHeight
						})
						this.listHeightChangeWatcher.reset()
						if (listBottomOffsetChange) {
							log('Scroll down by', listBottomOffsetChange)
							this.scroll.scrollByY(listBottomOffsetChange)
						} else {
							log('Scroll position hasn\'t changed')
						}
						// Create new `this.previouslyCalculatedLayout`.
						if (this.previouslyCalculatedLayout) {
							if (
								this.previouslyCalculatedLayout.firstShownItemIndex === 0 &&
								this.previouslyCalculatedLayout.lastShownItemIndex === newLayout.lastShownItemIndex - prependedItemsCount
							) {
								this.previouslyCalculatedLayout = {
									beforeItemsHeight: 0,
									shownItemsHeight: this.previouslyCalculatedLayout.shownItemsHeight + listBottomOffsetChange,
									firstShownItemIndex: 0,
									lastShownItemIndex: newLayout.lastShownItemIndex
								}
							} else {
								warn('Unexpected (non-matching) "firstShownItemIndex" or "lastShownItemIndex" encountered in "didUpdateState()" after prepending items')
								warn('Previously calculated layout', this.previouslyCalculatedLayout)
								warn('New layout', newLayout)
								this.previouslyCalculatedLayout = undefined
							}
						}
						return 'SEAMLESS_PREPEND'
					} else {
						warn(`Unexpected "firstShownItemIndex" ${newLayout.firstShownItemIndex} encountered in "didUpdateState()" after prepending items. Expected 0.`)
					}
				}
			}
		}

		// Reset `this.previouslyCalculatedLayout` in any case other than
		// SEAMLESS_PREPEND or SEAMLESS_APPEND.
		this.previouslyCalculatedLayout = undefined
	}

	updateStateRightAfterRender({
		reason,
		stateUpdate
	}) {
		// In React, `setTimeout()` is used to prevent a React error:
		// "Maximum update depth exceeded.
		//  This can happen when a component repeatedly calls
		//  `.setState()` inside `componentWillUpdate()` or `componentDidUpdate()`.
		//  React limits the number of nested updates to prevent infinite loops."
		if (this._useTimeoutInRenderLoop) {
			// Cancel a previously scheduled re-layout.
			stateUpdate = this.cancelLayoutTimer({ stateUpdate })
			// Schedule a new re-layout.
			this.scheduleLayoutTimer({
				reason,
				stateUpdate
			})
		} else {
			this.onUpdateShownItemIndexes({
				reason,
				stateUpdate
			})
		}
	}

	measureVerticalSpacing() {
		if (this.verticalSpacing === undefined) {
			const { firstShownItemIndex, lastShownItemIndex } = this.getState()
			log('~ Measure item vertical spacing ~')
			const verticalSpacing = getVerticalSpacing({
				itemsContainer: this.itemsContainer,
				renderedItemsCount: lastShownItemIndex - firstShownItemIndex + 1
			})
			if (verticalSpacing === undefined) {
				log('Not enough items rendered to measure vertical spacing')
			} else {
				log('Item vertical spacing', verticalSpacing)
				this.verticalSpacing = verticalSpacing
				if (verticalSpacing !== 0) {
					return verticalSpacing
				}
			}
		}
	}

	remeasureItemHeight(i) {
		const { firstShownItemIndex } = this.getState()
		return this.itemHeights.remeasureItemHeight(i, firstShownItemIndex)
	}

	onItemStateChange(i, newItemState) {
		if (isDebug()) {
			log('~ Item state changed ~')
			log('Item', i)
			// Uses `JSON.stringify()` here instead of just outputting the JSON objects as is
			// because outputting JSON objects as is would show different results later when
			// the developer inspects those in the web browser console if those state objects
			// get modified in between they've been output to the console and the developer
			// decided to inspect them.
			log('Previous state' + '\n' + JSON.stringify(this.getState().itemStates[i], null, 2))
			log('New state' + '\n' + JSON.stringify(newItemState, null, 2))
		}

		this.getState().itemStates[i] = newItemState

		// Schedule the item state update for after the new items have been rendered.
		if (this.newItemsWillBeRendered) {
			if (!this.itemStatesThatChangedWhileNewItemsWereBeingRendered) {
				this.itemStatesThatChangedWhileNewItemsWereBeingRendered = {}
			}
			this.itemStatesThatChangedWhileNewItemsWereBeingRendered[String(i)] = newItemState
		}
	}

	onItemHeightChange(i) {
		log('~ Re-measure item height ~')
		log('Item', i)

		const {
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()

		// Check if the item is still rendered.
		if (!(i >= firstShownItemIndex && i <= lastShownItemIndex)) {
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
			return warn('The item is no longer rendered. This is not necessarily a bug, and could happen, for example, when there\'re several `onItemHeightChange(i)` calls issued at the same time.')
		}

		const previousHeight = itemHeights[i]
		if (previousHeight === undefined) {
			return reportError(`"onItemHeightChange()" has been called for item ${i}, but that item hasn't been rendered before.`)
		}

		const newHeight = this.remeasureItemHeight(i)

		log('Previous height', previousHeight)
		log('New height', newHeight)

		if (previousHeight !== newHeight) {
			log('~ Item height has changed ~')

			// Update or reset previously calculated layout.
			this.updatePreviouslyCalculatedLayoutOnItemHeightChange(i, previousHeight, newHeight)

			// Recalculate layout.
			this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.ITEM_HEIGHT_CHANGED })

			// Schedule the item height update for after the new items have been rendered.
			if (this.newItemsWillBeRendered) {
				if (!this.itemHeightsThatChangedWhileNewItemsWereBeingRendered) {
					this.itemHeightsThatChangedWhileNewItemsWereBeingRendered = {}
				}
				this.itemHeightsThatChangedWhileNewItemsWereBeingRendered[String(i)] = newHeight
			}
		}
	}

	// Updates the snapshot of the current layout when an item's height changes.
	//
	// The "previously calculated layout" feature is not currently used.
	//
	// The current layout snapshot could be stored as a "previously calculated layout" variable
	// so that it could theoretically be used when calculating new layout incrementally
	// rather than from scratch, which would be an optimization.
	//
	updatePreviouslyCalculatedLayoutOnItemHeightChange(i, previousHeight, newHeight) {
		if (this.previouslyCalculatedLayout) {
			const heightDifference = newHeight - previousHeight
			if (i < this.previouslyCalculatedLayout.firstShownItemIndex) {
				// Patch `this.previouslyCalculatedLayout`'s `.beforeItemsHeight`.
				this.previouslyCalculatedLayout.beforeItemsHeight += heightDifference
			} else if (i > this.previouslyCalculatedLayout.lastShownItemIndex) {
				// Could patch `.afterItemsHeight` of `this.previouslyCalculatedLayout` here,
				// if `.afterItemsHeight` property existed in `this.previouslyCalculatedLayout`.
				if (this.previouslyCalculatedLayout.afterItemsHeight !== undefined) {
					this.previouslyCalculatedLayout.afterItemsHeight += heightDifference
				}
			} else {
				// Patch `this.previouslyCalculatedLayout`'s shown items height.
				this.previouslyCalculatedLayout.shownItemsHeight += newHeight - previousHeight
			}
		}
	}

	/**
	 * Validates the heights of items to be hidden on next render.
	 * For example, a user could click a "Show more" button,
	 * or an "Expand YouTube video" button, which would result
	 * in the actual height of the list item being different
	 * from what has been initially measured in `this.itemHeights[i]`,
	 * if the developer didn't call `.onItemStateChange()` and `.onItemHeightChange(i)`.
	 */
	validateWillBeHiddenItemHeightsAreAccurate(firstShownItemIndex, lastShownItemIndex) {
		let isValid = true
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
					if (isValid) {
						log('~ Validate will-be-hidden item heights. ~')
						// Update or reset previously calculated layout.
						this.updatePreviouslyCalculatedLayoutOnItemHeightChange(i, previouslyMeasuredItemHeight, actualItemHeight)
					}
					isValid = false
					warn('Item index', i, 'is no longer visible and will be unmounted. Its height has changed from', previouslyMeasuredItemHeight, 'to', actualItemHeight, 'since it was last measured. This is not necessarily a bug, and could happen, for example, on screen width change, or when there\'re several `onItemHeightChange(i)` calls issued at the same time, and the first one triggers a re-layout before the rest of them have had a chance to be executed.')
				}
			}
			i++
		}
		return isValid
	}

	getShownItemIndexes() {
		const itemsCount = this.getItemsCount()

		const {
			top: visibleAreaTop,
			bottom: visibleAreaBottom
		} = this.getVisibleArea()

		if (this.bypass) {
			return {
				firstShownItemIndex: 0,
				lastShownItemIndex: itemsCount - 1,
				// shownItemsHeight: this.getState().itemHeights.reduce((sum, itemHeight) => sum + itemHeight, 0)
			}
		}

		// Find the indexes of the items that are currently visible
		// (or close to being visible) in the scrollable container.
		// For scrollable containers other than the main screen, it could also
		// check the visibility of such scrollable container itself, because it
		// might be not visible.
		// If such kind of an optimization would hypothetically be implemented,
		// then it would also require listening for "scroll" events on the screen.
		// Overall, I suppose that such "actual visibility" feature would be
		// a very minor optimization and not something I'd deal with.
		const isVisible = visibleAreaTop < this.itemsContainer.getHeight() && visibleAreaBottom > 0
		if (!isVisible) {
			log('The entire list is off-screen. No items are visible.')
			return this.layout.getNonVisibleListShownItemIndexes()
		}

		// Get shown item indexes.
		return this.layout.getShownItemIndexes({
			itemsCount: this.getItemsCount(),
			visibleAreaTop,
			visibleAreaBottom
		})
	}

	/**
	 * Updates the "from" and "to" shown item indexes.
	 * If the list is visible and some of the items being shown are new
	 * and are required to be measured first, then
	 * `firstNonMeasuredItemIndex` is defined.
	 * If the list is visible and all items being shown have been encountered
	 * (and measured) before, then `firstNonMeasuredItemIndex` is `undefined`.
	 *
	 * The `stateUpdate` parameter is just an optional "additional" state update.
	 */
	updateShownItemIndexes = ({ stateUpdate }) => {
		const startedAt = Date.now()

		// Get shown item indexes.
		let {
			firstShownItemIndex,
			lastShownItemIndex,
			shownItemsHeight,
			firstNonMeasuredItemIndex
		} = this.getShownItemIndexes()

		// If scroll position is scheduled to be restored after render,
		// then the "anchor" item must be rendered, and all of the prepended
		// items before it, all in a single pass. This way, all of the
		// prepended items' heights could be measured right after the render
		// has finished, and the scroll position can then be immediately restored.
		if (this.listHeightChangeWatcher.hasSnapshot()) {
			if (lastShownItemIndex < this.listHeightChangeWatcher.getAnchorItemIndex()) {
				lastShownItemIndex = this.listHeightChangeWatcher.getAnchorItemIndex()
			}
			// `firstShownItemIndex` is always `0` when prepending items.
			// And `lastShownItemIndex` always covers all prepended items in this case.
			// None of the prepended items have been rendered before,
			// so their heights are unknown. The code at the start of this function
			// did therefore set `firstNonMeasuredItemIndex` to non-`undefined`
			// in order to render just the first prepended item in order to
			// measure it, and only then make a decision on how many other
			// prepended items to render. But since we've instructed the code
			// to show all of the prepended items at once, there's no need to
			// "redo layout after render". Additionally, if layout was re-done
			// after render, then there would be a short interval of visual
			// "jitter" due to the scroll position not being restored because it'd
			// wait for the second layout to finish instead of being restored
			// right after the first one.
			firstNonMeasuredItemIndex = undefined
		}

		// Validate the heights of items to be hidden on next render.
		// For example, a user could click a "Show more" button,
		// or an "Expand YouTube video" button, which would result
		// in the actual height of the list item being different
		// from what has been initially measured in `this.itemHeights[i]`,
		// if the developer didn't call `.onItemStateChange()` and `.onItemHeightChange(i)`.
		if (!this.validateWillBeHiddenItemHeightsAreAccurate(firstShownItemIndex, lastShownItemIndex)) {
			log('~ Because some of the will-be-hidden item heights (listed above) have changed since they\'ve last been measured, redo layout. ~')
			// Redo layout, now with the correct item heights.
			return this.updateShownItemIndexes({ stateUpdate });
		}

		// Measure "before" items height.
		const beforeItemsHeight = this.layout.getBeforeItemsHeight(
			firstShownItemIndex
		)

		// Measure "after" items height.
		const afterItemsHeight = this.layout.getAfterItemsHeight(
			lastShownItemIndex,
			this.getItemsCount()
		)

		const layoutDuration = Date.now() - startedAt

		// Debugging.
		log('~ Layout values ' + (this.bypass ? '(bypass) ' : '') + '~')
		if (layoutDuration < SLOW_LAYOUT_DURATION) {
			// log('Calculated in', layoutDuration, 'ms')
		} else {
			warn('Layout calculated in', layoutDuration, 'ms')
		}
		if (this._getColumnsCount) {
			log('Columns count', this.getColumnsCount())
		}
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		log('Before items height', beforeItemsHeight)
		log('After items height (actual or estimated)', afterItemsHeight)
		log('Average item height (used for estimated after items height calculation)', this.itemHeights.getAverage())
		if (isDebug()) {
			log('Item heights', this.getState().itemHeights.slice())
			log('Item states', this.getState().itemStates.slice())
		}

		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			this.getState().items,
			this.getState().itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)

		// Set `this.firstNonMeasuredItemIndex`.
		this.firstNonMeasuredItemIndex = firstNonMeasuredItemIndex

		// Set "previously calculated layout".
		//
		// The "previously calculated layout" feature is not currently used.
		//
		// The current layout snapshot could be stored as a "previously calculated layout" variable
		// so that it could theoretically be used when calculating new layout incrementally
		// rather than from scratch, which would be an optimization.
		//
		// Currently, this feature is not used, and `shownItemsHeight` property
		// is not returned at all, so don't set any "previously calculated layout".
		//
		if (shownItemsHeight === undefined) {
			this.previouslyCalculatedLayout = undefined
		} else {
			// If "previously calculated layout" feature would be implmeneted,
			// then this code would set "previously calculate layout" instance variable.
			//
			// What for would this instance variable be used?
			//
			// Instead of using a `this.previouslyCalculatedLayout` instance variable,
			// this code could use `this.getState()` because it reflects what's currently on screen,
			// but there's a single edge case when it could go out of sync —
			// updating item heights externally via `.onItemHeightChange(i)`.
			//
			// If, for example, an item height was updated externally via `.onItemHeightChange(i)`
			// then `this.getState().itemHeights` would get updated immediately but
			// `this.getState().beforeItemsHeight` or `this.getState().afterItemsHeight`
			// would still correspond to the previous item height, so those would be "stale".
			// On the other hand, same values in `this.previouslyCalculatedLayout` instance variable
			// can also be updated immediately, so they won't go out of sync with the updated item height.
			// That seems the only edge case when using a separate `this.previouslyCalculatedLayout`
			// instance variable instead of using `this.getState()` would theoretically be justified.
			//
			this.previouslyCalculatedLayout = {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				shownItemsHeight
			}
		}

		// Update `VirtualScroller` state.
		// `VirtualScroller` automatically re-renders on state updates.
		//
		// All `state` properties updated here should be overwritten in
		// the implementation of `setItems()` and `onResize()` methods
		// so that the `state` is not left in an inconsistent state
		// whenever there're concurrent `setState()` updates that could
		// possibly conflict with one another — instead, those state updates
		// should overwrite each other in terms of priority.
		// These "on scroll" updates have the lowest priority compared to
		// the state updates originating from `setItems()` and `onResize()` methods.
		//
		this.setState({
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			...stateUpdate
		})
	}

	onUpdateShownItemIndexes = ({ reason, stateUpdate }) => {
		// In case of "don't do anything".
		const skip = () => {
			if (stateUpdate) {
				this.setState(stateUpdate)
			}
		}

		// If new `items` have been set and are waiting to be applied,
		// or if the viewport width has changed requiring a re-layout,
		// then temporarily stop all other updates like "on scroll" updates.
		// This prevents `state` being inconsistent, because, for example,
		// both `setItems()` and this function could update `VirtualScroller` state
		// and having them operate in parallel could result in incorrectly calculated
		// `beforeItemsHeight` / `afterItemsHeight` / `firstShownItemIndex` /
		// `lastShownItemIndex`, because, when operating in parallel, this function
		// would have different `items` than the `setItems()` function, so their
		// results could diverge.
		if (this.newItemsWillBeRendered || this.resetLayoutAfterResize || this.isResizing) {
			return skip()
		}

		// If there're no items then there's no need to re-layout anything.
		if (this.getItemsCount() === 0) {
			return skip()
		}

		// Cancel a "re-layout when user stops scrolling" timer.
		this.scroll.cancelScheduledLayout()

		// Cancel a re-layout that is scheduled to run at the next "frame",
		// because a re-layout will be performed right now.
		stateUpdate = this.cancelLayoutTimer({ stateUpdate })

		// Perform a re-layout.
		log(`~ Update Layout (on ${reason}) ~`)
		this.updateShownItemIndexes({ stateUpdate })
	}

	updateLayout = () => this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MANUAL })

	// `.layout()` method name is deprecated, use `.updateLayout()` instead.
	layout = () => this.updateLayout()

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

		// Even if `newItems` are equal to `this.state.items`,
		// still perform a `setState()` call, because, if `setState()` calls
		// were "asynchronous", there could be a situation when a developer
		// first calls `setItems(newItems)` and then `setItems(oldItems)`:
		// if this function did `return` `if (newItems === this.state.items)`
		// then `setState({ items: newItems })` would be scheduled as part of
		// `setItems(newItems)` call, but the subsequent `setItems(oldItems)` call
		// wouldn't do anything resulting in `newItems` being set as a result,
		// and that wouldn't be what the developer intended.

		let { itemStates } = this.getState()
		let { itemHeights } = this.resetLayoutAfterResize
			? this.resetLayoutAfterResize.stateUpdate
			: this.getState()

		log('~ Update items ~')

		let layoutUpdate
		let itemsUpdateInfo

		// Compare the new items to the current items.
		const itemsDiff = this.getItemsDiff(previousItems, newItems)

		// See if it's an "incremental" items update.
		if (itemsDiff) {
			const {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			} = this.resetLayoutAfterResize
				? this.resetLayoutAfterResize.stateUpdate
				: this.getState()

			const shouldRestoreScrollPosition = firstShownItemIndex === 0 &&
				// `preserveScrollPosition` option name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				(options.preserveScrollPositionOnPrependItems || options.preserveScrollPosition)

			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff

			layoutUpdate = this.layout.getLayoutUpdateForItemsDiff({
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			}, {
				prependedItemsCount,
				appendedItemsCount
			}, {
				itemsCount: newItems.length,
				columnsCount: this.getActualColumnsCount(),
				shouldRestoreScrollPosition
			})

			if (prependedItemsCount > 0) {
				log('Prepend', prependedItemsCount, 'items')

				itemHeights = new Array(prependedItemsCount).concat(itemHeights)

				if (itemStates) {
					itemStates = new Array(prependedItemsCount).concat(itemStates)
				}

				// Restore scroll position after prepending items (if requested).
				if (shouldRestoreScrollPosition) {
					log('Will restore scroll position')
					this.listHeightChangeWatcher.snapshot({
						previousItems,
						newItems,
						prependedItemsCount
					})
					// "Seamless prepend" scenario doesn't result in a re-layout,
					// so if any "non measured item" is currently pending,
					// it doesn't get reset and will be handled after `state` is updated.
					if (this.firstNonMeasuredItemIndex !== undefined) {
						this.firstNonMeasuredItemIndex += prependedItemsCount
					}
				} else {
					log('Reset layout')
					// Reset layout because none of the prepended items have been measured.
					layoutUpdate = this.layout.getInitialLayoutValues({
						itemsCount: newItems.length,
						columnsCount: this.getActualColumnsCount()
					})
					// Unschedule a potentially scheduled layout update
					// after measuring a previously non-measured item
					// because the list will be re-layout anyway
					// due to the new items being set.
					this.firstNonMeasuredItemIndex = undefined
				}
			}

			if (appendedItemsCount > 0) {
				log('Append', appendedItemsCount, 'items')
				itemHeights = itemHeights.concat(new Array(appendedItemsCount))
				if (itemStates) {
					itemStates = itemStates.concat(new Array(appendedItemsCount))
				}
			}

			itemsUpdateInfo = {
				prepend: prependedItemsCount > 0,
				append: appendedItemsCount > 0
			}
		} else {
			log('Items have changed, and', (itemsDiff ? 'a re-layout from scratch has been requested.' : 'it\'s not a simple append and/or prepend.'), 'Rerender the entire list from scratch.')
			log('Previous items', previousItems)
			log('New items', newItems)

			// Reset item heights and item states.
			itemHeights = new Array(newItems.length)
			itemStates = new Array(newItems.length)

			layoutUpdate = this.layout.getInitialLayoutValues({
				itemsCount: newItems.length,
				columnsCount: this.getActualColumnsCount()
			})

			// Unschedule a potentially scheduled layout update
			// after measuring a previously non-measured item
			// because the list will be re-layout from scratch
			// due to the new items being set.
			this.firstNonMeasuredItemIndex = undefined

			// Also reset any potential pending scroll position restoration.
			// For example, imagine a developer first called `.setItems(incrementalItemsUpdate)`
			// and then called `.setItems(differentItems)` and there was no state update
			// in between those two calls. This could happen because state updates aren't
			// required to be "synchronous". On other words, calling `this.setState()`
			// doesn't necessarily mean that the state is applied immediately.
			// Imagine also that such "delayed" state updates could be batched,
			// like they do in React inside event handlers (though that doesn't apply to this case):
			// https://github.com/facebook/react/issues/10231#issuecomment-316644950
			// If `this.listHeightChangeWatcher` wasn't reset on `.setItems(differentItems)`
			// and if the second `this.setState()` call overwrites the first one
			// then it would attempt to restore scroll position in a situation when
			// it should no longer do that. Hence the reset here.
			this.listHeightChangeWatcher.reset()

			itemsUpdateInfo = {
				replace: true
			}
		}

		log('~ Update state ~')

		// const layoutValuesAfterUpdate = {
		// 	...this.getState(),
		// 	...layoutUpdate
		// }

		// `layoutUpdate` is equivalent to `layoutValuesAfterUpdate` because
		// `layoutUpdate` contains all the relevant properties.
		log('First shown item index', layoutUpdate.firstShownItemIndex)
		log('Last shown item index', layoutUpdate.lastShownItemIndex)
		log('Before items height', layoutUpdate.beforeItemsHeight)
		log('After items height (actual or estimated)', layoutUpdate.afterItemsHeight)

		// Optionally preload items to be rendered.
		//
		// `layoutUpdate` is equivalent to `layoutValuesAfterUpdate` because
		// `layoutUpdate` contains all the relevant properties.
		//
		this.onBeforeShowItems(
			newItems,
			itemHeights,
			layoutUpdate.firstShownItemIndex,
			layoutUpdate.lastShownItemIndex
		)

		// `this.newItemsWillBeRendered` signals that new `items` are being rendered,
		// and that `VirtualScroller` should temporarily stop all other updates.
		//
		// `this.newItemsWillBeRendered` is cleared in `didUpdateState()`.
		//
		// The values in `this.newItemsWillBeRendered` are used, for example,
		// in `.onResize()` handler in order to not break state consistency when
		// state updates are "asynchronous" (delayed) and there's a window resize event
		// in between calling `setState()` below and that call actually being applied.
		//
		this.newItemsWillBeRendered = {
			...itemsUpdateInfo,
			count: newItems.length,
			// `layoutUpdate` now contains all layout-related properties, even if those that
			// didn't change. So `firstShownItemIndex` is always in `this.newItemsWillBeRendered`.
			layout: layoutUpdate
		}

		// `layoutUpdate` now contains all layout-related properties, even if those that
		// didn't change. So this part is no longer relevant.
		//
		// // If `firstShownItemIndex` is gonna be modified as a result of setting new items
		// // then keep that "new" `firstShownItemIndex` in order for it to be used by
		// // `onResize()` handler when it calculates "new" `firstShownItemIndex`
		// // based on the new columns count (corresponding to the new window width).
		// if (layoutUpdate.firstShownItemIndex !== undefined) {
		// 	this.newItemsWillBeRendered = {
		// 		...this.newItemsWillBeRendered,
		// 		firstShownItemIndex: layoutUpdate.firstShownItemIndex
		// 	}
		// }

		// Update `VirtualScroller` state.
		//
		// This state update should overwrite all the `state` properties
		// that are also updated in the "on scroll" handler (`getShownItemIndexes()`):
		//
		// * `firstShownItemIndex`
		// * `lastShownItemIndex`
		// * `beforeItemsHeight`
		// * `afterItemsHeight`
		//
		// That's because this `setState()` update has a higher priority
		// than that of the "on scroll" handler, so it should overwrite
		// any potential state changes dispatched by the "on scroll" handler.
		//
		const newState = {
			// ...customState,
			...layoutUpdate,
			items: newItems,
			itemStates,
			itemHeights
		}

		// Introduced `shouldIncludeBeforeResizeValuesInState()` getter just to prevent
		// cluttering `state` with `beforeResize: undefined` property if `beforeResize`
		// hasn't ever been set in `state` previously.
		if (this.beforeResize.shouldIncludeBeforeResizeValuesInState()) {
			if (this.shouldDiscardBeforeResizeItemHeights()) {
				// Reset "before resize" item heights because now there're new items prepended
				// with unknown heights, or completely new items with unknown heights, so
				// `beforeItemsHeight` value won't be preserved anyway.
				newState.beforeResize = undefined
			}
			else {
				// Overwrite `beforeResize` property in `state` even if it wasn't modified
				// because state updates could be "asynchronous" and in that case there could be
				// some previous `setState()` call from some previous `setItems()` call that
				// hasn't yet been applied, and that previous call might have scheduled setting
				// `state.beforeResize` property to `undefined` in order to reset it, but this
				// next `setState()` call might not require resetting `state.beforeResize` property
				// so it should undo resetting it by simply overwriting it with its normal value.
				newState.beforeResize = this.resetLayoutAfterResize
					? this.resetLayoutAfterResize.stateUpdate.beforeResize
					: this.getState().beforeResize
			}
		}

		// `newState` should also overwrite all `state` properties that're updated in `onResize()`
		// because `setItems()`'s state updates always overwrite `onResize()`'s state updates.
		// (The least-priority ones are `onScroll()` state updates, but those're simply skipped
		// if there's a pending `setItems()` or `onResize()` update).
		//
		// `state` property exceptions:
		//
		// `verticalSpacing` property is not updated here because it's fine setting it to
		// `undefined` in `onResize()` — it will simply be re-measured after the component re-renders.
		//
		// `columnsCount` property is also not updated here because by definition it's only
		// updated in `onResize()`.

		// Render.
		this.setState(newState)
	}

	getItemsDiff(previousItems, newItems) {
		return getItemsDiff(previousItems, newItems, this.isItemEqual)
	}

	// Returns whether "before resize" item heights should be discarded
	// as a result of calling `setItems()` with a new set of items
	// when an asynchronous `setState()` call inside that function
	// hasn't been applied yet.
	//
	// If `setItems()` update was an "incremental" one and no items
	// have been prepended, then `firstShownItemIndex` is preserved,
	// and all items' heights before it should be kept in order to
	// preserve the top offset of the first shown item so that there's
	// no "content jumping".
	//
	// If `setItems()` update was an "incremental" one but there're
	// some prepended items, then it means that now there're new items
	// with unknown heights at the top, so the top offset of the first
	// shown item won't be preserved because there're no "before resize"
	// heights of those items.
	//
	// If `setItems()` update was not an "incremental" one, then don't
	// attempt to restore previous item heights after a potential window
	// width change because all item heights have been reset.
	//
	shouldDiscardBeforeResizeItemHeights() {
		if (this.newItemsWillBeRendered) {
			const { prepend, replace } = this.newItemsWillBeRendered
			return prepend || replace
		}
	}

	onResize() {
		// Reset "previously calculated layout".
		//
		// The "previously calculated layout" feature is not currently used.
		//
		// The current layout snapshot could be stored as a "previously calculated layout" variable
		// so that it could theoretically be used when calculating new layout incrementally
		// rather than from scratch, which would be an optimization.
		//
		this.previouslyCalculatedLayout = undefined

		// Cancel any potential scheduled scroll position restoration.
		this.listHeightChangeWatcher.reset()

		// Get the most recent items count.
		// If there're a "pending" `setItems()` call then use the items count from that call
		// instead of using the count of currently shown `items` from `state`.
		// A `setItems()` call is "pending" when `setState()` operation is "asynchronous", that is
		// when `setState()` calls aren't applied immediately, like in React.
		const itemsCount = this.newItemsWillBeRendered
			? this.newItemsWillBeRendered.count
			: this.getState().itemHeights.length

		// If layout values have been calculated as a result of a "pending" `setItems()` call,
		// then don't discard those new layout values and use them instead of the ones from `state`.
		//
		// A `setItems()` call is "pending" when `setState()` operation is "asynchronous", that is
		// when `setState()` calls aren't applied immediately, like in React.
		//
		const layout = this.newItemsWillBeRendered
			? this.newItemsWillBeRendered.layout
			: this.getState()

		// Update `VirtualScroller` state.
		const newState = {
			// This state update should also overwrite all the `state` properties
			// that are also updated in the "on scroll" handler (`getShownItemIndexes()`):
			//
			// * `firstShownItemIndex`
			// * `lastShownItemIndex`
			// * `beforeItemsHeight`
			// * `afterItemsHeight`
			//
			// That's because this `setState()` update has a higher priority
			// than that of the "on scroll" handler, so it should overwrite
			// any potential state changes dispatched by the "on scroll" handler.
			//
			// All these properties might have changed, but they're not
			// recalculated here becase they'll be recalculated after
			// this new state is applied (rendered).
			//
			firstShownItemIndex: layout.firstShownItemIndex,
			lastShownItemIndex: layout.lastShownItemIndex,
			beforeItemsHeight: layout.beforeItemsHeight,
			afterItemsHeight: layout.afterItemsHeight,

			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			itemHeights: new Array(itemsCount),

			columnsCount: this.getActualColumnsCountForState(),

			// Re-measure vertical spacing after render because new CSS styles
			// might be applied for the new window width.
			verticalSpacing: undefined
		}

		const { firstShownItemIndex, lastShownItemIndex } = layout

		// Get the `columnsCount` for the new window width.
		const newColumnsCount = this.getActualColumnsCount()

		// Re-calculate `firstShownItemIndex` and `lastShownItemIndex`
		// based on the new `columnsCount` so that the whole row is visible.
		const newFirstShownItemIndex = Math.floor(firstShownItemIndex / newColumnsCount) * newColumnsCount
		const newLastShownItemIndex = Math.ceil((lastShownItemIndex + 1) / newColumnsCount) * newColumnsCount - 1

		// Potentially update `firstShownItemIndex` if it needs to be adjusted in order to
		// correspond to the new `columnsCount`.
		if (newFirstShownItemIndex !== firstShownItemIndex) {
			log('Columns Count changed from', this.getState().columnsCount || 1, 'to', newColumnsCount)
			log('First Shown Item Index needs to change from', firstShownItemIndex, 'to', newFirstShownItemIndex)
		}

		// Always rewrite `firstShownItemIndex` and `lastShownItemIndex`
		// as part of the `state` update, even if it hasn't been modified.
		//
		// The reason is that there could be two subsequent `onResize()` calls:
		// the first one could be user resizing the window to half of its width,
		// resulting in an "asynchronous" `setState()` call, and then, before that
		// `setState()` call is applied, a second resize event happens when the user
		// has resized the window back to its original width, meaning that the
		// `columnsCount` is back to its original value.
		// In that case, the final `newFirstShownItemIndex` will be equal to the
		// original `firstShownItemIndex` that was in `state` before the user
		// has started resizing the window, so, in the end, `state.firstShownItemIndex`
		// property wouldn't have changed, but it still has to be part of the final
		// state update in order to overwrite the previous update of `firstShownItemIndex`
		// property that has been scheduled to be applied in state after the first resize
		// happened.
		//
		newState.firstShownItemIndex = newFirstShownItemIndex
		newState.lastShownItemIndex = newLastShownItemIndex

		const verticalSpacing = this.getVerticalSpacing()
		const columnsCount = this.getColumnsCount()

		// `beforeResize` is always overwritten in `state` here.
		// (once it has started being tracked in `state`)
		if (this.shouldDiscardBeforeResizeItemHeights() || newFirstShownItemIndex === 0) {
			if (this.beforeResize.shouldIncludeBeforeResizeValuesInState()) {
				newState.beforeResize = undefined
			}
		}
		// Snapshot "before resize" values in order to preserve the currently
		// shown items' vertical position on screen so that there's no "content jumping".
		else {
			// Keep "before resize" values in order to preserve the currently
			// shown items' vertical position on screen so that there's no
			// "content jumping". These "before resize" values will be discarded
			// when (if) the user scrolls back to the top of the list.
			newState.beforeResize = {
				verticalSpacing,
				columnsCount,
				itemHeights: this.beforeResize.snapshotBeforeResizeItemHeights({
					firstShownItemIndex,
					newFirstShownItemIndex,
					newColumnsCount
				})
			}
		}

		// `this.resetLayoutAfterResize` tells `VirtualScroller` that it should
		// temporarily stop other updates (like "on scroll" updates) and wait
		// for the new `state` to be applied, after which the `didUpdateState()`
		// function will clear this flag and perform a re-layout.
		this.resetLayoutAfterResize = {
			stateUpdate: newState
		}

		// Rerender.
		this.setState(newState)
	}
}

const SLOW_LAYOUT_DURATION = 15 // in milliseconds.