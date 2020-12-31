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

import DOMRenderingEngine from './DOM/RenderingEngine'
import WaitForStylesToLoad from './DOM/WaitForStylesToLoad'

import Layout, { LAYOUT_REASON } from './Layout'
import Resize from './Resize'
import Scroll from './Scroll'
import RestoreScroll from './RestoreScroll'
import ItemHeights from './ItemHeights'
import getItemsDiff from './getItemsDiff'
import getVerticalSpacing from './getVerticalSpacing'
// import getItemCoordinates from './getItemCoordinates'

import log, { isDebug, reportError } from './utility/debug'
import shallowEqual from './utility/shallowEqual'

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
			preserveScrollPositionOfTheBottomOfTheListOnMount,
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
			state,
			renderingEngine
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
		if (!renderingEngine) {
			renderingEngine = DOMRenderingEngine
		}

		this.screen = renderingEngine.createScreen()
		this.scrollableContainer = renderingEngine.createScrollableContainer(scrollableContainer)

		// if (margin === undefined) {
		// 	// Renders items which are outside of the screen by this "margin".
		// 	// Is the screen height by default: seems to be the optimal value
		// 	// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
		// 	margin = this.scrollableContainer ? this.scrollableContainer.getHeight() : 0
		// }

		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (tbody) {
			if (renderingEngine.name !== 'DOM') {
				throw new Error('`tbody` option is only supported for DOM rendering engine')
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

		this.onStateChange = onStateChange

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

		this.itemHeights = new ItemHeights(
			this.screen,
			this.getContainerElement,
			(i) => this.getState().itemHeights[i],
			(i, height) => this.getState().itemHeights[i] = height
		)

		this.layout = new Layout({
			bypass,
			estimatedItemHeight,
			measureItemsBatchSize: measureItemsBatchSize === undefined ? 50 : measureItemsBatchSize,
			getVerticalSpacing: () => this.getVerticalSpacing(),
			getColumnsCount: () => this.getColumnsCount(),
			getItemHeight: (i) => this.getState().itemHeights[i],
			getAverageItemHeight: () => this.itemHeights.getAverage()
		})

		this.resize = new Resize({
			bypass,
			scrollableContainer: this.scrollableContainer,
			getContainerElement: this.getContainerElement,
			updateLayout: ({ reason }) => this.onUpdateShownItemIndexes({ reason }),
			resetStateAndLayout: () => {
				// Reset item heights, because if scrollable container's width (or height)
				// has changed, then the list width (or height) most likely also has changed,
				// and also some CSS `@media()` rules might have been added or removed.
				// So re-render the list entirely.
				log('~ Scrollable container size changed, re-measure item heights. ~')
				this.redoLayoutReason = LAYOUT_REASON.RESIZE
				// `this.layoutResetPending` flag will be cleared in `didUpdateState()`.
				this.layoutResetPending = true
				log('Reset state')
				// Calling `this.setState(state)` will trigger `didUpdateState()`.
				// `didUpdateState()` will detect `this.redoLayoutReason`.
				this.setState(this.getInitialLayoutState(this.newItemsPending || this.getState().items))
			}
		})

		if (preserveScrollPositionAtBottomOnMount) {
			console.warn('[virtual-scroller] `preserveScrollPositionAtBottomOnMount` option/property has been renamed to `preserveScrollPositionOfTheBottomOfTheListOnMount`')
		}

		this.preserveScrollPositionOfTheBottomOfTheListOnMount = preserveScrollPositionOfTheBottomOfTheListOnMount || preserveScrollPositionAtBottomOnMount

		this.scroll = new Scroll({
			bypass: this.bypass,
			scrollableContainer: this.scrollableContainer,
			updateLayout: ({ reason }) => this.onUpdateShownItemIndexes({ reason }),
			initialScrollPosition,
			onScrollPositionChange,
			isImmediateLayoutScheduled: () => this.layoutTimer,
			hasNonRenderedItemsAtTheTop: () => this.getState().firstShownItemIndex > 0,
			hasNonRenderedItemsAtTheBottom: () => this.getState().lastShownItemIndex < this.getItemsCount() - 1,
			getLatestLayoutVisibleAreaIncludingMargins: () => this.latestLayoutVisibleAreaIncludingMargins,
			preserveScrollPositionOfTheBottomOfTheListOnMount: this.preserveScrollPositionOfTheBottomOfTheListOnMount
		})

		this.restoreScroll = new RestoreScroll({
			screen: this.screen,
			getContainerElement: this.getContainerElement
		})

		this.waitForStylesToLoad = new WaitForStylesToLoad({
			updateLayout: ({ reason }) => this.onUpdateShownItemIndexes({ reason }),
			getListTopOffsetInsideScrollableContainer: this.getListTopOffsetInsideScrollableContainer
		})

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
		log('Initial state (autogenerated)', state)
		log('First shown item index', state.firstShownItemIndex)
		log('Last shown item index', state.lastShownItemIndex)
		return state
	}

	getInitialLayoutValues({ itemsCount, bypass }) {
		return this.layout.getInitialLayoutValues({
			bypass,
			itemsCount,
			visibleAreaHeightIncludingMargins: this.scrollableContainer && (2 * this.getMargin() + this.scrollableContainer.getHeight())
		})
	}

	getInitialLayoutState(items) {
		const itemsCount = items.length
		const {
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		} = this.getInitialLayoutValues({
			itemsCount,
			bypass: this.preserveScrollPositionOfTheBottomOfTheListOnMount
		})
		const itemHeights = new Array(itemsCount)
		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			items,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)
		// This "initial" state object must include all possible state properties
		// because `this.setState()` gets called with this state on window resize,
		// when `VirtualScroller` gets reset.
		// Item states aren't included here because the state of all items should be
		// preserved on window resize.
		return {
			itemHeights,
			columnsCount: this._getColumnsCount ? this._getColumnsCount(this.scrollableContainer) : undefined,
			verticalSpacing: undefined,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		}
	}

	getVerticalSpacing() {
		return this.getState() && this.getState().verticalSpacing || 0
	}

	getColumnsCount() {
		return this.getState() && this.getState().columnsCount || 1
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
		this.onRenderedNewLayout()
		this.resize.listen()
		this.scroll.listen()
		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			addTbodyStyles(this.getContainerElement())
		}
		if (this.preserveScrollPositionOfTheBottomOfTheListOnMount) {
			// In this case, all items are shown, so there's no need to call
			// `this.onUpdateShownItemIndexes()` after the initial render.
		} else {
			this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MOUNT })
		}
	}

	onRenderedNewLayout() {
		// Update item vertical spacing.
		this.measureVerticalSpacing()
		// Measure "newly shown" item heights.
		this.itemHeights.measureNonPreviouslyMeasuredItemHeights(
			this.getState().firstShownItemIndex,
			this.getState().lastShownItemIndex
		)
		// Update `<tbody/>` `padding`.
		// (`<tbody/>` is different in a way that it can't have `margin`, only `padding`).
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			setTbodyPadding(
				this.getContainerElement(),
				this.getState().beforeItemsHeight,
				this.getState().afterItemsHeight
			)
		}
	}

	getVisibleAreaBoundsIncludingMargins() {
		const visibleArea = this.scroll.getVisibleAreaBounds()
		visibleArea.top -= this.getMargin()
		visibleArea.bottom += this.getMargin()
		return visibleArea
	}

	/**
	 * Returns the list's top offset relative to the scrollable container's top edge.
	 * @return {number}
	 */
	getListTopOffsetInsideScrollableContainer = () => {
		const listTopOffset = this.scrollableContainer.getTopOffset(this.getContainerElement())
		this.waitForStylesToLoad.onGotListTopOffset(listTopOffset)
		return listTopOffset
	}

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
		this.resize.stop()
		this.scroll.stop()
		this.waitForStylesToLoad.stop()
		if (this.layoutTimer) {
			clearTimeout(this.layoutTimer)
			this.layoutTimer = undefined
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
		this.newItemsPending = undefined
		this.layoutResetPending = undefined
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
					if (this.restoreScroll.shouldRestoreScrollAfterRender()) {
						layoutNeedsReCalculating = false
						log('~ Restore Scroll Position ~')
						const scrollByY = this.restoreScroll.getScrollDifference()
						if (scrollByY) {
							log('Scroll down by', scrollByY)
							this.scroll.scrollByY(scrollByY)
						} else {
							log('Scroll position hasn\'t changed')
						}
					}
				}
			} else {
				this.itemHeights.reset()
				this.itemHeights.initialize(this.getState().itemHeights)
			}
			if (layoutNeedsReCalculating) {
				redoLayoutReason = LAYOUT_REASON.ITEMS_CHANGED
			}
		}
		// Call `.onRendered()` if shown items configuration changed.
		if (newState.firstShownItemIndex !== prevState.firstShownItemIndex ||
			newState.lastShownItemIndex !== prevState.lastShownItemIndex ||
			newState.items !== prevState.items) {
			this.onRenderedNewLayout()
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

	measureVerticalSpacing() {
		if (this.getState().verticalSpacing === undefined) {
			log('~ Measure item vertical spacing ~')
			const verticalSpacing = getVerticalSpacing({
				container: this.getContainerElement(),
				screen: this.screen
			})
			if (verticalSpacing === undefined) {
				log('Not enough items rendered to measure vertical spacing')
			} else {
				log('Item vertical spacing', verticalSpacing)
				this.setState({ verticalSpacing })
			}
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
	 * Validates the heights of items to be hidden on next render.
	 * For example, a user could click a "Show more" button,
	 * or an "Expand YouTube video" button, which would result
	 * in the actual height of the list item being different
	 * from what has been initially measured in `this.itemHeights[i]`,
	 * if the developer didn't call `.onItemStateChange()` and `.onItemHeightChange(i)`.
	 */
	validateWillBeHiddenItemHeights(firstShownItemIndex, lastShownItemIndex) {
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
		const visibleAreaIncludingMargins = this.getVisibleAreaBoundsIncludingMargins()
		this.latestLayoutVisibleAreaIncludingMargins = visibleAreaIncludingMargins
		const listTopOffsetInsideScrollableContainer = this.getListTopOffsetInsideScrollableContainer()
		// Get shown item indexes.
		let {
			firstShownItemIndex,
			lastShownItemIndex,
			redoLayoutAfterMeasuringItemHeights
		} = this.layout.getShownItemIndexes({
			listHeight: this.screen.getElementHeight(this.getContainerElement()),
			itemsCount: this.getItemsCount(),
			visibleAreaIncludingMargins,
			listTopOffsetInsideScrollableContainer
		})
		// If scroll position is scheduled to be restored after render,
		// then the "anchor" item must be rendered, and all of the prepended
		// items before it, all in a single pass. This way, all of the
		// prepended items' heights could be measured right after the render
		// has finished, and the scroll position can then be immediately restored.
		if (this.restoreScroll.shouldRestoreScrollAfterRender()) {
			if (lastShownItemIndex < this.restoreScroll.getAnchorItemIndex()) {
				lastShownItemIndex = this.restoreScroll.getAnchorItemIndex()
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
		// Measure "before" items height.
		const beforeItemsHeight = this.layout.getBeforeItemsHeight(
			firstShownItemIndex,
			lastShownItemIndex
		)
		// Measure "after" items height.
		const afterItemsHeight = this.layout.getAfterItemsHeight(
			firstShownItemIndex,
			lastShownItemIndex,
			this.getItemsCount()
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
		this.validateWillBeHiddenItemHeights(firstShownItemIndex, lastShownItemIndex)
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

	onUpdateShownItemIndexes = ({ reason }) => {
		// If there're no items then there's no need to re-layout anything.
		if (this.getItemsCount() === 0) {
			return
		}
		// Cancel a "re-layout when user stops scrolling" timer.
		this.scroll.onLayout()
		// Cancel a re-layout that is scheduled to run at the next "frame",
		// because a re-layout will be performed right now.
		if (this.layoutTimer) {
			clearTimeout(this.layoutTimer)
			this.layoutTimer = undefined
		}
		// Perform a re-layout.
		log(`~ Calculate Layout (on ${reason}) ~`)
		this.updateShownItemIndexes()
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
		let {
			itemStates,
			itemHeights
		} = this.getState()
		log('~ Update items ~')
		let layout
		const itemsDiff = this.getItemsDiff(previousItems, newItems)
		// If it's an "incremental" update.
		if (itemsDiff && !this.layoutResetPending) {
			const {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			} = this.getState()
			layout = {
				firstShownItemIndex,
				lastShownItemIndex,
				beforeItemsHeight,
				afterItemsHeight
			}
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
			this.layout.updateLayoutForItemsDiff(layout, itemsDiff, {
				itemsCount: newItems.length
			})
			if (prependedItemsCount > 0) {
				// `preserveScrollPosition` option name is deprecated,
				// use `preserveScrollPositionOnPrependItems` instead.
				if (options.preserveScrollPositionOnPrependItems || options.preserveScrollPosition) {
					if (this.getState().firstShownItemIndex === 0) {
						this.restoreScroll.captureScroll({
							previousItems,
							newItems,
							prependedItemsCount
						})
						this.layout.showItemsFromTheStart(layout)
					}
				}
			}
		} else {
			log('Items have changed, and', (itemsDiff ? 'a re-layout from scratch has been requested.' : 'it\'s not a simple append and/or prepend.'), 'Rerender the entire list from scratch.')
			log('Previous items', previousItems)
			log('New items', newItems)
			itemHeights = new Array(newItems.length)
			itemStates = new Array(newItems.length)
			layout = this.getInitialLayoutValues({
				itemsCount: newItems.length
			})
		}
		log('~ Update state ~')
		log('First shown item index', layout.firstShownItemIndex)
		log('Last shown item index', layout.lastShownItemIndex)
		log('Before items height', layout.beforeItemsHeight)
		log('After items height (actual or estimated)', layout.afterItemsHeight)
		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			newItems,
			itemHeights,
			layout.firstShownItemIndex,
			layout.lastShownItemIndex
		)
		// `this.newItemsPending` will be cleared in `didUpdateState()`.
		this.newItemsPending = newItems
		// Update state.
		this.setState({
			// ...customState,
			...layout,
			items: newItems,
			itemStates,
			itemHeights
		})
	}

	getItemsDiff(previousItems, newItems) {
		return getItemsDiff(previousItems, newItems, this.isItemEqual)
	}
}