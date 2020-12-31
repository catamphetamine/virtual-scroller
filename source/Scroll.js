// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import { LAYOUT_REASON } from './Layout'
import log from './utility/debug'

export default class Scroll {
	constructor({
		bypass,
		scrollableContainer,
		updateLayout,
		initialScrollPosition,
		onScrollPositionChange,
		isImmediateLayoutScheduled,
		hasNonRenderedItemsAtTheTop,
		hasNonRenderedItemsAtTheBottom,
		getLatestLayoutVisibleAreaIncludingMargins,
		preserveScrollPositionOfTheBottomOfTheListOnMount
	}) {
		this.bypass = bypass
		this.scrollableContainer = scrollableContainer
		this.updateLayout = updateLayout
		this.initialScrollPosition = initialScrollPosition
		this.onScrollPositionChange = onScrollPositionChange
		this.isImmediateLayoutScheduled = isImmediateLayoutScheduled
		this.hasNonRenderedItemsAtTheTop = hasNonRenderedItemsAtTheTop
		this.hasNonRenderedItemsAtTheBottom = hasNonRenderedItemsAtTheBottom
		this.getLatestLayoutVisibleAreaIncludingMargins = getLatestLayoutVisibleAreaIncludingMargins

		if (preserveScrollPositionOfTheBottomOfTheListOnMount) {
			if (scrollableContainer) {
				this.preserveScrollPositionOfTheBottomOfTheListOnMount = {
					scrollableContainerContentHeight: scrollableContainer.getContentHeight()
				}
			}
		}
	}

	listen() {
		if (this.initialScrollPosition !== undefined) {
			this.scrollToY(this.initialScrollPosition)
		}
		if (this.onScrollPositionChange) {
			this.updateScrollPosition()
			this.removeScrollPositionListener = this.scrollableContainer.addScrollListener(this.updateScrollPosition)
		}
		if (!this.bypass) {
			this.removeScrollListener = this.scrollableContainer.addScrollListener(this.onScroll)
		}
		if (this.preserveScrollPositionOfTheBottomOfTheListOnMount) {
			this.scrollToY(this.getScrollY() + (this.scrollableContainer.getContentHeight() - this.preserveScrollPositionOfTheBottomOfTheListOnMount.scrollableContainerContentHeight))
		}
	}

	stop() {
		if (this.removeScrollPositionListener) {
			this.removeScrollPositionListener()
		}
		if (this.removeScrollListener) {
			this.removeScrollListener()
		}
		this.cancelOnUserStopsScrollingTimer()
	}

	scrollToY(scrollY) {
		this.scrollableContainer.scrollToY(scrollY)
	}

	scrollByY(scrollByY) {
		this.scrollToY(this.getScrollY() + scrollByY)
	}

	getScrollY() {
		return this.scrollableContainer.getScrollY()
	}

	/**
	 * Updates the current scroll Y position in state.
	 */
	updateScrollPosition = () => {
		this.onScrollPositionChange(this.getScrollY())
	}

	cancelOnUserStopsScrollingTimer() {
		if (this.onUserStopsScrollingTimer) {
			clearTimeout(this.onUserStopsScrollingTimer)
			this.onUserStopsScrollingTimer = undefined
		}
	}

	onLayout() {
		// Cancel a "re-layout when user stops scrolling" timer.
		this.cancelOnUserStopsScrollingTimer()
	}

	onScroll = () => {
		// Prefer not performing a re-layout while the user is scrolling (if possible).
		// If the user doesn't scroll too far and then stops for a moment,
		// then a mid-scroll re-layout could be delayed until such a brief stop:
		// presumably, this results in better (smoother) scrolling performance,
		// delaying the work to when it doesn't introduce any stutter or "jank".

		// Reset `this.onUserStopsScrollingTimer` (will be re-created below).
		this.cancelOnUserStopsScrollingTimer()

		// See whether rendering "new" previous/next items is required
		// right now, or it can wait until the user stops scrolling.
		const forceUpdate =
			// If the items have been rendered at least once
			this.getLatestLayoutVisibleAreaIncludingMargins() && (
				(
					// If the user has scrolled up past the extra "margin"
					(this.getScrollY() < this.getLatestLayoutVisibleAreaIncludingMargins().top) &&
					// and if there're any previous non-rendered items to render.
					this.hasNonRenderedItemsAtTheTop()
				)
				||
				(
					// If the user has scrolled down past the extra "margin"
					(this.getScrollY() + this.scrollableContainer.getHeight() > this.getLatestLayoutVisibleAreaIncludingMargins().bottom) &&
					// and if there're any next non-rendered items to render.
					this.hasNonRenderedItemsAtTheBottom()
				)
			)

		if (forceUpdate) {
			log('The user has scrolled far enough: force re-layout')
		} else {
			log('The user hasn\'t scrolled too much: delay re-layout')
		}

		if (!forceUpdate) {
			// If a re-layout is already scheduled at the next "frame",
			// don't schedule a "re-layout when user stops scrolling" timer.
			if (this.isImmediateLayoutScheduled()) {
				return
			}
			this.onUserStopsScrollingTimer = setTimeout(
				() => {
					this.onUserStopsScrollingTimer = undefined
					this.updateLayout({ reason: LAYOUT_REASON.STOPPED_SCROLLING })
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

		this.updateLayout({ reason: LAYOUT_REASON.SCROLL })
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
}

const WAIT_FOR_USER_TO_STOP_SCROLLING_TIMEOUT = 100