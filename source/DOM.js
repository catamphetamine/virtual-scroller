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

// export function getScreenWidth() {
// 	// Doesn't correctly reflect page zoom in iOS Safari.
// 	// (doesn't scale screen width accordingly).
// 	// (but does reflect page zoom in desktop Chrome).
// 	return document.documentElement.clientWidth
// }

// https://javascript.info/size-and-scroll-window
// `<!DOCTYPE html>` may be required in order for this to work correctly.
// Includes scrollbar (if any).
export function getScreenWidth() {
	// Correctly reflects page zoom in iOS Safari.
	// (scales screen width accordingly).
	// But, includes scrollbar (if any).
	return window.innerWidth
}

// export function getScreenHeight() {
// 	// Doesn't support iOS Safari's dynamically shown/hidden
// 	// top URL bar and bottom actions bar.
// 	// https://codesandbox.io/s/elegant-fog-iddrh
// 	// Tested in IE 11.
// 	// It also doesn't correctly reflect page zoom in iOS Safari.
// 	// (doesn't scale screen height accordingly).
// 	// (but does reflect page zoom in desktop Chrome).
// 	return document.documentElement.clientHeight
// }

// https://javascript.info/size-and-scroll-window
// `<!DOCTYPE html>` is required in order for this to work correctly.
// Without it, the returned height would be the height of the entire document.
// Includes scrollbar (if any).
export function getScreenHeight() {
	// This variant of `getScreenHeight()`
	// supports iOS Safari's dynamically shown/hidden
	// top URL bar and bottom actions bar.
	// https://codesandbox.io/s/elegant-fog-iddrh
	// Tested in IE 11.
	// It also correctly reflects page zoom in iOS Safari.
	// (scales screen height accordingly).
	// But, includes scrollbar (if any).
	return window.innerHeight
}

// // This variant of `getScreenHeight()`
// // supports iOS Safari's dynamically shown/hidden
// // top URL bar and bottom actions bar.
// // https://codesandbox.io/s/elegant-fog-iddrh
// // Tested in IE 11.
// // It doesn't correctly reflect page zoom in iOS Safari.
// // (doesn't scale screen height accordingly).
// // (but does reflect page zoom in desktop Chrome).
// function getScreenHeight() {
// 	const div = document.createElement('div')
// 	div.style.position = 'fixed'
// 	div.style.left = 0
// 	div.style.top = 0
// 	div.style.right = 0
// 	div.style.bottom = 0
// 	div.style.zIndex = -1
// 	document.body.appendChild(div)
// 	const height = div.clientHeight
// 	document.body.removeChild(div)
// 	return height
// }

export function getScreenBounds() {
	const height = getScreenHeight()
	return {
		// The first pixel of the screen.
		top: getScrollY(),
		// The pixel after the last pixel of the screen.
		bottom: getScrollY() + height,
		height
	}
}