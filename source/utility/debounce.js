// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

/**
 * Same as `lodash`'s `debounce()` for functions with no arguments.
 * @param  {function} func
 * @param  {number} interval
 * @param  {function} [options.onStart]
 * @param  {function} [options.onStop]
 * @return {function}
 */
export default function debounce(func, interval, { onStart, onStop } = {}) {
	let timeout
	return function(...args) {
		return new Promise((resolve) => {
			if (timeout) {
				clearTimeout(timeout)
			} else {
				if (onStart) {
					onStart()
				}
			}
			timeout = setTimeout(() => {
				timeout = undefined
				if (onStop) {
					onStop()
				}
				func.apply(this, args)
				resolve()
			}, interval)
		})
	}
}
