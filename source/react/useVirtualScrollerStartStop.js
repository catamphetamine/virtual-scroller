import { useLayoutEffect, useEffect, useRef } from 'react'

import log from '../utility/debug.js'

export default function useVirtualScrollerStartStop(virtualScroller, { readyToStart }) {
	const hasStarted = useRef(false)

	const startIfReadyToStartAndNotStarted = () => {
		if (!hasStarted.current) {
			if (readyToStart === false) {
				log('Could\'ve started but isn\'t ready to start')
			} else {
				hasStarted.current = true
				// Start listening to scroll events.
				virtualScroller.start()
			}
		}
	}

	const stopIfStarted = () => {
		if (hasStarted.current) {
			// Stop listening to scroll events.
			virtualScroller.stop()
			// Can be re-started.
			hasStarted.current = false
		}
	}

	// Uses `useLayoutEffect()` here rather than just `useEffect()`
	// in order to reduce the timeframe of showing an empty list to the user.
	useLayoutEffect(() => {
		startIfReadyToStartAndNotStarted()
		return stopIfStarted
	}, [])

	const readyToStartPrev = useRef(readyToStart)

	useEffect(() => {
		if (readyToStartPrev.current === false && readyToStart !== false) {
			readyToStartPrev.current = readyToStart
			log('Is ready to start')
			startIfReadyToStartAndNotStarted()
		}
	}, [readyToStart])
}