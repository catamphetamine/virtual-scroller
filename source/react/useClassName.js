import { TBODY_CLASS_NAME } from '../DOM/tbody.js'

export default function useClassName(className, { tbody }) {
	// For `<tbody/>`, a workaround is used which uses CSS variables
	// and a special CSS class name "VirtualScroller".
	// See `addTbodyStyles()` function in `../DOM/tbody.js` for more details.
	if (tbody) {
		if (className) {
			return className + ' ' + TBODY_CLASS_NAME
		}
		return TBODY_CLASS_NAME
	}
	return className
}