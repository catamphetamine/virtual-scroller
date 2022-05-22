export default class ScrollableContainer {
	/**
	 * Constructs a new "scrollable container" from an element.
	 * @param {func} getElement — Returns the scrollable container element.
	 * @param {func} getItemsContainerElement — Returns items "container" element.
	 */
	constructor(getElement, getItemsContainerElement) {
		this.getElement = getElement
		this.getItemsContainerElement = getItemsContainerElement
		this.scrollTop = 0
	}

	/**
	 * Returns the current scroll position.
	 * @return {number}
	 */
	getScrollY() {
		return this.scrollTop
	}

	/**
	 * Scrolls to a specific position.
	 * @param {number} scrollY
	 */
	scrollToY(scrollY) {
		this.scrollTop = scrollY
		if (this.onScrollListener) {
			this.onScrollListener()
		}
	}

	/**
	 * Returns "scrollable container" width,
	 * i.e. the available width for its content.
	 * @return {number}
	 */
	getWidth() {
		return this.getElement().width
	}

	/**
	 * Returns the height of the "scrollable container" itself.
	 * Not to be confused with the height of "scrollable container"'s content.
	 * @return {number}
	 */
	getHeight() {
		return this.getElement().height
	}

	/**
	 * Returns a "top offset" of an items container element
	 * relative to the "scrollable container"'s top edge.
	 * @return {number}
	 */
	getItemsContainerTopOffset() {
		return 0
	}

	/**
	 * Adds a "scroll" event listener to the "scrollable container".
	 * @param {onScroll} Should be called whenever the scroll position inside the "scrollable container" (potentially) changes.
	 * @return {function} Returns a function that stops listening.
	 */
	onScroll(onScroll) {
		this.onScrollListener = onScroll
		return () => {
			delete this.onScrollListener
		}
	}

	/**
	 * Adds a "resize" event listener to the "scrollable container".
	 * @param {onResize} Should be called whenever the "scrollable container"'s width or height (potentially) changes.
	 * @return {function} Returns a function that stops listening.
	 */
	onResize(onResize) {
		this.onResizeListener = onResize
		return () => {
			delete this.onResizeListener
		}
	}

	// Returns a `Promise` because `this.onResizeListener()` is a "debounced" function.
	// See `./utility/debounce.js` for more details.
	_triggerResizeListener() {
		return this.onResizeListener()
	}
}