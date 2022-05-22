import debounce from './utility/debounce.js'
import log from './utility/debug.js'

export default class Resize {
	constructor({
		bypass,
		getWidth,
		getHeight,
		listenForResize,
		onResizeStart,
		onResizeStop,
		onHeightChange,
		onWidthChange,
		onNoChange
	}) {
		this.bypass = bypass

		this.onHeightChange = onHeightChange
		this.onWidthChange = onWidthChange
		this.onNoChange = onNoChange

		this.getWidth = getWidth
		this.getHeight = getHeight
		this.listenForResize = listenForResize

		this.onResize = debounce(
			this._onResize,
			SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL,
			{
				onStart: onResizeStart,
				onStop: onResizeStop
			}
		)
	}

	start() {
		this.isActive = true
		if (this.bypass) {
			return
		}
		this.width = this.getWidth()
		this.height = this.getHeight()
		this.unlistenResize = this.listenForResize(this.onResize)
	}

	stop() {
		this.isActive = false
		this.width = undefined
		this.height = undefined
		if (this.unlistenResize) {
			this.unlistenResize()
			this.unlistenResize = undefined
		}
	}

	/**
	 * On scrollable container resize.
	 */
	_onResize = () => {
		// If `VirtualScroller` has been unmounted
		// while `debounce()`'s `setTimeout()` was waiting, then exit.
		// If the `VirtualScroller` gets restarted later, it will detect
		// that `state.scrollableContainerWidth` doesn't match the actual
		// scrollable container width, and will call `this.onResize()`.
		if (!this.isActive) {
			return
		}

		const prevScrollableContainerWidth = this.width
		const prevScrollableContainerHeight = this.height

		this.width = this.getWidth()
		this.height = this.getHeight()

		if (this.width === prevScrollableContainerWidth) {
			if (this.height === prevScrollableContainerHeight) {
				// The dimensions of the container didn't change,
				// so there's no need to re-layout anything.
				this.onNoChange()
			} else {
				// Scrollable container height has changed,
				// so just recalculate shown item indexes.
				// No need to perform a re-layout from scratch.
				this.onHeightChange(prevScrollableContainerHeight, this.height)
			}
		} else {
			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			this.onWidthChange(prevScrollableContainerWidth, this.width)
		}
	}
}

const SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL = 250