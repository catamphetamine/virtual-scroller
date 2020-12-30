import { clearElement } from './DOM'

export default class Screen {
	getChildElementTopCoordinate(parentElement, childElementIndex) {
		return parentElement.childNodes[childElementIndex].getBoundingClientRect().top
	}

	getChildElementHeight(parentElement, childElementIndex) {
		return this.getElementHeight(parentElement.childNodes[childElementIndex])
	}

	getChildElementsCount(parentElement) {
		return parentElement.childNodes.length
	}

	clearElement(element) {
		clearElement(element)
	}

	getElementHeight(element) {
		// `offsetHeight` is not precise enough (doesn't return fractional pixels).
		// return element.offsetHeight
		return element.getBoundingClientRect().height
	}
}