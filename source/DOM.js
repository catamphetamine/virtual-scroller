/**
 * Returns the DOM element's `top` and `left` offset relative to the document.
 * `document` can potentially have margins so this function takes care of that.
 * Calling `getOffset()` on an element is about 0.003 milliseconds on a modern desktop CPU.
 * @param  {object} element
 * @return {object} `{ top: number, left: number, width: number, height: number }`
 */
export function getOffset(element) {
	// Copied from:
	// http://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document

	// Calling `.getBoundingClientRect()` on an element is
	// about 0.002 milliseconds on a modern desktop CPU.
	const onScreenCoordinates = element.getBoundingClientRect()

	const documentLeftBorderWidth = document.clientLeft || document.body.clientLeft || 0
	const documentTopBorderWidth  = document.clientTop || document.body.clientTop || 0

	// `window.scrollY` and `window.scrollX` aren't supported in Internet Explorer.
	const scrollY = window.pageYOffset
	const scrollX = window.pageXOffset

	const top  = onScreenCoordinates.top + scrollY - documentTopBorderWidth
	const left = onScreenCoordinates.left + scrollX - documentLeftBorderWidth

	return {
		top,
		left,
		width: onScreenCoordinates.width,
		height: onScreenCoordinates.height
	}
}

export function getScrollY() {
	// `window.scrollY` is not supported by Internet Explorer.
	return window.pageYOffset
}

export function clearElement(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild)
	}
}

export function getScreenHeight() {
	return window.innerHeight
}

export function getScreenWidth() {
	return window.innerWidth
}

export function getScreenBounds() {
	const height = getScreenHeight()
	return {
		// The first pixel of the viewport.
		top: getScrollY(),
		// The pixel after the last pixel of the viewport.
		bottom: getScrollY() + height,
		height
	}
}