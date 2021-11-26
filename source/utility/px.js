/**
 * Rounds coordinates upto 4th decimal place (after dot) and appends "px".
 * Small numbers could be printed as `"1.2345e-50"` unless rounded:
 * that would be invalid "px" value in CSS.
 * @param {number}
 * @return {string}
 */
export default function px(number) {
	// Fractional pixels are used on "retina" screens.
  return (number % 1 === 0 ? number : number.toFixed(2)) + 'px'
}