import ItemNotRenderedError from '../ItemNotRenderedError.js'

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
		const children = this.getElement().children
		const maxWidth = this.getElement().width
		let topOffset = this.getElement().paddingTop

		let rowWidth
		let rowHeight
		let startNewRow = true

		if (renderedElementIndex > children.length - 1) {
			throw new ItemNotRenderedError({
				renderedElementIndex,
				renderedElementsCount: children.length
			})
		}

		let i = 0
		while (i <= renderedElementIndex) {
			if (startNewRow || rowWidth + children[i].width > maxWidth) {
				if (i > 0) {
					topOffset += rowHeight
					topOffset += children[i].marginTop
				}
				rowWidth = children[i].width
				rowHeight = children[i].height
				if (rowWidth > maxWidth) {
					startNewRow = true
				} else {
					startNewRow = false
				}
			} else {
				rowWidth += children[i].width
				rowHeight = Math.max(rowHeight, children[i].height)
			}
			i++
		}

		return topOffset
	}

	/**
	 * Returns an item element's height.
	 * @param  {number} renderedElementIndex — An index of an item relative to the "first shown item index". For example, if the list is showing items from index 8 to index 12 then `renderedElementIndex = 0` would mean the item at index `8`.
	 * @return {number}
	 */
	getNthRenderedItemHeight(renderedElementIndex) {
		const children = this.getElement().children

		if (renderedElementIndex > children.length - 1) {
			throw new ItemNotRenderedError({
				renderedElementIndex,
				renderedElementsCount: children.length
			})
		}

		return children[renderedElementIndex].height
	}

	/**
	 * Returns items container height.
	 * @return {number}
	 */
	getHeight() {
		const children = this.getElement().children
		const maxWidth = this.getElement().width
		let contentHeight = this.getElement().paddingTop
		let i = 0
		while (i < children.length) {
			let rowWidth = 0
			let rowHeight = 0
			while (rowWidth <= maxWidth && i < children.length) {
				if (rowWidth === 0 && i > 0) {
					const verticalSpacing = children[i].marginTop
					contentHeight += verticalSpacing
				}
				rowWidth += children[i].width
				rowHeight = Math.max(rowHeight, children[i].height)
				i++
			}
			contentHeight += rowHeight
		}
		contentHeight += this.getElement().paddingBottom
		return contentHeight
	}

	/**
	 * Removes all item elements of an items container.
	 */
	clear() {
		this.getElement().children = []
	}
}