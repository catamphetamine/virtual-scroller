import { useState, useRef, useLayoutEffect } from 'react'

// Creates state management functions.
export default function _useState({ initialState, onRender, items }) {
	// `VirtualScroller` state.
	//
	// The `_stateUpdate` variable shouldn't be used directly
	// because in some cases its value may not represent
	// the actual `state` of the `VirtualScroller`.
	//
	// * It will contain an incorrect initial value if `initialState` property is passed
	//   because it doesn't get initialized to `initialState`.
	//
	// * If `items` property gets changed, `state` reference variable gets updated immediately
	//   but the `_stateUpdate` variable here doesn't (until the component re-renders some other time).
	//
	// Instead, use the `state` reference below.
	//
	const [_stateUpdate, _setStateUpdate] = useState()

	// This `state` reference is used for accessing the externally stored
	// virtual scroller state from inside a `VirtualScroller` instance.
	//
	// It's also the "source of truth" on the actual `VirtualScroller` state.
	//
	const state = useRef(initialState)

	// Accumulates state updates until they have been applied.
	const targetState = useRef(initialState)

	// Update the current state reference.
	//
	// Ignores the cases when `state` reference has already been updated
	// "immediately" bypassing a `_setStateUpdate()` call, because
	// in that case, `_stateUpdate` holds a stale value.
	//
	if (state.current !== targetState.current) {
		state.current = _stateUpdate
	}

	// Call `onRender()` right after every state update.
	//
	// When `items` property changes, `useHandleItemsChange()` hook doesn't call
	// `_setStateUpdate()` because there's no need for a re-render.
	// But chaning `items` still does trigger a `VirtualScroller` state update,
	// so added `items` property in the list of this "effect"'s dependencies.
	//
	useLayoutEffect(() => {
		onRender()
	}, [
		_stateUpdate,
		items
	])

	return {
		getState: () => state.current,

		// Updates existing state.
		//
		// State updates are incremental meaning that this code should mimick
		// the classic `React.Component`'s `this.setState()` behavior
		// when calling `this.setState()` doesn't replace `state` but rather merges
		// a set of the updated state properties with the rest of the old ones.
		//
		// The reason is that `useState()` updates are "asynchronous" (not immediate),
		// and simply merging over `...state` would merge over potentially stale
		// property values in cases when more than a single `updateState()` call is made
		// before the state actually updates, resulting in losing some of the state updates.
		//
		// For example, the first `updateState()` call updates shown item indexes,
		// and the second `updateState()` call updates `verticalSpacing`.
		// If it was simply `updateState({ ...state, ...stateUpdate })`
		// then the second state update could overwrite the first state update,
		// resulting in incorrect items being shown/hidden.
		//
		// Using `...state.current` instead of `...pendingState.current` here
		// would produce "stale" results.
		//
		updateState: (stateUpdate) => {
			const newState = {
				...targetState.current,
				...stateUpdate
			}
			targetState.current = newState
			// If `items` property did change the component detects it at render time
			// and updates `VirtualScroller` items immediately by calling `.setItems()`.
			// But, since all of that happens at render time and not in an "effect",
			// if the state update was done as usual by calling `_setStateUpdate()`,
			// React would throw an error about updating state during render.
			// Hence, state update in that particular case should happen "directly",
			// without waiting for an "asynchronous" effect to trigger and call
			// an "asyncronous" `_setStateUpdate()` function.
			//
			// Updating state directly in that particular case works because there
			// already is a render ongoing, so there's no need to re-render the component
			// again after such render-time state update.
			//
			// When the initial `VirtualScroller` state is being set, it contains an `.items`
			// property too, but that initial setting is done using another function called
			// `setInitialState()`, so using `if (stateUpdate.items)` condition here for describing
			// just the case when `state` has been updated as a result of a `setItems()` call
			// seems to be fine.
			//
			if (stateUpdate.items) {
				// If a `stateUpdate` contains `items` then it means that there was a `setItems()` call.
				// No need to trigger a re-render — the component got re-rendered anyway.
				// Just update the `state` "in place".
				state.current = newState
			} else {
				_setStateUpdate(newState)
			}
		}
	}
}