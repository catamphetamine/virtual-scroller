export default class ItemsContainer {
	/**
	 * Constructs a new "container" from an element.
	 * @param {function} getElement
	 */
	constructor(getElement) {
		this.getElement = getElement
	}

	/**
	 * Returns an item element's "top offset", relative to the items `container`'s top edge.
	 * @param  {number} renderedElementIndex — An index of an item relative to the "first shown item index". For example, if the list is showing items from index 8 to index 12 then `renderedElementIndex = 0` would mean the item at index `8`.
	 * @return {number}
	 */
	getNthRenderedItemTopOffset(renderedElementIndex) {
		return this.getElement().childNodes[renderedElementIndex].getBoundingClientRect().top - this.getElement().getBoundingClientRect().top
	}

	/**
	 * Returns an item element's height.
	 * @param  {number} renderedElementIndex — An index of an item relative to the "first shown item index". For example, if the list is showing items from index 8 to index 12 then `renderedElementIndex = 0` would mean the item at index `8`.
	 * @return {number}
	 */
	getNthRenderedItemHeight(renderedElementIndex) {
		// `offsetHeight` is not precise enough (doesn't return fractional pixels).
		// return this.getElement().childNodes[renderedElementIndex].offsetHeight
		return this.getElement().childNodes[renderedElementIndex].getBoundingClientRect().height
	}

	/**
	 * Returns items container height.
	 * @return {number}
	 */
	getHeight() {
		// `offsetHeight` is not precise enough (doesn't return fractional pixels).
		// return this.getElement().offsetHeight
		return this.getElement().getBoundingClientRect().height
	}

	/**
	 * Removes all item elements of an items container.
	 */
	clear() {
		while (this.getElement().firstChild) {
			this.getElement().removeChild(this.getElement().firstChild)
		}
	}
}