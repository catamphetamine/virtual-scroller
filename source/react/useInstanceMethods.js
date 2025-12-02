import { useImperativeHandle } from 'react'

import { reportError } from '../utility/debug.js'

// Adds instance methods to the React component.
export default function useInstanceMethods(ref, {
	virtualScroller
}) {
	useImperativeHandle(ref, () => ({
		// This is a proxy for `VirtualScroller`'s `.updateLayout` instance method.
		updateLayout: () => {
			virtualScroller.updateLayout()
		},

		// (deprecated)
		// `.layout()` method name is deprecated, use `.updateLayout()` instead.
    layout: () => {
			virtualScroller.updateLayout()
		},

		// (deprecated)
		updateItem: (i) => {
			reportError(`".updateItem(i)" method of React <VirtualScroller/> has been removed`)
		},

		// (deprecated)
		renderItem: (i) => {
			reportError(`".renderItem(i)" method of React <VirtualScroller/> has been removed`)
		}
	}), [
		virtualScroller
	])
}