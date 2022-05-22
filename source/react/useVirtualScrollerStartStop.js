import { useLayoutEffect } from 'react'

export default function useVirtualScrollerStartStop(virtualScroller) {
	useLayoutEffect(() => {
		// Start listening to scroll events.
		virtualScroller.start()
		return () => {
			// Stop listening to scroll events.
			virtualScroller.stop()
		}
	}, [])
}