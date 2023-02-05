import VirtualScrollerConstructor from './VirtualScroller.constructor.js'
import { hasTbodyStyles, addTbodyStyles } from './DOM/tbody.js'
import { LAYOUT_REASON } from './Layout.js'
import log, { warn } from './utility/debug.js'

export default class VirtualScroller {
	/**
	 * @param  {function} getItemsContainerElement — Returns the container DOM `Element`.
	 * @param  {any[]} items — The list of items.
	 * @param  {Object} [options] — See README.md.
	 * @return {VirtualScroller}
	 */
	constructor(
		getItemsContainerElement,
		items,
		options = {}
	) {
		VirtualScrollerConstructor.call(
			this,
			getItemsContainerElement,
			items,
			options
		)
	}

	/**
	 * Should be invoked after a "container" DOM Element is mounted (inserted into the DOM tree).
	 */
	start() {
		if (this._isActive) {
			throw new Error('[virtual-scroller] `VirtualScroller` has already been started')
		}

		// If has been stopped previously.
		const isRestart = this._isActive === false

		if (!isRestart) {
			// If no custom state storage has been configured, use the default one.
			// Also sets the initial state.
			if (!this._usesCustomStateStorage) {
				this.useDefaultStateStorage()
			}
			// If `render()` function parameter was passed,
			// perform an initial render.
			if (this._render) {
				this._render(this.getState())
			}
		}

		log('~ Start ~')

		// `this._isActive = true` should be placed somewhere at the start of this function.
		this._isActive = true

		// Reset `ListHeightMeasurement` just in case it has some "leftover" state.
		this.listHeightMeasurement.reset()

		// Reset `_isResizing` flag just in case it has some "leftover" value.
		this._isResizing = undefined

		// Reset `_isSettingNewItems` flag just in case it has some "leftover" value.
		this._isSettingNewItems = undefined

		// Work around `<tbody/>` not being able to have `padding`.
		// https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
		if (this.tbody) {
			if (!hasTbodyStyles(this.getItemsContainerElement())) {
				addTbodyStyles(this.getItemsContainerElement())
			}
		}

		// If there was a pending state update that didn't get applied
		// because of stopping the `VirtualScroller`, apply that state update now.
		//
		// The pending state update won't get applied if the scrollable container width
		// has changed but that's ok because that state update currently could only contain:
		// * `scrollableContainerWidth`
		// * `verticalSpacing`
		// * `beforeResize`
		// All of those get rewritten in `onResize()` anyway.
		//
		let stateUpdate = this._stoppedStateUpdate
		this._stoppedStateUpdate = undefined

		// Reset `this.verticalSpacing` so that it re-measures it in cases when
		// the `VirtualScroller` was previously stopped and is now being restarted.
		// The rationale is that a previously captured inter-item vertical spacing
		// can't be "trusted" in a sense that the user might have resized the window
		// after the previous `state` has been snapshotted.
		// If the user has resized the window, then changing window width might have
		// activated different CSS `@media()` "queries" resulting in a potentially different
		// vertical spacing after the restart.
		// If it's not a restart then `this.verticalSpacing` is `undefined` anyway.
		this.verticalSpacing = undefined

		const verticalSpacingStateUpdate = this.measureItemHeightsAndSpacing()
		if (verticalSpacingStateUpdate) {
			stateUpdate = {
				...stateUpdate,
				...verticalSpacingStateUpdate
			}
		}

		this.resize.start()
		this.scroll.start()

		// If `scrollableContainerWidth` hasn't been measured yet,
		// measure it and write it to state.
		if (this.getState().scrollableContainerWidth === undefined) {
			const scrollableContainerWidth = this.scrollableContainer.getWidth()
			stateUpdate = {
				...stateUpdate,
				scrollableContainerWidth
			}
		} else {
			// Reset layout:
			// * If the scrollable container width has changed while stopped.
			// * If the restored state was calculated for another scrollable container width.
			const newWidth = this.scrollableContainer.getWidth()
			const prevWidth = this.getState().scrollableContainerWidth
			if (newWidth !== prevWidth) {
				log('~ Scrollable container width changed from', prevWidth, 'to', newWidth, '~')
				// `stateUpdate` doesn't get passed to `this.onResize()`, and, therefore,
				// won't be applied. But that's ok because currently it could only contain:
				// * `scrollableContainerWidth`
				// * `verticalSpacing`
				// * `beforeResize`
				// All of those get rewritten in `onResize()` anyway.
				return this.onResize()
			}
		}

		// If the `VirtualScroller` uses custom (external) state storage, then
		// check if the columns count has changed between calling `.getInitialState()`
		// and `.start()`. If it has, perform a re-layout "from scratch".
		if (this._usesCustomStateStorage) {
			const columnsCount = this.getActualColumnsCount()
			const columnsCountFromState = this.getState().columnsCount || 1
			if (columnsCount !== columnsCountFromState) {
				return this.onResize()
			}
		}

		// Re-calculate layout and re-render the list.
		// Do that even if when an initial `state` parameter, containing layout values,
		// has been passed. The reason is that the `state` parameter can't be "trusted"
		// in a way that it could have been snapshotted for another window width and
		// the user might have resized their window since then.
		this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.STARTED, stateUpdate })
	}

	// Could be passed as a "callback" parameter, so bind it to `this`.
	stop = () => {
		if (!this._isActive) {
			throw new Error('[virtual-scroller] Can\'t stop a `VirtualScroller` that hasn\'t been started')
		}

		this._isActive = false

		log('~ Stop ~')

		this.resize.stop()
		this.scroll.stop()

		// Stop `ListTopOffsetWatcher` if it has been started.
		// There seems to be no need to restart `ListTopOffsetWatcher`.
		// It's mainly a hacky workaround for development mode anyway.
		if (this.listTopOffsetWatcher && this.listTopOffsetWatcher.isStarted()) {
			this.listTopOffsetWatcher.stop()
		}

		// Cancel any scheduled layout.
		this.cancelLayoutTimer({})
	}

	hasToBeStarted() {
		if (!this._isActive) {
			throw new Error('[virtual-scroller] `VirtualScroller` hasn\'t been started')
		}
	}

	// Bind it to `this` because this function could hypothetically be passed
	// as a "callback" parameter.
	updateLayout = () => {
		this.hasToBeStarted()
		this.onUpdateShownItemIndexes({ reason: LAYOUT_REASON.MANUAL })
	}

	// Bind the function to `this` so that it could be passed as a callback
	// in a random application's code.
	onRender = () => {
		this._onRender(this.getState(), this.previousState)
	}

	/**
	 * Returns the items's top offset relative to the scrollable container's top edge.
	 * @param {number} i — Item index
	 * @return {[number]} Returns the item's scroll Y position. Returns `undefined` if any of the previous items haven't been rendered yet.
	 */
	getItemScrollPosition(i) {
		const itemTopOffsetInList = this.layout.getItemTopOffset(i)
		if (itemTopOffsetInList === undefined) {
			return
		}
		return this.getListTopOffsetInsideScrollableContainer() + itemTopOffsetInList
	}

	/**
	 * @deprecated
	 * `.onItemHeightChange()` has been renamed to `.onItemHeightDidChange()`.
	 */
	onItemHeightChange(i) {
		warn('`.onItemHeightChange(i)` method was renamed to `.onItemHeightDidChange(i)`')
		this.onItemHeightDidChange(i)
	}

	/**
	 * Forces a re-measure of an item's height.
	 * @param  {number} i — Item index
	 */
	onItemHeightDidChange(i) {
		this.hasToBeStarted()
		this._onItemHeightDidChange(i)
	}

	/**
	 * Updates an item's state in `state.itemStates[]`.
	 * @param  {number} i — Item index
	 * @param  {any} i — Item's new state
	 */
	setItemState(i, newItemState) {
		this.hasToBeStarted()
		this._setItemState(i, newItemState)
	}

	// (deprecated)
	// Use `.setItemState()` method name instead.
	onItemStateChange(i, newItemState) {
		this.setItemState(i, newItemState)
	}

	/**
	 * Updates `items`. For example, can prepend or append new items to the list.
	 * @param  {any[]} newItems
	 * @param {boolean} [options.preserveScrollPositionOnPrependItems] — Set to `true` to enable "restore scroll position after prepending items" feature (could be useful when implementing "Show previous items" button).
	 */
	setItems(newItems, options = {}) {
		this.hasToBeStarted()
		return this._setItems(newItems, options)
	}
}