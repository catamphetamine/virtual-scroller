import { LAYOUT_REASON } from './Layout'
import debounce from './utility/debounce'

export default class Resize {
	constructor({
		bypass,
		scrollableContainer,
		getContainerElement,
		updateLayout,
		resetStateAndLayout
	}) {
		this.bypass = bypass
		this.scrollableContainer = scrollableContainer
		this.getContainerElement = getContainerElement
		this.updateLayout = updateLayout
		this.resetStateAndLayout = resetStateAndLayout
	}

	listen() {
		if (this.bypass) {
			return
		}
		this.isRendered = true
		this.scrollableContainerWidth = this.scrollableContainer.getWidth()
		this.scrollableContainerHeight = this.scrollableContainer.getHeight()
		this.scrollableContainerUnlistenResize = this.scrollableContainer.onResize(this.onResize, {
			container: this.getContainerElement()
		})
	}

	stop() {
		this.isRendered = false
		if (this.scrollableContainerUnlistenResize) {
			this.scrollableContainerUnlistenResize()
		}
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
				this.updateLayout({ reason: LAYOUT_REASON.RESIZE })
			}
		} else {
			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			this.resetStateAndLayout()
		}
	}, SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL)
}

const SCROLLABLE_CONTAINER_RESIZE_DEBOUNCE_INTERVAL = 250