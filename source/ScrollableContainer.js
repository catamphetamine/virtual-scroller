import {
	getScrollY,
	getScreenHeight,
	getScreenWidth,
	clearElement
} from './DOM'

export default class ScrollableContainer {
	constructor(getElement) {
		this.getElement = getElement
	}

	getScrollY() {
		return this.getElement().scrollTop
	}

	scrollTo(scrollX, scrollY) {
		this.getElement().scrollTo(scrollX, scrollY)
	}

	getWidth() {
		return this.getElement().offsetWidth
	}

	getHeight() {
		return this.getElement().offsetHeight
	}

	getContentHeight() {
		return this.getElement().scrollHeight
	}

	getTopOffset(element) {
		const scrollableContainerTop = this.getElement().getBoundingClientRect().top
		const scrollableContainerBorderTopWidth = this.getElement().clientTop
		const top = element.getBoundingClientRect().top
		return (top - scrollableContainerTop) + this.getScrollY() - scrollableContainerBorderTopWidth
	}

	// isVisible() {
	// 	const { top, bottom } = this.getElement().getBoundingClientRect()
	// 	return bottom > 0 && top < getScreenHeight()
	// }

	addScrollListener(listener) {
		this.getElement().addEventListener('scroll', listener)
		return () => this.getElement().removeEventListener('scroll', listener)
	}
}

export class ScrollableWindowContainer extends ScrollableContainer {
	constructor() {
		super(() => window)
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

	// isVisible() {
	// 	return true
	// }
}