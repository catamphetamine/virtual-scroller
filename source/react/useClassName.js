import { CLASS_NAME_FOR_TBODY_WORKAROUND } from '../DOM/tbody.js'

export default function useClassName(className, { tbody }) {
	// For `<tbody/>`, a workaround is used which uses CSS variables
	// and a special CSS class name "VirtualScroller".
	// See `addTbodyStyles()` function in `../DOM/tbody.js` for more details.
	if (tbody) {
		if (className) {
			return className + ' ' + CLASS_NAME_FOR_TBODY_WORKAROUND
		}
		return CLASS_NAME_FOR_TBODY_WORKAROUND
	}
	return className
}