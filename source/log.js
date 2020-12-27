export default function log(...args) {
	if (isDebug()) {
		console.log(...['[virtual-scroller]'].concat(args))
	}
}

export function reportError(...args) {
	if (typeof window !== 'undefined') {
		// In a web browser.
		// Output a debug message immediately so that it's known
		// at which point did the error occur between other debug logs.
		log.apply(this, ['ERROR'].concat(args))
		setTimeout(() => {
			// Throw an error in a timeout so that it doesn't interrupt the application's flow.
			// At the same time, by throwing a client-side error, such error could be spotted
			// in some error monitoring software like `sentry.io`, while also being visible
			// in the console.
			// The `.join(' ')` part doesn't support stringifying JSON objects,
			// but those don't seem to be used in any of the error messages.
			throw new Error(['[virtual-scroller]'].concat(args).join(' '))
		}, 0)
	} else {
		// On a server.
		console.error(...['[virtual-scroller]'].concat(args))
	}
}

export function isDebug() {
	return typeof window !== 'undefined' && window.VirtualScrollerDebug
}