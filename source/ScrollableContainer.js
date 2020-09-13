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

	onResize(onResize) {
		// Could somehow track DOM Element size.
		// For now, `scrollableContainer` is supposed to have constant width and height.
		// (unless window is resized).
		// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
		// https://web.dev/resize-observer/
		let unobserve
		if (typeof ResizeObserver !== 'undefined') {
			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					// // If `entry.contentBoxSize` property is supported by the web browser.
					// if (entry.contentBoxSize) {
					// 	// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentBoxSize
					// 	const width = entry.contentBoxSize.inlineSize
					// 	const height = entry.contentBoxSize.blockSize
					// }
					return onResize()
				}
			})
			resizeObserver.observe(this.element)
			unobserve = () => resizeObserver.unobserve(this.element)
		}
		// I guess, if window is resized, `onResize()` will be triggered twice:
		// once for window resize, and once for the scrollable container resize.
		// But `onResize()` also has an internal check: if the size didn't change
		// then it's not run.
		const unlistenWindowResize = new ScrollableWindowContainer().onResize(onResize)
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

	onResize(onResize) {
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}

	// isVisible() {
	// 	return true
	// }
}