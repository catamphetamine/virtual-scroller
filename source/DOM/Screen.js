export default class Screen {
	/**
	 * Returns a child element's "top offset", relative to the `parentElement`'s top edge.
	 * @param  {Element} parentElement
	 * @param  {number} childElementIndex
	 * @return {number}
	 */
	getChildElementTopOffset(parentElement, childElementIndex) {
		return parentElement.childNodes[childElementIndex].getBoundingClientRect().top
	}

	/**
	 * Returns a child element's height.
	 * @param  {Element} parentElement
	 * @param  {number} childElementIndex
	 * @return {number}
	 */
	getChildElementHeight(parentElement, childElementIndex) {
		return this.getElementHeight(parentElement.childNodes[childElementIndex])
	}

	/**
	 * Returns the count of child elements of an element.
	 * @param  {Element} parentElement
	 * @return {number}
	 */
	getChildElementsCount(parentElement) {
		return parentElement.childNodes.length
	}

	/**
	 * Removes all child elements of an element.
	 * @param  {Element} element
	 */
	clearElement(element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild)
		}
	}

	/**
	 * Returns an element's height.
	 * @param  {Element} element
	 * @return {number}
	 */
	getElementHeight(element) {
		// `offsetHeight` is not precise enough (doesn't return fractional pixels).
		// return element.offsetHeight
		return element.getBoundingClientRect().height
	}
}