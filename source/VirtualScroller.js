import shallowEqual from './shallowEqual'
import { getOffset, getScrollY, getScreenHeight, getScreenBounds, clearElement } from './DOM'
import ItemHeights from './ItemHeights'
import log, { isDebug } from './log'

const START_FROM_INDEX = 0

export default class VirtualScroller {
	/**
	 * @param  {function} getContainerNode — Returns container DOM `Element`.
	 * @param  {any[]} items — Are only used for getting items count and for comparing "previous" items to "next" items if `.updateItems(newItems)` is called.
	 * @param  {Object} [options] — See README.md.
	 * @return {VirtualScroller}
	 */
	constructor(
		getContainerNode,
		items,
		options = {}
	) {
		const {
			getState,
			setState,
			onStateChange
		} = options
		let {
			// margin,
			estimatedItemHeight,
			// getItemState,
			onLastSeenItemIndexChange,
			state
		} = options

		log('~ Initialize ~')

		// If `state` is passed then use `items` from `state`
		// instead of the `items` argument.
		if (state) {
			items = state.items
		}

		// if (margin === undefined) {
		// 	// Renders items which are outside of the screen by this "margin".
		// 	// Is the screen height by default: seems to be the optimal value
		// 	// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
		// 	margin = typeof window === 'undefined' ? 0 : window.innerHeight
		// }

		this.initialItems = items
		// this.margin = margin

		this.estimatedItemHeight = estimatedItemHeight
		// this.getItemState = getItemState

		if (onLastSeenItemIndexChange) {
			this.onLastSeenItemIndexChange = onLastSeenItemIndexChange
			this.lastSeenItemIndex = -1
		}

		// Remove accidental text nodes from container.
    // Also guards against cases when someone accidentally tries
    // using `VirtualScroller` on a non-empty element.
		if (getContainerNode()) {
			clearElement(getContainerNode())
		}

		if (setState) {
			this.getState = getState
			this.setState = setState
		} else {
			this.getState = () => this.state
			this.setState = (state, callback) => {
				const prevState = this.state
				this.state = {
					...prevState,
					...state
				}
				if (!shallowEqual(this.state, prevState)) {
					if (onStateChange) {
						onStateChange(this.state, prevState)
					}
					if (this.isMounted) {
						this.onUpdate(prevState)
					}
				}
				if (callback) {
					callback()
				}
			}
		}

		if (state) {
			log('Initial state (passed)', state)
		}

		this.setState(state || this.getInitialState())

		this.getContainerNode = getContainerNode
		this.itemHeights = new ItemHeights(getContainerNode, items.length, this.getState)

		log('Items count', items.length)
		// log('Start from index', START_FROM_INDEX)
		if (estimatedItemHeight) {
			log('Estimated item height', estimatedItemHeight)
		}
	}

	/**
	 * Returns the initial state of the `VirtualScroller`.
	 * @param  {object} [customState] — Any additional "custom" state may be stored in `VirtualScroller`'s state. For example, React implementation stores item "refs" as "custom" state.
	 * @return {object}
	 */
	getInitialState(customState) {
		let firstShownItemIndex
		let lastShownItemIndex
		const itemsCount = this.initialItems.length
		// If there're no items then `firstShownItemIndex` stays `undefined`.
		if (itemsCount > 0) {
			firstShownItemIndex = Math.min(START_FROM_INDEX, itemsCount - 1)
			lastShownItemIndex = this.getLastShownItemIndex(firstShownItemIndex, itemsCount)
		}
		// Optionally preload items to be rendered.
		this.onShowItems(firstShownItemIndex, lastShownItemIndex)
		const state = {
			...customState,
			items: this.initialItems,
			itemStates: new Array(itemsCount),
			itemHeights: new Array(itemsCount),
			itemSpacing: undefined,
			beforeItemsHeight: 0,
			afterItemsHeight: 0,
			firstShownItemIndex,
			lastShownItemIndex
		}
		log('Initial state (created)', state)
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		return state
	}

	/**
	 * Returns estimated list item height.
	 * (depends on which items have been previously rendered and measured).
	 * @return {number}
	 */
	getEstimatedItemHeight() {
		return this.itemHeights && this.itemHeights.getAverage() || this.estimatedItemHeight || 0
	}

	getItemSpacing() {
		return this.getState().itemSpacing || 0
	}

	getEstimatedItemsCount(height) {
		if (this.getEstimatedItemHeight()) {
			return Math.ceil((height + this.getItemSpacing()) / (this.getEstimatedItemHeight() + this.getItemSpacing()))
		} else {
			return 1
		}
	}

	getEstimatedItemsCountOnScreen() {
		if (typeof window !== 'undefined') {
			return this.getEstimatedItemsCount(window.innerHeight)
		} else {
			return 1
		}
	}

	getLastShownItemIndex(firstShownItemIndex, itemsCount) {
		return Math.min(
			firstShownItemIndex + (this.getEstimatedItemsCountOnScreen() - 1),
			itemsCount - 1
		)
	}

	getItemsCount() {
		return this.getState().items.length
	}

	getMargin() {
		// Renders items which are outside of the screen by this "margin".
		// Is the screen height by default: seems to be the optimal value
		// for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
		return window.innerHeight
	}

	onShowItems(firstShownItemIndex, lastShownItemIndex) {
		if (this.onLastSeenItemIndexChange) {
			if (lastShownItemIndex > this.lastSeenItemIndex) {
				this.lastSeenItemIndex = lastShownItemIndex
				this.onLastSeenItemIndexChange(this.lastSeenItemIndex)
			}
		}
	}

	onMount() {
		const {
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()
		// If there're any items.
		if (this.getItemsCount() > 0) {
			// Update item heights.
			this.updateItemHeights(
				firstShownItemIndex,
				lastShownItemIndex
			)
		}
		this.isMounted = true
		this.onUpdateShownItemIndexes({ reason: 'on mount' })
		window.addEventListener('scroll', this.onScroll)
		window.addEventListener('resize', this.onResize)
	}

	onScroll = () => this.onUpdateShownItemIndexes({ reason: 'scroll' })
	onResize = () => this.onUpdateShownItemIndexes({ reason: 'resize' })

	onUnmount() {
		this.isMounted = false
		window.removeEventListener('scroll', this.onScroll)
		window.removeEventListener('resize', this.onResize)
		clearTimeout(this.onUserStopsScrollingTimeout)
	}

	onUpdate(prevState) {
		const {
			items,
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()
		// If new items are shown (or older items are hidden).
		if (firstShownItemIndex !== prevState.firstShownItemIndex ||
			lastShownItemIndex !== prevState.lastShownItemIndex ||
			items !== prevState.items) {
			// Update seen item heights.
			this.updateItemHeights(
				firstShownItemIndex,
				lastShownItemIndex
			)
		}
	}

	updateItemHeights(fromIndex, toIndex) {
		const {
			firstShownItemIndex
		} = this.getState()
		if (fromIndex !== undefined) {
			this.itemHeights.update(
				fromIndex,
				toIndex,
				firstShownItemIndex
			)
		}
	}

	updateItemHeight(i) {
		const { firstShownItemIndex } = this.getState()
		this.itemHeights.updateItemHeight(i, firstShownItemIndex)
	}

	onItemStateChange(i, itemState) {
		if (isDebug()) {
			log('Item', i, 'state changed')
			log('Previous state' + '\n' + JSON.stringify(this.getState().itemStates[i], null, 2))
			log('New state' + '\n' + JSON.stringify(itemState, null, 2))
		}
		this.getState().itemStates[i] = itemState
	}

	onItemHeightChange(i) {
		const { itemHeights } = this.getState()
		const previousHeight = itemHeights[i]
		this.updateItemHeight(i)
		const newHeight = itemHeights[i]
		if (previousHeight !== newHeight) {
			log('Item', i, 'height changed from', previousHeight, 'to', newHeight)
			this.onUpdateShownItemIndexes({ reason: 'item height change' })
		}
	}

	// Finds the items which are displayed in the viewport.
	getVisibleItemIndexes(screenTop, screenBottom, listTop) {
		let showItemsFromIndex
		let showItemsToIndex
		let itemsHeight = 0
		let redoLayoutAfterRender = false
		let i = START_FROM_INDEX
		while (i < this.getItemsCount()) {
			const height = this.itemHeights.get(i)
			// If an item that hasn't been shown (measured) yet is encountered
			// then show such item and then retry after it has been measured.
			if (height === undefined) {
				log(`Item ${i} height hasn't been measured yet: render and redo layout`)
				if (showItemsFromIndex === undefined) {
					showItemsFromIndex = i
				}
				const heightLeft = screenBottom - (listTop + itemsHeight)
				const batchSize = this.getEstimatedItemsCount(heightLeft)
				showItemsToIndex = Math.min(
					i + (batchSize - 1),
					// Guard against index overflow.
					this.getItemsCount() - 1
				)
				redoLayoutAfterRender = true
				break
			}
			itemsHeight += height
			// If this is the first item visible
			// then start showing items from it.
			if (showItemsFromIndex === undefined) {
				if (listTop + itemsHeight > screenTop) {
					log('First visible item index (including margin)', i)
					showItemsFromIndex = i
				}
			}
			// Items can have spacing.
			if (i < this.getItemsCount() - 1) {
				itemsHeight += this.getItemSpacing()
			}
			// If this item is the last one visible in the viewport then exit.
			if (listTop + itemsHeight > screenBottom) {
				log('Last visible item index (including margin)', i)
				// The list height is estimated until all items have been seen,
				// so it's possible that even when the list DOM element happens
				// to be in the viewport in reality the list isn't visible
				// in which case `showItemsFromIndex` will be `undefined`.
				if (showItemsFromIndex !== undefined) {
					showItemsToIndex = i
				}
				break
			}
			i++
		}
		// If there're no more items then the last item is the last one to show.
		if (showItemsFromIndex !== undefined && showItemsToIndex === undefined) {
			showItemsToIndex = this.getItemsCount() - 1
			log('Last item index (is fully visible)', showItemsToIndex)
		}
		// If scroll position is scheduled to be restored
		// after render then the anchor item must be rendered
		// and all the prepended items before it.
		if (this.restoreScrollAfterPrepend) {
			if (showItemsToIndex < this.restoreScrollAfterPrepend.index) {
				showItemsToIndex = this.restoreScrollAfterPrepend.index
			}
			// No need to redo layout after render because all
			// prepended items are rendered in a single pass.
			// It removes the visual jitter otherwise happening
			// due to scroll position restoration waiting for
			// two layout cycles instead of one.
			redoLayoutAfterRender = false
		}
		return {
			firstShownItemIndex: showItemsFromIndex,
			lastShownItemIndex: showItemsToIndex,
			redoLayoutAfterRender
		}
	}

	getInvisibleItemIndexes() {
		const i = START_FROM_INDEX
		return {
			firstShownItemIndex: i,
			lastShownItemIndex: i,
			redoLayoutAfterRender: this.itemHeights.get(i) === undefined
		}
	}

	getItemIndexes(screenTop, screenBottom, top, bottom) {
		const isVisible = bottom > screenTop && top < screenBottom
		if (!isVisible) {
			return this.getInvisibleItemIndexes()
		}
		// Find the items which are displayed in the viewport.
		const indexes = this.getVisibleItemIndexes(screenTop, screenBottom, top)
		// The list height is estimated until all items have been seen,
		// so it's possible that even when the list DOM element happens
		// to be in the viewport in reality the list isn't visible
		// in which case `firstShownItemIndex` will be `undefined`.
		if (indexes.firstShownItemIndex === undefined) {
			return this.getInvisibleItemIndexes()
		}
		return indexes
	}

	/**
	 * Measures "before" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @return {number}
	 */
	getBeforeItemsHeight(firstShownItemIndex, lastShownItemIndex) {
		let beforeItemsHeight = 0
		// Add all "before" items height.
		let i = START_FROM_INDEX
		while (i < firstShownItemIndex) {
			beforeItemsHeight += (this.itemHeights.get(i) || this.itemHeights.getAverage())
			beforeItemsHeight += this.getItemSpacing()
			i++
		}
		return beforeItemsHeight
	}

	/**
	 * Measures "after" items height.
	 * @param  {number} firstShownItemIndex — New first shown item index.
	 * @param  {number} lastShownItemIndex — New last shown item index.
	 * @return {number}
	 */
	getAfterItemsHeight(firstShownItemIndex, lastShownItemIndex) {
		let afterItemsHeight = 0
		let i = lastShownItemIndex + 1
			// Add all "after" items height.
		while (i < this.getItemsCount()) {
			afterItemsHeight += this.getItemSpacing()
			afterItemsHeight += (this.itemHeights.get(i) || this.itemHeights.getAverage())
			i++
		}
		return afterItemsHeight
	}

	/**
	 * Updates the heights of items to be hidden on next render.
	 * For example, a user could click a "Show more" button,
	 * or an "Expand YouTube video" button, which would result
	 * in the list item height changing and `this.itemHeights[i]`
	 * being stale, so it's updated here when hiding the item.
	 */
	updateWillBeHiddenItemHeightsAndState(firstShownItemIndex, lastShownItemIndex) {
		let i = this.getState().firstShownItemIndex
		while (i <= this.getState().lastShownItemIndex) {
			if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
				// The item's still visible.
			} else {
				// Update item's height before hiding it
				// because the height of the item may have changed
				// while it was visible.
				this.updateItemHeight(i)
				// // Update item's state because it's about to be hidden.
				// if (this.getItemState) {
				// 	this.getState().itemStates[i] = this.getItemState(
				// 		this.getState().items[i],
				// 		i,
				// 		this.getState().items
				// 	)
				// }
			}
			i++
		}
	}

	/**
	 * Updates the "from" and "to" shown item indexes.
	 * `callback(status)` is called after it re-renders.
	 * If the list isn't visible then `status` is `-1`.
	 * If the list is visible and some of the items being shown
	 * are new and required to be measured first then `status` is `1`.
	 * If the list is visible and all items being shown
	 * have been encountered (and measured) before then `status` is `0`.
	 * @param {Function} callback
	 */
	updateShownItemIndexes = (callback) => {
		// // A minor optimization. Just because I can.
		// let listCoordinates
		// if (this.listCoordinatesCached) {
		// 	listCoordinates = this.listCoordinatesCached
		// 	this.listCoordinatesCached = undefined
		// } else {
		// 	listCoordinates = getOffset(this.getContainerNode())
		// }
		// const { top, height } = listCoordinates
		const { top, height } = getOffset(this.getContainerNode())
		const { top: screenTop, bottom: screenBottom } = getScreenBounds()
		// Set screen top and bottom for current layout.
		this.latestLayoutScreenTopAfterMargin = screenTop - this.getMargin()
		this.latestLayoutScreenBottomAfterMargin = screenBottom + this.getMargin()
		// Find the items which are displayed in the viewport.
		const  {
			firstShownItemIndex,
			lastShownItemIndex,
			redoLayoutAfterRender
		} = this.getItemIndexes(
			screenTop - this.getMargin(),
			screenBottom + this.getMargin(),
			top,
			top + height
		)
		// Measure "before" items height.
		const beforeItemsHeight = this.getBeforeItemsHeight(firstShownItemIndex, lastShownItemIndex)
		// Measure "after" items height.
		const afterItemsHeight = this.getAfterItemsHeight(firstShownItemIndex, lastShownItemIndex)
		// Update the heights of items to be hidden on next render.
		// For example, a user could click a "Show more" button,
		// or an "Expand YouTube video" button, which would result
		// in the list item height changing and `this.itemHeights[i]`
		// being stale, so it's updated here when hiding the item.
		this.updateWillBeHiddenItemHeightsAndState(firstShownItemIndex, lastShownItemIndex)
		// Debugging.
		log('~ Layout results ~')
		log('First shown item index', firstShownItemIndex)
		log('Last shown item index', lastShownItemIndex)
		log('Before items height', beforeItemsHeight)
		log('After items height', afterItemsHeight)
		log('Average item height (for previous layout)', this.itemHeights.getAverage())
		if (redoLayoutAfterRender) {
			log('Redo layout after render')
		}
		// Optionally preload items to be rendered.
		this.onShowItems(firstShownItemIndex, lastShownItemIndex)
		// Render.
		this.setState({
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			// // Average item height is stored in state to differentiate between
			// // the initial state and "anything has been measured already" state.
			// averageItemHeight: this.itemHeights.getAverage()
		}, () => callback(redoLayoutAfterRender ? 1 : 0))
	}

	updateShownItemIndexesRecursive = () => {
		this.updateShownItemIndexes((status) => {
			if (status === 1) {
				// Recurse in a timeout to prevent React error:
				// "Maximum update depth exceeded.
				//  This can happen when a component repeatedly calls
				//  setState inside componentWillUpdate or componentDidUpdate.
				//  React limits the number of nested updates to prevent infinite loops."
				setTimeout(() => {
					if (this.isMounted) {
						this.updateShownItemIndexesRecursive()
					} else {
						this.onDoneUpdatingItemIndexes()
					}
				})
			} else {
				this.onDoneUpdatingItemIndexes()
			}
		})
	}

	onDoneUpdatingItemIndexes() {
		this.isUpdatingItemIndexes = false
		if (this.restoreScrollAfterPrepend) {
			this.restoreScroll()
		}
	}

	captureScroll(previousItems, nextItems, firstPreviousItemIndex) {
		// If there were no items in the list
		// then there's no point in restoring scroll position.
		if (previousItems.length === 0) {
			return
		}
		if (firstPreviousItemIndex === undefined) {
			firstPreviousItemIndex = nextItems.indexOf(previousItems[0])
		}
		// If the items update wasn't incremental
		// then there's no point in restoring scroll position.
		if (firstPreviousItemIndex < 0) {
			return
		}
		// If no items were prepended then no need to restore scroll position.
		if (firstPreviousItemIndex === 0) {
			return
		}
		// The first item DOM Element must be rendered in order to get its top position.
		if (this.getState().firstShownItemIndex > 0) {
			return
		}
		// If the scroll position for these `previousItems` -> `nextItems`
		// has already been captured then skip.
		// This could happen when using `<ReactVirtualScroller/>`
		// because it calls `.captureScroll()` inside `.render()`
		// which is followed by `<VirtualScroller/>`'s `.componentDidUpdate()`
		// which also alls `.captureScroll()` with the same arguments.
		// (this is done to prevent scroll Y position from jumping
		//  when showing the first page of the "Previous items",
		//  see the comments in `<ReactVirtualScroller/>`'s `.render()` method).
		if (this.restoreScrollAfterPrepend &&
			this.restoreScrollAfterPrepend.previousItems === previousItems &&
			this.restoreScrollAfterPrepend.nextItems === nextItems) {
			return
		}
		this.restoreScrollAfterPrepend = {
			previousItems,
			nextItems,
			index: firstPreviousItemIndex,
			screenTop: this.getItemElement(0).getBoundingClientRect().top
		}
	}

	restoreScroll = () => {
		const { index, screenTop } = this.restoreScrollAfterPrepend
		this.restoreScrollAfterPrepend = undefined
		const newScreenTop = this.getItemElement(index).getBoundingClientRect().top
		const scrollByY = newScreenTop - screenTop
		if (scrollByY !== 0) {
			log('Restore scroll position: scroll by', scrollByY)
			window.scrollTo(0, getScrollY() + scrollByY)
		}
	}

	onUpdateShownItemIndexes = ({ reason, force }) => {
		// Not implementing the "delayed" layout feature for now.
		// if (this.delayLayout({ reason, force })) {
		// 	return
		// }
		//
		// If there're no items then no need to calculate the layout:
		// if empty `items` have been set on `state` then it has rendered nothing.
		if (this.getItemsCount() === 0) {
			return
		}
		// If a re-layout is already scheduled then it will happen anyway
		// for the same `state` so there's no need to start another one.
		if (this.isUpdatingItemIndexes) {
			return
		}
		// Prefer not re-rendering the list as the user's scrolling.
		// Instead, prefer delaying such re-renders until the user stops scrolling.
		//
		// If the user has scrolled then it means that they haven't
		// stopped scrolling so cancel the timeout.
		// Otherwise, a layout happens so no need for the deferred one
		// so cancel the timeout anyway.
		clearTimeout(this.onUserStopsScrollingTimeout)
		//
		if (reason === 'scroll') {
			// See whether rendering new previous/next items is required right now
			// or it can be deferred until the user stops scrolling for better perceived performance.
			// const listCoordinates = getOffset(this.getContainerNode())
			// const { top, height } = listCoordinates
			// const bottom = top + height
			// const { top: screenTop, bottom: screenBottom } = getScreenBounds()
			// const renderedItemsTop = top + this.getState().beforeItemsHeight
			// const renderedItemsBottom = top + height - this.getState().afterItemsHeight
			// const forceRender = (screenTop < renderedItemsTop && this.getState().firstShownItemIndex > 0) ||
			// 	(screenBottom > renderedItemsBottom && this.getState().lastShownItemIndex < this.getItemsCount() - 1)
			const forceRender = (
				// If the items have been rendered at least one
				this.latestLayoutScreenTopAfterMargin !== undefined &&
					// If the user has scrolled up past the extra "margin"
					(getScrollY() < this.latestLayoutScreenTopAfterMargin) &&
					// and if there're any previous non-rendered items to render.
					(this.getState().firstShownItemIndex > 0)
			) || (
				// If the items have been rendered at least one
				this.latestLayoutScreenBottomAfterMargin !== undefined &&
					// If the user has scrolled down past the extra "margin"
					(getScrollY() + getScreenHeight() > this.latestLayoutScreenBottomAfterMargin) &&
					// and if there're any next non-rendered items to render.
					(this.getState().lastShownItemIndex < this.getItemsCount() - 1)
			)
			if (forceRender) {
				log('The user has scrolled far enough: force re-render')
			} else {
				log('The user hasn\'t scrolled too much: delay re-render')
			}
			// "scroll" events are usually dispatched every 16 milliseconds
			// for the 60fps refresh rate, so waiting for 100 milliseconds
			// is about 6 frames of inactivity which would definitely mean
			// that either the user's no longer scrolling or the browser's
			// stuttering (skipping frames due to high load) anyway.
			if (!forceRender) {
				return this.onUserStopsScrollingTimeout = setTimeout(this.onUserStoppedScrolling, 100)
			}
		}
		// // A minor optimization. Just because I can.
		// this.listCoordinatesCached = listCoordinates
		// Re-render the list.
		this.updateLayout(reason)
	}

	updateLayout(reason) {
		log(`~ Update layout (${reason}) ~`)
		this.isUpdatingItemIndexes = true
		this.updateShownItemIndexesRecursive()
	}

	onUserStoppedScrolling = () => {
		if (this.isMounted) {
			// Re-render the list.
			this.updateLayout('stopped scrolling')
		}
	}

	/**
	 * Updates `items`. For example, can prepend or append new items to the list.
	 * @param  {any[]} newItems
	 */
	updateItems(newItems) { // , newCustomState) {
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
			itemHeights,
			itemSpacing
		} = this.getState()
		log('~ Update items ~')
		const {
			prependedItemsCount,
			appendedItemsCount
		} = getItemsDiff(previousItems, newItems)
		if (prependedItemsCount > 0 || appendedItemsCount > 0) {
			if (prependedItemsCount > 0) {
				log('Prepended items count', prependedItemsCount)
				itemHeights = new Array(prependedItemsCount).concat(itemHeights)
				this.itemHeights.onPrepend(prependedItemsCount)
				if (itemStates) {
					itemStates = new Array(prependedItemsCount).concat(itemStates)
				}
				// Since some items were prepended restore scroll Y
				// position after showing those items.
				this.captureScroll(
					previousItems,
					newItems,
					prependedItemsCount
				)
			}
			if (appendedItemsCount > 0) {
				log('Appended items count', appendedItemsCount)
				itemHeights = itemHeights.concat(new Array(appendedItemsCount))
				if (itemStates) {
					itemStates = itemStates.concat(new Array(appendedItemsCount))
				}
			}
			firstShownItemIndex += prependedItemsCount
			lastShownItemIndex += prependedItemsCount
			beforeItemsHeight += this.itemHeights.getAverage() * prependedItemsCount
			afterItemsHeight += this.itemHeights.getAverage() * appendedItemsCount
		} else {
			log('Non-incremental items update')
			log('Previous items', previousItems)
			log('New items', newItems)
			this.itemHeights = new ItemHeights(this.getContainerNode, newItems.length, this.getState)
			itemHeights = new Array(newItems.length)
			itemStates = new Array(newItems.length)
			if (newItems.length === 0) {
				firstShownItemIndex = undefined
				lastShownItemIndex = undefined
			} else {
				firstShownItemIndex = 0
				lastShownItemIndex = this.getLastShownItemIndex(firstShownItemIndex, newItems.length)
			}
			beforeItemsHeight = 0
			afterItemsHeight = 0
		}
		let customState
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
		this.setState({
			...customState,
			items: newItems,
			itemStates,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		}, () => {
			this.onUpdateShownItemIndexes({
				reason: 'update items',
				force: true
			})
		})
	}

	getItemElement(i) {
		return this.getContainerNode().childNodes[i]
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
	// 			beforeItemsHeight += this.getItemSpacing()
	// 			i++
	// 		}
	// 		// Subtract all "before" will-be-shown items' height.
	// 		i = firstShownItemIndex
	// 		while (i <= lastShownItemIndex && i < this.getState().firstShownItemIndex) {
	// 			beforeItemsHeight -= (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			beforeItemsHeight -= this.getItemSpacing()
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
	// 			afterItemsHeight += this.getItemSpacing()
	// 			i--
	// 		}
	// 		// Subtract all "after" will-be-shown items' height.
	// 		i = lastShownItemIndex
	// 		while (i >= firstShownItemIndex && i > this.getState().lastShownItemIndex) {
	// 			afterItemsHeight -= (this.itemHeights.get(i) || this.itemHeights.getAverage())
	// 			afterItemsHeight -= this.getItemSpacing()
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
	// 		// Then in `.onMount()`:
	// 		// if (this.layoutDelayedWithArgs) {
	// 		// 	this.shouldDelayLayout = false
	// 		// 	setTimeout(() => {
	// 		// 		if (this.isMounted) {
	// 		// 			this.onUpdateShownItemIndexes(this.layoutDelayedWithArgs)
	// 		// 			this.layoutDelayedWithArgs = undefined
	// 		// 		}
	// 		// 	}, 0)
	// 		// }
	// 		return true
	// 	}
	// }
}

function getRemainderRest(n, divider) {
	const remainder = n % divider
	if (remainder > 0) {
		return divider - remainder
	}
	return 0
}

export function getItemsDiff(previousItems, newItems) {
	let firstPreviousItemIndex = -1
	let lastPreviousItemIndex = -1
	if (previousItems.length > 0) {
		firstPreviousItemIndex = newItems.indexOf(previousItems[0])
		if (firstPreviousItemIndex >= 0) {
			if (arePreviousItemsPreserved(previousItems, newItems, firstPreviousItemIndex)) {
				lastPreviousItemIndex = firstPreviousItemIndex + previousItems.length - 1
			}
		}
	}
	const isIncrementalUpdate = firstPreviousItemIndex >= 0 && lastPreviousItemIndex >= 0
	if (isIncrementalUpdate) {
		return {
			prependedItemsCount: firstPreviousItemIndex,
			appendedItemsCount: newItems.length - (lastPreviousItemIndex + 1)
		}
	}
	return {
		prependedItemsCount: -1,
		appendedItemsCount: -1
	}
}

function arePreviousItemsPreserved(previousItems, newItems, offset) {
	// Check each item of the `previousItems` to determine
	// whether it's an "incremental" items update.
	// (an update when items are prepended or appended)
	let i = 0
	while (i < previousItems.length) {
		if (newItems.length <= offset + i ||
			newItems[offset + i] !== previousItems[i]) {
			return false
		}
		i++
	}
	return true
}