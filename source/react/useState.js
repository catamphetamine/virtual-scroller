import { useState, useRef, useCallback, useLayoutEffect } from 'react'

// Creates state management functions.
export default function _useState({
	initialState,
	onRender,
	itemsProperty,
	USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION
}) {
	// This is a utility state variable that is used to re-render the component.
	// It should not be used to access the current `VirtualScroller` state.
	// It's more of a "requested" `VirtualScroller` state.
	//
	// It will also be stale in cases when `USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION`
	// feature is used for setting new `items` in state.
	//
	const [_newState, _setNewState] = useState(initialState)

	// This `state` reference is what `VirtualScroller` uses internally.
	// It's the "source of truth" on the actual `VirtualScroller` state.
	const state = useRef(initialState)

	const setState = useCallback((newState) => {
		state.current = newState
	}, [])

	// Accumulates all "pending" state updates until they have been applied.
	const nextState = useRef(initialState)

	// Updates the actual `VirtualScroller` state right after a requested state update
	// has been applied. Doesn't do anything at initial render.
	useLayoutEffect(() => {
		setState(_newState)
	}, [
		_newState
	])

	// Calls `onRender()` right after every state update (which is a re-render),
	// and also right after the initial render.
	useLayoutEffect(() => {
		onRender()
	}, [
		_newState,
		// When using `USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION` feature,
		// there won't be a `_setNewState()` function call when `items` property changes,
		// hence the additional `itemsProperty` dependency.
		USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION ? itemsProperty : undefined
	])

	return {
		getState: () => state.current,

		getNextState: () => nextState.current,

		// Requests a state update.
		//
		// State updates are incremental meaning that this function mimicks
		// the classic `React.Component`'s `this.setState()` behavior
		// when calling `this.setState()` didn't replace `state` but rather merged
		// the updated state properties over the "old" state properties.
		//
		// The reason for using pending state updates accumulation is that
		// `useState()` updates are "asynchronous" (not immediate),
		// and simply merging over `...state` would merge over potentially stale
		// property values in cases when more than a single `updateState()` call is made
		// before the state actually updates, resulting in losing some of those state updates.
		//
		// Example: the first `updateState()` call updates shown item indexes,
		// and the second `updateState()` call updates `verticalSpacing`.
		// If it was simply `updateState({ ...state, ...stateUpdate })`
		// then the second state update could overwrite the first state update,
		// resulting in incorrect items being shown/hidden.
		//
		updateState: (stateUpdate) => {
			nextState.current = {
				...nextState.current,
				...stateUpdate
			}
			// If `items` property did change, the component detects it at render time
			// and updates `VirtualScroller` items immediately by calling `.setItems()`,
			// which, in turn, immediately calls this `updateState()` function
			// with a `stateUpdate` argument that contains the new `items`,
			// so checking for `stateUpdate.items` could detect situations like that.
			//
			// When the initial `VirtualScroller` state is being set, it contains the `.items`
			// property too, but that initial setting is done using another function called
			// `setInitialState()`, so using `if (stateUpdate.items)` condition here for describing
			// just the case when `state` has been updated as a result of a `setItems()` call
			// seems to be fine.
			//
			const _newState = nextState.current
			if (stateUpdate.items && USE_ITEMS_UPDATE_NO_SECOND_RENDER_OPTIMIZATION) {
				setState(_newState)
			} else {
				_setNewState(_newState)
			}
		}
	}
}