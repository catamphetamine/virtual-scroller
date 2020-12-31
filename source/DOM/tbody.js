// A workaround for `<tbody/>` not being able to have `padding`.
// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1

import px from '../utility/px'

export const BROWSER_NOT_SUPPORTED_ERROR = 'It looks like you\'re using Internet Explorer which doesn\'t support CSS variables required for a <tbody/> container. VirtualScroller has been switched into "bypass" mode (render all items). See: https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1'

export function supportsTbody() {
	// Detect Internet Explorer.
	// https://stackoverflow.com/questions/19999388/check-if-user-is-using-ie
	// `documentMode` is an IE-only property.
	// Supports IE 9-11. Maybe even IE 8.
	// http://msdn.microsoft.com/en-us/library/ie/cc196988(v=vs.85).aspx
	if (typeof window !== 'undefined' && window.document.documentMode) {
		// CSS variables aren't supported in Internet Explorer.
		return false
	}
	return true
}

export function addTbodyStyles(tbody) {
	// `classList.add` is supported in Internet Explorer 10+.
	tbody.classList.add('VirtualScroller')
	let style = document.getElementById('VirtualScrollerStyle')
	if (!style) {
		style = document.createElement('style')
		style.id = 'VirtualScrollerStyle'
		// CSS variables aren't supported in Internet Explorer.
		style.innerText = `
			tbody.VirtualScroller:before {
				content: '';
				display: table-row;
				height: var(--VirtualScroller-paddingTop);
			}
			tbody.VirtualScroller:after {
				content: '';
				display: table-row;
				height: var(--VirtualScroller-paddingBottom);
			}
		`.replace(/[\n\t]/g, '')
		document.head.appendChild(style)
	}
}

export function setTbodyPadding(tbody, beforeItemsHeight, afterItemsHeight) {
	// CSS variables aren't supported in Internet Explorer.
	tbody.style.setProperty('--VirtualScroller-paddingTop', px(beforeItemsHeight));
	tbody.style.setProperty('--VirtualScroller-paddingBottom', px(afterItemsHeight));
}