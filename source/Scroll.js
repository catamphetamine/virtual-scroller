// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import log from './utility/debug.js'

export default class Scroll {
	constructor({
		isInBypassMode,
		scrollableContainer,
		itemsContainer,
		onScroll,
		initialScrollPosition,
		onScrollPositionChange,
		isImmediateLayoutScheduled,
		hasNonRenderedItemsAtTheTop,
		hasNonRenderedItemsAtTheBottom,
		getLatestLayoutVisibleArea,
		getListTopOffset,
		getPrerenderMargin,
		onScrolledToTop,
		waitForScrollingToStop
	}) {
		this.isInBypassMode = isInBypassMode
		this.scrollableContainer = scrollableContainer
		this.itemsContainer = itemsContainer
		this.onScroll = onScroll
		this.initialScrollPosition = initialScrollPosition
		this.onScrollPositionChange = onScrollPositionChange
		this.isImmediateLayoutScheduled = isImmediateLayoutScheduled
		this.hasNonRenderedItemsAtTheTop = hasNonRenderedItemsAtTheTop
		this.hasNonRenderedItemsAtTheBottom = hasNonRenderedItemsAtTheBottom
		this.getLatestLayoutVisibleArea = getLatestLayoutVisibleArea
		this.getListTopOffset = getListTopOffset
		this.getPrerenderMargin = getPrerenderMargin
		this.onScrolledToTop = onScrolledToTop
		this.waitForScrollingToStop = waitForScrollingToStop
	}

	start() {
		if (this.initialScrollPosition !== undefined) {
			this.scrollToY(this.initialScrollPosition)
			// Don't restore this scroll position on restart.
			this.initialScrollPosition = undefined
		}
		if (this.onScrollPositionChange) {
			this.onScrollPositionChange(this.getScrollY())
		}
		this.stopListeningToScroll = this.scrollableContainer.onScroll(this.onScrollListener)
	}

	stop() {
		this.stopListeningToScroll()
		this.stopListeningToScroll = undefined
		// this.onStopScrollingListener = undefined
		this.shouldCallOnScrollListenerWhenStopsScrolling = undefined
		this.cancelOnStopScrollingTimer()
	}

	scrollToY(scrollY) {
		this.ignoreScrollEvents = true
		this.scrollableContainer.scrollToY(scrollY)
		this.ignoreScrollEvents = undefined
	}

	scrollByY = (scrollByY) => {
		this.scrollToY(this.getScrollY() + scrollByY)
	}

	getScrollY() {
		return this.scrollableContainer.getScrollY()
	}

	cancelOnStopScrollingTimer() {
		if (this.onStopScrollingTimer) {
			clearTimeout(this.onStopScrollingTimer)
			this.onStopScrollingTimer = undefined
		}
	}

	cancelScheduledLayout() {
		// Cancel a "re-layout when user stops scrolling" timer.
		this.cancelOnStopScrollingTimer()
	}

	onScrollListener = () => {
		if (this.onScrollPositionChange) {
			this.onScrollPositionChange(this.getScrollY())
		}

		// If the user has scrolled up to the top of the items container.
		// (this option isn't currently used)
		if (this.onScrolledToTop) {
			if (this.getScrollY() < this.getListTopOffset()) {
				this.onScrolledToTop()
			}
		}

		if (this.isInBypassMode()) {
			return
		}

		if (this.ignoreScrollEvents) {
			return
		}

		// Prefer not performing a re-layout while the user is scrolling (if possible).
		// If the user doesn't scroll too far and then stops for a moment,
		// then a mid-scroll re-layout could be delayed until such a brief stop:
		// presumably, this results in better (smoother) scrolling performance,
		// delaying the work to when it doesn't introduce any stutter or "jank".

		// Reset `this.onStopScrollingTimer` (will be re-created below).
		this.cancelOnStopScrollingTimer()

		// See if the latest "layout" (the currently rendered set of items)
		// is still sufficient in order to show all the items that're
		// currently inside the viewport. If there're some non-rendered items
		// that're visible in the current viewport, then those items
		// should be rendered "immediately" rather than waiting until
		// the user stops scrolling.
		const forceUpdate =
			// If the items have been rendered at least once
			this.getLatestLayoutVisibleArea() && (
				(
					// If the user has scrolled up past the "prerender margin"
					// and there're some non-rendered items at the top,
					// then force a re-layout.
					//
					// (during these calculations we assume that the list's top coordinate
					//  hasn't changed since previous layout; even if that's not exactly true,
					//  the items will be re-layout when the user stops scrolling anyway)
					//
					(this.getScrollY() < this.getLatestLayoutVisibleArea().top - this.getPrerenderMargin()) &&
					this.hasNonRenderedItemsAtTheTop()
				)
				||
				(
					// If the user has scrolled down past the "prerender margin"
					// and there're any non-rendered items left at the end,
					// then force a re-layout.
					//
					// (during these calculations we assume that the list's top coordinate
					//  hasn't changed since previous layout; even if that's not exactly true,
					//  the items will be re-layout when the user stops scrolling anyway)
					//
					(this.getScrollY() + this.scrollableContainer.getHeight() > this.getLatestLayoutVisibleArea().bottom + this.getPrerenderMargin()) &&
					this.hasNonRenderedItemsAtTheBottom()
				)
			)

		if (forceUpdate) {
			log('The user has scrolled far enough: perform a re-layout')
		} else {
			log('The user is scrolling: perform a re-layout when they stop scrolling')
		}

		if (forceUpdate || this.waitForScrollingToStop === false) {
			return this.onScroll()
		}

		// If a re-layout is already scheduled at the next "frame",
		// don't schedule a "re-layout when user stops scrolling" timer.
		if (this.isImmediateLayoutScheduled()) {
			return
		}

		this.shouldCallOnScrollListenerWhenStopsScrolling = true
		this.watchOnStopScrolling()
	}

	watchOnStopScrolling() {
		this.onStopScrollingTimer = setTimeout(
			() => {
				this.onStopScrollingTimer = undefined

				if (this.shouldCallOnScrollListenerWhenStopsScrolling) {
					this.shouldCallOnScrollListenerWhenStopsScrolling = undefined
					this.onScroll({ delayed: true })
				}

				// `onStopScrolling()` feature is not currently used.
				// if (this.onStopScrollingListener) {
				// 	const onStopScrollingListener = this.onStopScrollingListener
				// 	this.onStopScrollingListener = undefined
				// 	// `onStopScrollingListener()` may hypothetically schedule
				// 	// another `onStopScrolling()` listener, so set
				// 	// `this.onStopScrollingListener` to `undefined` before
				// 	// calling it rather than after.
				// 	log('~ The user has stopped scrolling ~')
				// 	onStopScrollingListener()
				// }
			},
			// "scroll" events are usually dispatched every 16 milliseconds
			// for 60fps refresh rate, so waiting for 100 milliseconds feels
			// reasonable: that would be about 6 frames of inactivity period,
			// which could mean that either the user has stopped scrolling
			// (for a moment) or the browser is lagging and stuttering
			// (skipping frames due to high load).
			// If the user continues scrolling then this timeout is constantly
			// refreshed (cancelled and then re-created).
			ON_STOP_SCROLLING_INACTIVE_PERIOD
		)
	}

	// (this function isn't currently used)
	// onStopScrolling(onStopScrollingListener) {
	// 	this.onStopScrollingListener = onStopScrollingListener
	// 	if (!this.onStopScrollingTimer) {
	// 		this.watchOnStopScrolling()
	// 	}
	// }

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
}

const ON_STOP_SCROLLING_INACTIVE_PERIOD = 100