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
/**
 * Same as `lodash`'s `debounce()` for functions with no arguments.
 * @param  {function} func
 * @param  {number} interval
 * @return {function}
 */
export function debounce(func, interval) {
	let timeout
	return function(...args) {
		clearTimeout(timeout)
		timeout = setTimeout(() => func.apply(this, args), interval)
	}
}

/**
 * Rounds coordinates upto 4th decimal place (after dot) and appends "px".
 * Small numbers could be printed as `"1.2345e-50"` unless rounded:
 * that would be invalid "px" value in CSS.
 * @param {number}
 * @return {string}
 */
export function px(number) {
	// Fractional pixels are used on "retina" screens.
  return number.toFixed(2) + 'px'
}