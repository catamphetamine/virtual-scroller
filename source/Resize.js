import debounce from './utility/debounce'
import log from './utility/debug'

export default class Resize {
	constructor({
		bypass,
		scrollableContainer,
		onStart,
		onStop,
		onHeightChange,
		onWidthChange,
		onNoChange
	}) {
		this.bypass = bypass
		this.scrollableContainer = scrollableContainer

		this.onHeightChange = onHeightChange
		this.onWidthChange = onWidthChange
		this.onNoChange = onNoChange

		this.onResize = debounce(
			this._onResize,
			SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL,
			{ onStart, onStop }
		)
	}

	listen() {
		if (this.bypass) {
			return
		}
		this.isRendered = true
		this.scrollableContainerWidth = this.scrollableContainer.getWidth()
		this.scrollableContainerHeight = this.scrollableContainer.getHeight()
		this.scrollableContainerUnlistenResize = this.scrollableContainer.onResize(this.onResize)
	}

	stop() {
		this.isRendered = false
		if (this.scrollableContainerUnlistenResize) {
			this.scrollableContainerUnlistenResize()
			this.scrollableContainerUnlistenResize = undefined
		}
	}

	/**
	 * On scrollable container resize.
	 */
	_onResize = () => {
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
				this.onNoChange()
			} else {
				// Scrollable container height has changed,
				// so just recalculate shown item indexes.
				// No need to perform a re-layout from scratch.
				this.onHeightChange(prevScrollableContainerHeight, this.scrollableContainerHeight)
			}
		} else {
			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			this.onWidthChange(prevScrollableContainerWidth, this.scrollableContainerWidth)
		}
	}
}

const SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL = 250