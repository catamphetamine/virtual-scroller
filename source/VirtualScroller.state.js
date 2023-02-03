import fillArray from './utility/fillArray.js'
import log, { warn, isDebug, reportError } from './utility/debug.js'
import { cleanUpBeforeResizeState } from './BeforeResize.js'
import getStateSnapshot from './utility/getStateSnapshot.js'

// There're three main places where state is updated:
//
// * On scroll.
// * On window resize.
// * On set new items.
//
// State updates may be "asynchronous" (like in React), in which case the
// corresponding operation is "pending" until the state update is applied.
//
// If there's a "pending" window resize or a "pending" update of the set of items,
// then "on scroll" updates aren't dispatched.
//
// If there's a "pending" on scroll update and the window is resize or a new set
// of items is set, then that "pending" on scroll update gets overwritten.
//
// If there's a "pending" update of the set of items, then window resize handler
// sees that "pending" update and dispatches its own state update so that the
// "pending" state update originating from `setItems()` is not lost.
//
// If there's a "pending" window resize, and a new set of items is set,
// then the state update of the window resize handler gets overwritten.

export default function createStateHelpers({
	state: initialState,
	getInitialItemState,
	onStateChange,
	render,
	items: initialItems
}) {
	this.onStateChange = onStateChange
	this._render = render

	this.getInitialItemState = getInitialItemState

	this._setItemState = (i, newItemState) => {
		if (isDebug()) {
			log('~ Item state changed ~')
			log('Item index', i)
			// Uses `JSON.stringify()` here instead of just outputting the JSON objects as is
			// because outputting JSON objects as is would show different results later when
			// the developer inspects those in the web browser console if those state objects
			// get modified in between they've been output to the console and the developer
			// decided to inspect them.
			log('Previous state' + '\n' + JSON.stringify(this.getState().itemStates[i], null, 2))
			log('New state' + '\n' + JSON.stringify(newItemState, null, 2))
		}

		this.getState().itemStates[i] = newItemState

		// Schedule the item state update for after the new items have been rendered.
		if (this.newItemsWillBeRendered) {
			if (!this.itemStatesThatChangedWhileNewItemsWereBeingRendered) {
				this.itemStatesThatChangedWhileNewItemsWereBeingRendered = {}
			}
			this.itemStatesThatChangedWhileNewItemsWereBeingRendered[String(i)] = newItemState
		}
	}

	this.getState = () => this._getState()

	this.updateState = (stateUpdate) => {
		if (isDebug()) {
			log('~ Set state ~')
			log(getStateSnapshot(stateUpdate))
		}

		// Ensure that a non-initial `stateUpdate` can only contain an `items`
		// property when it comes from a `setItems()` call.
		if (stateUpdate.items) {
			if (!this._isSettingNewItems) {
				reportError('A `stateUpdate` can only contain `items` property as a result of calling `.setItems()`')
			}
		}
		this._isSettingNewItems = undefined

		// Update `state`.
		this.previousState = this.getState()
		this._updateState(stateUpdate)
	}

	this.getInitialState = () => {
		if (initialState) {
			return getRestoredState.call(this, initialState)
		}
		return getInitialStateFromScratch.call(this, { getInitialItemState })
	}

	this.useState = ({
		getState,
		updateState
	}) => {
		if (this._isActive) {
			throw new Error('[virtual-scroller] `VirtualScroller` has already been started')
		}

		if (this._getState) {
			throw new Error('[virtual-scroller] Custom state storage has already been configured')
		}

		if (render) {
			throw new Error('[virtual-scroller] Creating a `VirtualScroller` class instance with a `render()` parameter means using the default (internal) state storage')
		}

		if (!getState || !updateState) {
			throw new Error('[virtual-scroller] When using a custom state storage, one must supply both `getState()` and `updateState()` functions')
		}

		this._usesCustomStateStorage = true

		this._getState = getState
		this._updateState = updateState
	}

	this.useDefaultStateStorage = () => {
		if (!render) {
			throw new Error('[virtual-scroller] When using the default (internal) state management, one must supply a `render(state, prevState)` function parameter')
		}

		// Create default `getState()`/`updateState()` functions.
		this._getState = defaultGetState.bind(this)
		this._updateState = defaultUpdateState.bind(this)

		// When `state` is stored externally, a developer is responsible for
		// initializing it with the initial value.
		// Otherwise, if default state management is used, set the initial state now.
		const setInitialState = defaultSetInitialState.bind(this)
		setInitialState(this.getInitialState())
	}

	function defaultGetState() {
		return this.state
	}

	function defaultSetInitialState(newState) {
		this.state = newState
	}

	function defaultUpdateState(stateUpdate) {
		// Because this variant of `.updateState()` is "synchronous" (immediate),
		// it can be written like `...prevState`, and no state updates would be lost.
		// But if it was "asynchronous" (not immediate), then `...prevState`
		// wouldn't work in all cases, because it could be stale in cases
		// when more than a single `updateState()` call is made before
		// the state actually updates, making `prevState` stale.
		this.state = {
			...this.state,
			...stateUpdate
		}

		render(this.state, this.previousState)

		this.onRender()
	}

	/**
	 * Returns the initial state of the `VirtualScroller` "from scratch".
	 * (i.e. not from a previously saved one).
	 * @param {function} [options.getInitialItemState] — Gets initial item state.
	 * @return {object}
	 */
	function getInitialStateFromScratch({ getInitialItemState }) {
		const items = initialItems

		const state = {
			...getInitialLayoutState.call(this, items, { beforeStart: true }),
			items,
			itemStates: fillArray(new Array(items.length), (i) => getInitialItemState(items[i]))
		}

		if (isDebug()) {
			log('Initial state (autogenerated)', getStateSnapshot(state))
		}
		log('First shown item index', state.firstShownItemIndex)
		log('Last shown item index', state.lastShownItemIndex)

		return state
	}

	function getRestoredState(state) {
		if (isDebug()) {
			log('Restore state', getStateSnapshot(state))
		}

		// Possibly clean up "before resize" property in state.
		// "Before resize" state property is cleaned up when all "before resize" item heights
		// have been re-measured in an asynchronous `this.updateState({ beforeResize: undefined })` call.
		// If `VirtualScroller` state was snapshotted externally before that `this.updateState()` call
		// has been applied, then "before resize" property might have not been cleaned up properly.
		state = cleanUpBeforeResizeState(state)

		// Reset `verticalSpacing` so that it re-measures it after the list
		// has been rendered initially. The rationale is that a previously captured
		// inter-item vertical spacing can't be "trusted" in a sense that the user
		// might have resized the window after the previous `state` has been snapshotted.
		// If the user has resized the window, then changing window width might have
		// activated different CSS `@media()` "queries" resulting in a potentially different
		// vertical spacing when the `VirtualScroller` is re-created with such previously
		// snapshotted state.
		state = {
			...state,
			verticalSpacing: undefined
		}

		// `this.verticalSpacing` acts as a "true" source for vertical spacing value.
		// Vertical spacing is also stored in `state` but `state` updates could be
		// "asynchronous" (not applied immediately) and `this.onUpdateShownItemIndexes()`
		// requires vertical spacing to be correct at any time, without any delays.
		// So, vertical spacing is also duplicated in `state`, but the "true" source
		// is still `this.verticalSpacing`.
		//
		// `this.verticalSpacing` must be initialized before calling `this.getInitialStateFromScratch()`
		// because `this.getInitialStateFromScratch()` uses `this.verticalSpacing` in its calculations.
		//
		// With the code above, `state.verticalSpacing` is always gonna be `undefined`,
		// so commented out this code. It's safer to just re-measure vertical spacing
		// from scratch when `VirtualScroller` is mounted.
		//
		// this.verticalSpacing = state ? state.verticalSpacing : undefined

		// Check if the actual `columnsCount` on the screen matches the one from state.
		if (isStateColumnsCountMismatch(state, {
			columnsCount: this.getActualColumnsCount()
		})) {
			warn('Reset Layout')
			state = {
				...state,
				...getInitialLayoutState.call(this, state.items, { beforeStart: false })
			}
		}

		return state
	}

	function getInitialLayoutState(items, { beforeStart }) {
		const itemsCount = items.length

		const getColumnsCount = () => this.getActualColumnsCount()

		const columnsCount = beforeStart
			? this.layout.getInitialLayoutValueWithFallback(
				'columnsCount',
				getColumnsCount,
				1
			)
			: getColumnsCount()

		const {
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		} = this.layout.getInitialLayoutValues({
			itemsCount,
			columnsCount: this.getActualColumnsCount(),
			beforeStart
		})

		const itemHeights = new Array(itemsCount)

		// Optionally preload items to be rendered.
		this.onBeforeShowItems(
			items,
			itemHeights,
			firstShownItemIndex,
			lastShownItemIndex
		)

		return {
			itemHeights,
			columnsCount: this.getActualColumnsCountForState(),
			verticalSpacing: this.verticalSpacing,
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight
		}
	}

	// Checks if the actual `columnsCount` on the screen matches the one from state.
	//
	// For example, a developer might snapshot `VirtualScroller` state
	// when the user navigates from the page containing the list
	// in order to later restore the list's state when the user goes "Back".
	// But, the user might have also resized the window while being on that
	// "other" page, and when they come "Back", their snapshotted state
	// no longer qualifies. Well, it does qualify, but only partially.
	// For example, `itemStates` are still valid, but first and last shown
	// item indexes aren't.
	//
	function isStateColumnsCountMismatch(state, { columnsCount }) {
		const stateColumnsCount = state.columnsCount || 1
		if (stateColumnsCount !== columnsCount) {
			warn('~ Columns Count changed from', stateColumnsCount, 'to', columnsCount, '~')
			return true
		}
		const firstShownItemIndex = Math.floor(state.firstShownItemIndex / columnsCount) * columnsCount
		if (firstShownItemIndex !== state.firstShownItemIndex) {
			warn('~ First Shown Item Index', state.firstShownItemIndex, 'is not divisible by Columns Count', columnsCount, '~')
			return true
		}
	}
}