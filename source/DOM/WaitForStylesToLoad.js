// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

import { LAYOUT_REASON } from '../Layout'

// `VirtualScroller` calls `this.layout.layOut()` on mount,
// but if the page styles are applied after `VirtualScroller` mounts
// (for example, if styles are applied via javascript, like Webpack does)
// then the list might not render correctly and will only show the first item.
// The reason for that would be that calling `.getListTopOffsetInsideScrollableContainer()`
// on mount returns "incorrect" `top` position because the styles haven't been applied yet.
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
// implements for such cases is calling `.getListTopOffsetInsideScrollableContainer()`
// on the list container DOM element periodically (every second) to check
// if the `top` coordinate has changed as a result of CSS being applied:
// if it has then it recalculates the shown item indexes.
export default class WaitForStylesToLoad {
	constructor({
		updateLayout,
		getListTopOffsetInsideScrollableContainer
	}) {
		this.updateLayout = updateLayout
		this.getListTopOffsetInsideScrollableContainer = getListTopOffsetInsideScrollableContainer
	}

	onGotListTopOffset(listTopOffset) {
		if (this.listTopOffsetInsideScrollableContainer === undefined) {
			// Start periodical checks of the list's top offset
			// in order to perform a re-layout in case it changes.
			// See the comments in `WaitForStylesToLoad.js` file
			// on why can the list's top offset change, and in which circumstances.
			this.start()
		}
		this.listTopOffsetInsideScrollableContainer = listTopOffset
	}

	start() {
		this.isRendered = true
		this.watchListTopOffset()
	}

	stop() {
		this.isRendered = false
		clearTimeout(this.watchListTopOffsetTimer)
	}

	watchListTopOffset() {
		const startedAt = Date.now()
		const check = () => {
			// If `VirtualScroller` has been unmounted
			// while `setTimeout()` was waiting, then exit.
			if (!this.isRendered) {
				return
			}
			// Skip comparing `top` coordinate of the list
			// when this function is called for the first time.
			if (this.listTopOffsetInsideScrollableContainer !== undefined) {
				// Calling `this.getListTopOffsetInsideScrollableContainer()`
				// on an element is about 0.003 milliseconds on a modern desktop CPU,
				// so I guess it's fine calling it twice a second.
				if (this.getListTopOffsetInsideScrollableContainer() !== this.listTopOffsetInsideScrollableContainer) {
					this.updateLayout({ reason: LAYOUT_REASON.TOP_OFFSET_CHANGED })
				}
			}
			// Compare `top` coordinate of the list twice a second
			// to find out if it has changed as a result of loading CSS styles.
			// The total duration of 3 seconds would be enough for any styles to load, I guess.
			// There could be other cases changing the `top` coordinate
			// of the list (like collapsing an "accordeon" panel above the list
			// without scrolling the page), but those cases should be handled
			// by manually calling `.updateLayout()` instance method on `VirtualScroller` instance.
			if (Date.now() - startedAt < WATCH_LIST_TOP_OFFSET_MAX_DURATION) {
				this.watchListTopOffsetTimer = setTimeout(check, WATCH_LIST_TOP_OFFSET_INTERVAL)
			}
		}
		// Run the cycle.
		check()
	}
}

const WATCH_LIST_TOP_OFFSET_INTERVAL = 500
const WATCH_LIST_TOP_OFFSET_MAX_DURATION = 3000