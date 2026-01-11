import DOMEngine from './DOM/Engine.js'

import Layout, { LAYOUT_REASON } from './Layout.js'
import { DEFAULT_ITEM_HEIGHT } from './Layout.defaults.js'
import ScrollableContainerResizeHandler from './ScrollableContainerResizeHandler.js'
import BeforeResize from './BeforeResize.js'
import Scroll from './Scroll.js'
import ListHeightMeasurement from './ListHeightMeasurement.js'
import ItemHeights from './ItemHeights.js'

import log, { warn } from './utility/debug.js'

import createStateHelpers from './VirtualScroller.state.js'
import createVerticalSpacingHelpers from './VirtualScroller.verticalSpacing.js'
import createColumnsHelpers from './VirtualScroller.columns.js'
import createLayoutHelpers from './VirtualScroller.layout.js'
import createOnRenderHelpers from './VirtualScroller.onRender.js'
import createScrollableContainerResizeHelpers from './VirtualScroller.onContainerResize.js'
import createItemsHelpers from './VirtualScroller.items.js'

/**
 * @param  {function} getItemsContainerElement — Returns the container DOM `Element` (or `null`).
 * @param  {any[]} items — The list of items.
 * @param  {Object} [options] — See README.md.
 * @return {VirtualScroller}
 */
export default function VirtualScrollerConstructor(
	getItemsContainerElement,
	items,
	options = {}
) {
	const {
		bypass,
		render,
		state,
		getInitialItemState = () => {},
		onStateChange,
		initialScrollPosition,
		onScrollPositionChange,
		// `scrollableContainer` option is deprecated.
		// Use `getScrollableContainer()` option instead.
		scrollableContainer,
		measureItemsBatchSize = 50,
		getColumnsCount,
		getItemId,
		// `estimatedItemHeight` is deprecated, use `getEstimatedItemHeight()` instead.
		estimatedItemHeight,
		getEstimatedVisibleItemRowsCount,
		getEstimatedInterItemVerticalSpacing,
		onItemInitialRender,
		// `onItemFirstRender(i)` is deprecated, use `onItemInitialRender(item)` instead.
		onItemFirstRender,
		_useTimeoutInRenderLoop,
		_waitForScrollingToStop,
		engine
	} = options

	let {
		getEstimatedItemHeight,
		getScrollableContainer
	} = options

	log('~ Initialize ~')

	// Could support non-DOM rendering engines.
	// For example, React Native, `<canvas/>`, etc.
	this.engine = engine || DOMEngine

	if (!getEstimatedItemHeight && typeof estimatedItemHeight === 'number') {
		getEstimatedItemHeight = () => estimatedItemHeight
	}

	// `scrollableContainer` option is deprecated.
	// Use `getScrollableContainer()` option instead.
	if (!getScrollableContainer && scrollableContainer) {
		getScrollableContainer = () => scrollableContainer
	}

	// Sometimes, when `new VirtualScroller()` "core" instance is created,
	// `getItemsContainerElement()` function might not yet be ready to return the "container" DOM Element.
	// For example, because the "container" DOM Element not rendered yet.
	// That's the reason why it's a getter function rather than a simple variable.
	//
	// As an example, in React `<VirtualScroller/>` component, a "core" `VirtualScroller`
	// instance is created in the React component's `constructor()`, and at that time
	// the "container" DOM Element has not been rendered yet.
	// The "container" DOM Element is only guaranteed to have been rendered
	// by the time `useEffect()` callback function is called, but at the same time `useEffect()`
	// is only executed on client side and is not executed on server side at all.
	// Still, the code has to work both in a web browser and on the server during the initial
	// "server-side render", i.e. it still must render the list during the initial
	// "server-side render". So `VirtualScroller` can't simply be skipped during server-side render.
	// It has to render something, and that something has to be correct.
	// This means that the "core" `VirtualScroller` should at least correctly compute the state
	// regardless of whether the `itemsContainerElement` exists or not.
	//
	this.getItemsContainerElement = () => {
		const element = getItemsContainerElement()
		if (element === null) {
			throw new Error('[virtual-scroller] Items container element is `null`')
		}
		return element
	}

	// if (prerenderMargin === undefined) {
	// 	// Renders items which are outside of the screen by this "prerender margin".
	// 	// Is the screen height by default: seems to be the optimal value
	// 	// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
	// 	prerenderMargin = this.scrollableContainer ? this.scrollableContainer.getHeight() : 0
	// }

	if (options.getState || options.setState) {
		throw new Error('[virtual-scroller] `getState`/`setState` options usage has changed in the new version. See the readme for more details.')
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
	this._bypass = bypass
	// this.bypassBatchSize = bypassBatchSize || 10

	// Using `setTimeout()` in render loop is a workaround
	// for avoiding a React error message:
	// "Maximum update depth exceeded.
	//  This can happen when a component repeatedly calls
	//  `.setState()` inside `componentWillUpdate()` or `componentDidUpdate()`.
	//  React limits the number of nested updates to prevent infinite loops."
	this._useTimeoutInRenderLoop = _useTimeoutInRenderLoop

	// `_getItemId()` function is used in `_getItemIndexByItemOrIndex()` function.
	this._getItemId = getItemId

	if (getItemId) {
		this.isItemEqual = (a, b) => getItemId(a) === getItemId(b)
	} else {
		this.isItemEqual = (a, b) => a === b
	}

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
			// passed to `<VirtualScroller/>` in React due to `updateState()` not being
			// instanteneous: when new `items` are passed to `<VirtualScroller/>`,
			// `VirtualScroller.updateState({ items })` is called, and if `onItemFirstRender(i)`
			// is called after the aforementioned `updateState()` is called but before it finishes,
			// `i` would point to an index in "previous" `items` while the application
			// would assume that `i` points to an index in the "new" `items`,
			// resulting in an incorrect item being assumed by the application
			// or even in an "array index out of bounds" error.
			if (i >= 0) {
				onItemFirstRender(i)
			}
		}
	}

	// If initial `state` is passed then use `items` from `state`
	// instead of the `items` argument.
	if (state) {
		items = state.items
	}

	log('Items count', items.length)
	if (getEstimatedItemHeight) {
		log('Estimated item height', getEstimatedItemHeight())
	}

	createStateHelpers.call(this, { state, getInitialItemState, onStateChange, render, items })

	createVerticalSpacingHelpers.call(this, { getEstimatedInterItemVerticalSpacing })
	createColumnsHelpers.call(this, { getColumnsCount })

	createLayoutHelpers.call(this)
	createOnRenderHelpers.call(this)
	createScrollableContainerResizeHelpers.call(this)
	createItemsHelpers.call(this)

	createHelpers.call(this, {
		getScrollableContainer,
		getEstimatedItemHeight,
		getEstimatedVisibleItemRowsCount,
		measureItemsBatchSize,
		initialScrollPosition,
		onScrollPositionChange,
		waitForScrollingToStop: _waitForScrollingToStop
	})

	if (state) {
		// Initialize `ItemHeights` from previously measured `state.itemHeights`.
		this.itemHeights.readItemHeightsFromState(state)

		// Initialize some `BeforeResize` internal flags from a previously saved state.
		this.beforeResize.initializeFromState(state)
	}
}

function createHelpers({
	getScrollableContainer,
	getEstimatedItemHeight,
	getEstimatedVisibleItemRowsCount,
	measureItemsBatchSize,
	initialScrollPosition,
	onScrollPositionChange,
	waitForScrollingToStop
}) {
	this.itemsContainer = this.engine.createItemsContainer(
		this.getItemsContainerElement
	)

	this.isItemsContainerElementTableBody = () => {
		return this.engine === DOMEngine &&
			this.getItemsContainerElement().tagName === 'TBODY'
	}

	this.isInBypassMode = () => this._bypass

	this.scrollableContainer = this.engine.createScrollableContainer(
		getScrollableContainer,
		this.getItemsContainerElement
	)

	// Create `ItemHeights` instance.
	this.itemHeights = new ItemHeights({
		container: this.itemsContainer,
		getItemHeight: (i) => this.getState().itemHeights[i],
		setItemHeight: (i, height) => this.getState().itemHeights[i] = height
	})

	this.getAverageItemHeight = () => {
		const averageItemHeight = this.itemHeights.getAverageItemHeight()
		if (typeof averageItemHeight === 'number') {
			return averageItemHeight
		}
		return this.getEstimatedItemHeight()
	}

	this.getEstimatedItemHeight = () => {
		if (getEstimatedItemHeight) {
			const estimatedItemHeight = getEstimatedItemHeight()
			if (typeof estimatedItemHeight === 'number') {
				return estimatedItemHeight
			}
			throw new Error('[virtual-scroller] `getEstimatedItemHeight()` must return a number')
		}
		// `DEFAULT_ITEM_HEIGHT` will be used in server-side render
		// unless `getEstimatedItemHeight()` parameter is specified.
		return DEFAULT_ITEM_HEIGHT
	}

	this.layout = new Layout({
		isInBypassMode: this.isInBypassMode,
		getEstimatedVisibleItemRowsCountForInitialRender: getEstimatedVisibleItemRowsCount,
		measureItemsBatchSize,
		getPrerenderMargin: () => this.getPrerenderMargin(),
		getPrerenderMarginRatio: () => this.getPrerenderMarginRatio(),
		getVerticalSpacing: () => this.getVerticalSpacing(),
		getVerticalSpacingBeforeResize: () => this.getVerticalSpacingBeforeResize(),
		getColumnsCount: () => this.getColumnsCount(),
		getColumnsCountBeforeResize: () => this.getState().beforeResize && this.getState().beforeResize.columnsCount,
		getItemHeight: (i) => this.getState().itemHeights[i],
		getItemHeightBeforeResize: (i) => this.getState().beforeResize && this.getState().beforeResize.itemHeights[i],
		getBeforeResizeItemsCount: () => this.getState().beforeResize ? this.getState().beforeResize.itemHeights.length : 0,
		getAverageItemHeight: () => this.getAverageItemHeight(),
		// `this.scrollableContainer` is gonna be `undefined` during server-side rendering.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/30
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

	this.scrollableContainerResizeHandler = new ScrollableContainerResizeHandler({
		isInBypassMode: this.isInBypassMode,
		getWidth: () => this.scrollableContainer.getWidth(),
		getHeight: () => this.scrollableContainer.getHeight(),
		listenForResize: (listener) => this.scrollableContainer.onResize(listener),
		onResizeStart: () => {
			log('~ Scrollable container resize started ~')
			this._isResizing = true
		},
		onResizeStop: () => {
			log('~ Scrollable container resize finished ~')
			this._isResizing = undefined
		},
		onNoChange: () => {
			// There might have been some missed `this.onUpdateShownItemIndexes()` calls
			// due to setting `this._isResizing` flag to `true` during the resize.
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
			this.onContainerResize()
		}
	})

	this.scroll = new Scroll({
		isInBypassMode: this.isInBypassMode,
		scrollableContainer: this.scrollableContainer,
		itemsContainer: this.itemsContainer,
		waitForScrollingToStop,
		onScroll: ({ delayed } = {}) => {
			this.onUpdateShownItemIndexes({
				reason: delayed ? LAYOUT_REASON.STOPPED_SCROLLING : LAYOUT_REASON.SCROLL
			})
		},
		initialScrollPosition,
		onScrollPositionChange,
		isImmediateLayoutScheduled: () => Boolean(this.layoutTimer),
		hasNonRenderedItemsAtTheTop: () => this.getState().firstShownItemIndex > 0,
		hasNonRenderedItemsAtTheBottom: () => this.getState().lastShownItemIndex < this.getItemsCount() - 1,
		getLatestLayoutVisibleArea: () => this.latestLayoutVisibleArea,
		getListTopOffset: this.getListTopOffsetInsideScrollableContainer,
		getPrerenderMargin: () => this.getPrerenderMargin()
	})

	this.listHeightMeasurement = new ListHeightMeasurement({
		itemsContainer: this.itemsContainer,
		getListTopOffset: this.getListTopOffsetInsideScrollableContainer
	})

	if (this.engine.watchListTopOffset) {
		this.listTopOffsetWatcher = this.engine.watchListTopOffset({
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
}