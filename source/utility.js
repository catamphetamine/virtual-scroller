/**
 * Same as `lodash`'s `throttle()` for functions with no arguments.
 * @param  {function} func
 * @param  {number} interval
 * @return {function}
 */
export function throttle(func, interval) {
	let timeout
	let executedAt = 0
	let scheduled = function() {
		timeout = undefined
		executedAt = Date.now()
		func()
	}
	return function() {
		const now = Date.now()
		const remaining = interval - (now - executedAt)
		if (remaining <= 0) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = undefined
			}
			executedAt = now
			func()
		} else if (!timeout) {
			timeout = setTimeout(scheduled, remaining)
		}
	}
}