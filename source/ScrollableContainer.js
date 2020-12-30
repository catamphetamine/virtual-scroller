import {
	getScrollY,
	getScreenHeight,
	getScreenWidth
} from './DOM'

export default class ScrollableContainer {
	constructor(element) {
		this.element = element
	}

	getScrollY() {
		return this.element.scrollTop
	}

	scrollTo(scrollX, scrollY) {
		this.element.scrollTo(scrollX, scrollY)
	}

	getWidth() {
		return this.element.offsetWidth
	}

	getHeight() {
		// if (!this.element && !precise) {
		// 	return getScreenHeight()
		// }
		return this.element.offsetHeight
	}

	/**
	 * Returns the height of the content in a scrollable container.
	 * For example, a scrollable container can have a height of 500px,
	 * but the content in it could have a height of 5000px,
	 * so that a vertical scrollbar is rendered, and only one-tenth
	 * of all the items is shown at any given moment.
	 * This function is currently only used when using the
	 * `preserveScrollPositionOfTheBottomOfTheListOnMount` feature.
	 * @return {number}
	 */
	getContentHeight() {
		return this.element.scrollHeight
	}

	getTopOffset(element) {
		const scrollableContainerTop = this.element.getBoundingClientRect().top
		const scrollableContainerBorderTopWidth = this.element.clientTop
		const top = element.getBoundingClientRect().top
		return (top - scrollableContainerTop) + this.getScrollY() - scrollableContainerBorderTopWidth
	}

	// isVisible() {
	// 	const { top, bottom } = this.element.getBoundingClientRect()
	// 	return bottom > 0 && top < getScreenHeight()
	// }

	addScrollListener(listener) {
		this.element.addEventListener('scroll', listener)
		return () => this.element.removeEventListener('scroll', listener)
	}

	onResize(onResize, { container }) {
		// Could somehow track DOM Element size.
		// For now, `scrollableContainer` is supposed to have constant width and height.
		// (unless window is resized).
		// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
		// https://web.dev/resize-observer/
		let unobserve
		if (typeof ResizeObserver !== 'undefined') {
			const resizeObserver = new ResizeObserver((entries) => {
				// "one entry per observed element".
				// https://web.dev/resize-observer/
				// `entry.target === this.element`.
				const entry = entries[0]
				// // If `entry.contentBoxSize` property is supported by the web browser.
				// if (entry.contentBoxSize) {
				// 	// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentBoxSize
				// 	const width = entry.contentBoxSize.inlineSize
				// 	const height = entry.contentBoxSize.blockSize
				// }
				onResize()
			})
			resizeObserver.observe(this.element)
			unobserve = () => resizeObserver.unobserve(this.element)
		}
		// I guess, if window is resized, `onResize()` will be triggered twice:
		// once for window resize, and once for the scrollable container resize.
		// But `onResize()` also has an internal check: if the size didn't change
		// then it's not run.
		const unlistenWindowResize = new ScrollableWindowContainer().onResize(onResize, { container })
		return () => {
			if (unobserve) {
				unobserve()
			}
			unlistenWindowResize()
		}
	}
}

export class ScrollableWindowContainer extends ScrollableContainer {
	constructor() {
		super(window)
	}

	getScrollY() {
		return getScrollY()
	}

	getWidth() {
		return getScreenWidth()
	}

	getHeight() {
		return getScreenHeight()
	}

	getContentHeight() {
		return document.documentElement.scrollHeight
	}

	getTopOffset(element) {
		const borderTopWidth = document.clientTop || document.body.clientTop || 0
		return element.getBoundingClientRect().top + this.getScrollY() - borderTopWidth
	}

	onResize(onResize, { container }) {
		const onResizeListener = () => {
			// By default, `VirtualScroller` always performs a re-layout
			// on window `resize` event. But browsers (Chrome, Firefox)
			// [trigger](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes)
			// window `resize` event also when a user switches into fullscreen mode:
			// for example, when a user is watching a video and double-clicks on it
			// to maximize it. And also when the user goes out of the fullscreen mode.
			// Each such fullscreen mode entering/exiting will trigger window `resize`
			// event that will it turn trigger a re-layout of `VirtualScroller`,
			// resulting in bad user experience. To prevent that, such cases are filtered out.
			// Some other workaround:
			// https://stackoverflow.com/questions/23770449/embedded-youtube-video-fullscreen-or-causing-resize
			if (document.fullscreenElement) {
				// If the fullscreened element doesn't contain the list
				// (and is not the list itself), then the layout hasn't been affected,
				// so don't perform a re-layout.
				//
				// For example, suppose there's a list of items, and some item contains a video.
				// If, upon clicking such video, it plays inline, and the user enters
				// fullscreen mode while playing such inline video, then the layout won't be
				// affected, and so such `resize` event should be ignored: when
				// `document.fullscreenElement` is in a separate "branch" relative to the
				// `container`.
				//
				// Another scenario: suppose that upon click, the video doesn't play inline,
				// but instead a "Slideshow" component is open, with the video shown at the
				// center of the screen in an overlay. If then the user enters fullscreen mode,
				// the layout wouldn't be affected too, so such `resize` event should also be
				// ignored: when `document.fullscreenElement` is inside the `container`.
				//
				if (document.fullscreenElement.contains(container)) {
					// The element is either the `container`'s ancestor,
					// Or is the `container` itself.
					// (`a.contains(b)` includes the `a === b` case).
					// So the `resize` event will affect the `container`'s dimensions.
				} else {
					// The element is either inside the `container`,
					// Or is in a separate tree.
					// So the `resize` event won't affect the `container`'s dimensions.
					return
				}
			}
			onResize()
		}
		window.addEventListener('resize', onResizeListener)
		return () => window.removeEventListener('resize', onResizeListener)
	}

	// isVisible() {
	// 	return true
	// }
}