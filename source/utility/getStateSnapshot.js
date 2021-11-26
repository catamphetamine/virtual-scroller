// Creates a snapshot of a `state` or a partial update of a `state`.
// Is only used for logging state snapshots for later debug.
//
// When `state` is output to the browser console via `console.log()`,
// it is explorable in real time. That also means that if that `state`
// is modified later, the user will see the modified state, not the
// original one. In the current implementation, `state` is not strictly
// "immutable": things like individual item heights (including "before resize" ones)
// or states are updated in-place — `state.itemHeights[i] = newItemHeight` or
// `state.itemStates[i] = newItemState`. That's because those `state` properties
// are the ones that don’t affect the presentation, so there's no need to re-render
// the list when those do change — updating those properties is just an effect of
// some change rather than cause for one.
//
// So, when outputting `state` via `console.log()` for debug, it makes sense to
// snapshot it so that the developer, while debugging later, sees the correct
// item heights or item states.
//
export default function getStateSnapshot(state) {
	let stateSnapshot = {
		...state
	}
	if (state.itemHeights) {
		stateSnapshot.itemHeights = state.itemHeights.slice()
	}
	if (state.itemStates) {
		stateSnapshot.itemStates = state.itemStates.slice()
	}
	if (state.beforeResize) {
		stateSnapshot.beforeResize = {
			...state.beforeResize
		}
		stateSnapshot.beforeResize.itemHeights = state.beforeResize.itemHeights.slice()
	}
	return stateSnapshot
}