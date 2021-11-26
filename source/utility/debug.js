export default function log(...args) {
	if (isDebug()) {
		console.log(...['[virtual-scroller]'].concat(args))
	}
}

export function warn(...args) {
	if (isWarn()) {
		if (warningsAreErrors()) {
			return reportError.apply(this, args)
		}
		console.warn(...['[virtual-scroller]'].concat(args))
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
	const debug = getDebug()
	if (debug !== undefined) {
		return debug === true || debug === 'debug'
	}
}

export function isWarn() {
	// const debug = getDebug()
	// return debug === undefined
	// 	|| debug === true
	// 	|| debug === 'debug'
	// 	|| debug === 'warn'
	//
	return true
}

function getDebug() {
	return getGlobalVariable('VirtualScrollerDebug')
}

function warningsAreErrors() {
	return getGlobalVariable('VirtualScrollerWarningsAreErrors')
}

function getGlobalVariable(name) {
	if (typeof window !== 'undefined') {
		return window[name]
	} else if (typeof global !== 'undefined') {
		return global[name]
	}
}