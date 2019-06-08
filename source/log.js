export default function log(...args) {
	if (isDebug()) {
		console.log(...['[virtual-scroller]'].concat(args))
	}
}

export function isDebug() {
	return typeof window !== 'undefined' && window.VirtualScrollerDebug
}