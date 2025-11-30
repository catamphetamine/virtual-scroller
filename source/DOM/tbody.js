// A workaround for `<tbody/>` not being able to have `padding`.
// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1

import px from '../utility/px.js'

export const BROWSER_NOT_SUPPORTED_ERROR = 'It looks like you\'re using Internet Explorer which doesn\'t support CSS variables required for a <tbody/> container. VirtualScroller has been switched into "bypass" mode (render all items). See: https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1'

function isInternetExplorer() {
	// This function detects Internet Explorer using `documentMode` IE-only property.
	// https://stackoverflow.com/questions/19999388/check-if-user-is-using-ie
	// The `documentMode` property exists in IE 9-11. Maybe even IE 8.
	// http://msdn.microsoft.com/en-us/library/ie/cc196988(v=vs.85).aspx
	return typeof window !== 'undefined' && Boolean(window.document.documentMode)
}

export function supportsTbody() {
	// Internet Explorer doesn't support CSS Variables
	// and therefore it will not be able to apply the `<tbody/>` workaround.
	return !isInternetExplorer()
}

export const CLASS_NAME_FOR_TBODY_WORKAROUND = 'VirtualScroller'
const STYLE_ELEMENT_ID = 'VirtualScrollerStyle'

export function hasTbodyStyles(tbody) {
	return tbody.classList.contains(CLASS_NAME_FOR_TBODY_WORKAROUND) &&
		Boolean(document.getElementById(STYLE_ELEMENT_ID))
}

export function addTbodyStyles(tbody) {
	// `classList.add` is supported in Internet Explorer 10+.
	tbody.classList.add(CLASS_NAME_FOR_TBODY_WORKAROUND)

	// Create a `<style/>` element.
	const style = document.createElement('style')
	style.id = STYLE_ELEMENT_ID

	// CSS variables aren't supported in Internet Explorer.
	style.innerText = `
		tbody.${CLASS_NAME_FOR_TBODY_WORKAROUND}:before {
			content: '';
			display: table-row;
			height: var(--VirtualScroller-paddingTop);
		}
		tbody.${CLASS_NAME_FOR_TBODY_WORKAROUND}:after {
			content: '';
			display: table-row;
			height: var(--VirtualScroller-paddingBottom);
		}
	`.replace(/[\n\t]/g, '')

	document.head.appendChild(style)
}

export function setTbodyPadding(tbody, beforeItemsHeight, afterItemsHeight) {
	// CSS variables aren't supported in Internet Explorer.
	tbody.style.setProperty('--VirtualScroller-paddingTop', px(beforeItemsHeight));
	tbody.style.setProperty('--VirtualScroller-paddingBottom', px(afterItemsHeight));
}