function getScrollX() {
	// `window.scrollX` is not supported by Internet Explorer.
	return window.pageXOffset
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