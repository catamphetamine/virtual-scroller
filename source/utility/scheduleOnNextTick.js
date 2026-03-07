// For some weird reason, in Chrome, `setTimeout()` would lag up to a second (or more) behind.
// Turns out, Chrome developers have deprecated `setTimeout()` API entirely without asking anyone.
// Replacing `setTimeout()` with `requestAnimationFrame()` can work around that Chrome bug.
// https://github.com/bvaughn/react-virtualized/issues/722
import { setTimeout, clearTimeout } from 'request-animation-frame-timeout'

// This function could also use `requestAnimationFrame()` function
// but `setTimeout()` with `0` delay has practically the same effect
// and at the same time it's more universally supported, e.g. in Node.js.
export function scheduleOnNextTick(func) {
	return setTimeout(func, 0)
}

export function unscheduleOnNextTick(timerId) {
	clearTimeout(timerId)
}