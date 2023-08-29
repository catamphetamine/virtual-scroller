import log from './utility/debug.js'

export default function() {
	this.onContainerResize = () => {
		// Reset "previously calculated layout".
		//
		// The "previously calculated layout" feature is not currently used.
		//
		// The current layout snapshot could be stored as a "previously calculated layout" variable
		// so that it could theoretically be used when calculating new layout incrementally
		// rather than from scratch, which would be an optimization.
		//
		this.previouslyCalculatedLayout = undefined

		// Cancel any potential scheduled scroll position restoration.
		this.listHeightMeasurement.reset()

		// Get the most recent items count.
		// If there're a "pending" `setItems()` call then use the items count from that call
		// instead of using the count of currently shown `items` from `state`.
		// A `setItems()` call is "pending" when `updateState()` operation is "asynchronous", that is
		// when `updateState()` calls aren't applied immediately, like in React.
		const itemsCount = this.newItemsWillBeRendered
			? this.newItemsWillBeRendered.count
			: this.getState().itemHeights.length

		// If layout values have been calculated as a result of a "pending" `setItems()` call,
		// then don't discard those new layout values and use them instead of the ones from `state`.
		//
		// A `setItems()` call is "pending" when `updateState()` operation is "asynchronous", that is
		// when `updateState()` calls aren't applied immediately, like in React.
		//
		const layout = this.newItemsWillBeRendered
			? this.newItemsWillBeRendered.layout
			: this.getState()

		// Update `VirtualScroller` state.
		const newState = {
			scrollableContainerWidth: this.scrollableContainer.getWidth(),

			// This state update should also overwrite all the `state` properties
			// that are also updated in the "on scroll" handler (`getShownItemIndexes()`):
			//
			// * `firstShownItemIndex`
			// * `lastShownItemIndex`
			// * `beforeItemsHeight`
			// * `afterItemsHeight`
			//
			// That's because this `updateState()` update has a higher priority
			// than that of the "on scroll" handler, so it should overwrite
			// any potential state changes dispatched by the "on scroll" handler.
			//
			// All these properties might have changed, but they're not
			// recalculated here becase they'll be recalculated after
			// this new state is applied (rendered).
			//
			firstShownItemIndex: layout.firstShownItemIndex,
			lastShownItemIndex: layout.lastShownItemIndex,
			beforeItemsHeight: layout.beforeItemsHeight,
			afterItemsHeight: layout.afterItemsHeight,

			// Reset item heights, because if scrollable container's width (or height)
			// has changed, then the list width (or height) most likely also has changed,
			// and also some CSS `@media()` rules might have been added or removed.
			// So re-render the list entirely.
			itemHeights: new Array(itemsCount),

			columnsCount: this.getActualColumnsCountForState(),

			// Re-measure vertical spacing after render because new CSS styles
			// might be applied for the new window width.
			verticalSpacing: undefined
		}

		const { firstShownItemIndex, lastShownItemIndex } = layout

		// Get the `columnsCount` for the new window width.
		const newColumnsCount = this.getActualColumnsCount()

		// Re-calculate `firstShownItemIndex` and `lastShownItemIndex`
		// based on the new `columnsCount` so that the whole row is visible.
		const newFirstShownItemIndex = Math.floor(firstShownItemIndex / newColumnsCount) * newColumnsCount
		const newLastShownItemIndex = Math.min(
			Math.ceil((lastShownItemIndex + 1) / newColumnsCount) * newColumnsCount,
			itemsCount
		) - 1

		// Potentially update `firstShownItemIndex` if it needs to be adjusted in order to
		// correspond to the new `columnsCount`.
		if (newFirstShownItemIndex !== firstShownItemIndex) {
			log('Columns Count changed from', this.getState().columnsCount || 1, 'to', newColumnsCount)
			log('First Shown Item Index needs to change from', firstShownItemIndex, 'to', newFirstShownItemIndex)
		}

		// Always rewrite `firstShownItemIndex` and `lastShownItemIndex`
		// as part of the `state` update, even if it hasn't been modified.
		//
		// The reason is that there could be two subsequent `onResize()` calls:
		// the first one could be user resizing the window to half of its width,
		// resulting in an "asynchronous" `updateState()` call, and then, before that
		// `updateState()` call is applied, a second resize event happens when the user
		// has resized the window back to its original width, meaning that the
		// `columnsCount` is back to its original value.
		// In that case, the final `newFirstShownItemIndex` will be equal to the
		// original `firstShownItemIndex` that was in `state` before the user
		// has started resizing the window, so, in the end, `state.firstShownItemIndex`
		// property wouldn't have changed, but it still has to be part of the final
		// state update in order to overwrite the previous update of `firstShownItemIndex`
		// property that has been scheduled to be applied in state after the first resize
		// happened.
		//
		newState.firstShownItemIndex = newFirstShownItemIndex
		newState.lastShownItemIndex = newLastShownItemIndex

		const verticalSpacing = this.getVerticalSpacing()
		const columnsCount = this.getColumnsCount()

		// `beforeResize` is always overwritten in `state` here.
		// (once it has started being tracked in `state`)
		if (this.shouldDiscardBeforeResizeItemHeights() || newFirstShownItemIndex === 0) {
			if (this.beforeResize.shouldIncludeBeforeResizeValuesInState()) {
				newState.beforeResize = undefined
			}
		}
		// Snapshot "before resize" values in order to preserve the currently
		// shown items' vertical position on screen so that there's no "content jumping".
		else {
			// Keep "before resize" values in order to preserve the currently
			// shown items' vertical position on screen so that there's no
			// "content jumping". These "before resize" values will be discarded
			// when (if) the user scrolls back to the top of the list.
			newState.beforeResize = {
				verticalSpacing,
				columnsCount,
				itemHeights: this.beforeResize.snapshotBeforeResizeItemHeights({
					firstShownItemIndex,
					newFirstShownItemIndex,
					newColumnsCount
				})
			}
		}

		// `this.widthHasChanged` tells `VirtualScroller` that it should
		// temporarily stop other updates (like "on scroll" updates) and wait
		// for the new `state` to be applied, after which the `onRender()`
		// function will clear this flag and perform a re-layout.
		//
		// A re-layout is required because the layout parameters calculated above
		// are approximate ones, and the exact item heights aren't known at this point.
		// So the `updateState()` call below is just to re-render the `VirtualScroller`.
		// After it has been re-rendered, it will measure item heights and then calculate
		// correct layout parameters.
		//
		this.widthHasChanged = {
			stateUpdate: newState
		}

		// Rerender.
		this.updateState(newState)
	}

	// Returns whether "before resize" item heights should be discarded
	// as a result of calling `setItems()` with a new set of items
	// when an asynchronous `updateState()` call inside that function
	// hasn't been applied yet.
	//
	// If `setItems()` update was an "incremental" one and no items
	// have been prepended, then `firstShownItemIndex` is preserved,
	// and all items' heights before it should be kept in order to
	// preserve the top offset of the first shown item so that there's
	// no "content jumping".
	//
	// If `setItems()` update was an "incremental" one but there're
	// some prepended items, then it means that now there're new items
	// with unknown heights at the top, so the top offset of the first
	// shown item won't be preserved because there're no "before resize"
	// heights of those items.
	//
	// If `setItems()` update was not an "incremental" one, then don't
	// attempt to restore previous item heights after a potential window
	// width change because all item heights have been reset.
	//
	this.shouldDiscardBeforeResizeItemHeights = () => {
		if (this.newItemsWillBeRendered) {
			const { prepend, replace } = this.newItemsWillBeRendered
			return prepend || replace
		}
	}
}