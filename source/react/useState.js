import log, { isDebug } from '../utility/debug.js'
import getStateSnapshot from '../utility/getStateSnapshot.js'

import { useRef, useCallback } from 'react'
import useStateNoStaleBug from './useStateNoStaleBug.js'
import useInsertionEffectDontMountTwiceInStrictMode from './useInsertionEffectDontMountTwiceInStrictMode.js'
import useLayoutEffectDontMountTwiceInStrictMode from './useLayoutEffectDontMountTwiceInStrictMode.js'

// Creates state management functions.
export default function _useState({
	initialState,
	onRender
}) {
	// This is a state variable that is used to re-render the component.
	// Right after the component has finished re-rendering,
	// `VirtualScroller` state gets updated from this variable.
	// The reason for that is that `VirtualScroller` state must always
	// correspond exactly to what's currently rendered on the screen.
	const [_newState, _setNewState] = useStateNoStaleBug(initialState)

	// This `state` reference is what `VirtualScroller` uses internally.
	// It's the "source of truth" on the actual `VirtualScroller` state.
	const state = useRef(initialState)

	const getState = useCallback(() => {
		return state.current
	}, [])

	const setState = useCallback((newState) => {
		state.current = newState
	}, [])

	// Updating of the actual `VirtualScroller` state is done in a
	// `useInsertionEffect()` rather than in a `useLayoutEffect()`.
	//
	// The reason is that using `useLayoutEffect()` would result in
	// "breaking" the `<VirtualScroller/>` when an `itemComponent`
	// called `onHeightDidChange()` from its own `useLayoutEffect()`.
	// In those cases, the `itemCompoent`'s effect would run before
	// the `<VirtualScroller/>`'s effect, resulting in
	// `VirtualScroller.onItemHeightDidChange(i)` being run at a moment in time
	// when the DOM has already been updated for the next `VirtualScroller` state
	// but the actual `VirtualScroller` state is still a previous ("stale") one
	// containing "stale" first/last shown item indexes, which would result in an
	// "index out of bounds" error when `onItemHeightDidChange(i)` tries to access
	// and measure the DOM element from item index `i` which doesn't already/yet exist.
	//
	// An example of such situation could be seen from a `VirtualScroller` debug log
	// which was captured for a case when using `useLayoutEffect()` to update the
	// "actual" `VirtualScroller` state after the corresponding DOM changes have been applied:

	// The user has scrolled far enough: perform a re-layout
	// ~ Update Layout (on scroll) ~
	//
	// Item index 2 height is required for calculations but hasn't been measured yet. Mark the item as "shown", rerender the list, measure the item's height and redo the layout.
	//
	// ~ Calculated Layout ~
	// Columns count 1
	// First shown item index 2
	// Last shown item index 5
	// …
	// Item heights (231) [1056.578125, 783.125, empty × 229]
	// Item states (231) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
	//
	// ~ Set state ~
	// {firstShownItemIndex: 2, lastShownItemIndex: 5, …}
	//
	// ~ Rendered ~
	// State {firstShownItemIndex: 2, lastShownItemIndex: 5, …}
	//
	// ~ Measure item heights ~
	// Item index 2 height 719.8828125
	// Item index 3 height 961.640625
	// Item index 4 height 677.6640625
	// Item index 5 height 1510.1953125
	//
	// ~ Update Layout (on non-measured item heights have been measured) ~
	//
	// ~ Calculated Layout ~
	// Columns count 1
	// First shown item index 4
	// Last shown item index 5
	// …
	// Item heights (231) [1056.578125, 783.125, 719.8828125, 961.640625, 677.6640625, 1510.1953125, empty × 225]
	// Item states (231) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …]
	//
	// ~ Set state ~
	// {firstShownItemIndex: 4, lastShownItemIndex: 5, beforeItemsHeight: 3521.2265625, afterItemsHeight: 214090.72265624942}
	//
	// ~ On Item Height Did Change was called ~
	// Item index 5
	// ~ Re-measure item height ~
	// ERROR "onItemHeightDidChange()" has been called for item index 5 but the item is not currently rendered and can't be measured. The exact error was: Element with index 3 was not found in the list of Rendered Item Elements in the Items Container of Virtual Scroller. There're only 2 Elements there.
	//
	// React: ~ The requested state is about to be applied in DOM. Set it as the `VirtualScroller` state. ~
	// {firstShownItemIndex: 4, lastShownItemIndex: 5, …}
	//
	// ~ Rendered ~

	// "~ Rendered ~" is what gets output when `onRender()` function gets called.
	// It means that `useLayoutEffect()` was triggered after `onItemHeightDidChange(i)`
	// was called and after the "ERROR" happened.
	//
	// The "ERROR" happened because new item indexes 4…5 were actually rendered instead of
	// item indexes 2…5 by the time the application called `onItemHeightDidChange(i)` function
	// inside `itemComponent`'s `useLayoutEffect()`.
	// Item indexes 4…5 is what was requested in a `setState()` call, which called `_setNewState()`.
	// This means that `_newState` changes have been applied to the DOM
	// but `useLayoutEffect()` wasn't triggered immediately after that.
	// Instead, it was triggered a right after the `itemComponent`'s `useLayoutEffect()`
	// because child effects run before parent effects.
	// So, the `itemComponent`'s `onHeightDidChange()` function call caught the
	// `VirtualScroller` in an inconsistent state.
	//
	// To fix that, `useLayoutEffect()` gets replaced with `useInsertionEffect()`:
	// https://blog.saeloun.com/2022/06/02/react-18-useinsertioneffect
	// https://beta.reactjs.org/reference/react/useInsertionEffect
	//
	// After replacing `useLayoutEffect()` with `useInsertionEffect()`,
	// the log shows that there's no more error:
	//
	// ~ Set state ~
	// {firstShownItemIndex: 0, lastShownItemIndex: 2, …}
	//
	// React: ~ The requested state is about to be applied in DOM. Set it as the `VirtualScroller` state. ~
	// {firstShownItemIndex: 0, lastShownItemIndex: 2, …}
	//
	// ~ On Item Height Did Change was called ~
	// Item index 0
	// ~ Re-measure item height ~
	// Previous height 917
	// New height 1064.453125
	// ~ Item height has changed ~
	//
	// An alternative solution would be demanding the `itemComponent` to
	// accept a `ref` and then measuring the corresponding DOM element height
	// directly using the `ref`-ed DOM element rather than searching for that
	// DOM element in the `ItemsContainer`.
	// So if `useInsertionEffect()` gets removed from React in some hypothetical future,
	// it could be replaced with using `ref`s on `ItemComponent`s to measure the DOM element heights.
	//
	useInsertionEffectDontMountTwiceInStrictMode(() => {
		// Update the actual `VirtualScroller` state right before the DOM changes
		// are going to be applied for the requested state update.
		//
		// This hook will run right before `useLayoutEffect()`.
		//
		// It doesn't make any difference which one of the two hooks to use to update
		// the actual `VirtualScroller` state in this scenario because the two hooks
		// run synchronously one right after another (insertion effect → DOM update → layout effect)
		// without any free space for any `VirtualScroller` code (like the scroll event handler)
		// to squeeze in and run in-between them, so the `VirtualScroller`'s `state`
		// is always gonna stay consistent with what's currently rendered on screen
		// from the `VirtualScroler`'s point of view, and the short transition period
		// it simply doesn't see because it doesn't "wake up" during that period.
		//
		// Updating the actual `VirtualScroller` state right before `useLayoutEffect()`
		// fixes the bug when an `itemComponent` calls `onHeightDidChange()` in its own
		// `useLayoutEffect()` which would run before this `useLayoutEffect()`
		// because children's effects run before parent's.
		//
		// This hook doesn't do anything at the initial render.
		//
		if (isDebug()) {
			log('React: ~ The requested state is about to be applied in DOM. Setting it as the `VirtualScroller` state. ~')
			log(getStateSnapshot(_newState))
		}
		setState(_newState)
	}, [_newState])

	useLayoutEffectDontMountTwiceInStrictMode(() => {
		// Call `onRender()` right after a requested state update has been applied,
		// and also right after the initial render.
		onRender()
	}, [_newState])

	return {
		// This is the state the component should render.
		stateToRender: _newState,

		// Returns the current state of the `VirtualScroller`.
		// This function is used in the `VirtualScroller` itself
		// because the `state` is managed outside of it.
		getState,

		// Requests a state update.
		setState: _setNewState
	}
}