import { useRef } from 'react'

// If new `items` are passed:
//
// * Store the scroll Y position for the first one of the current items
//   so that it could potentially (in some cases) be restored after the
//   new `items` are rendered.
//
// * Call `VirtualScroller.setItems()` function.
//
// * Re-generate the React `key` prefix for item elements
//   so that all item components are re-rendered for the new `items` list.
//   That's because item components may have their own internal state,
//   and simply passing another `item` property for an item component
//   might result in bugs, which React would do with its "re-using" policy
//   if the unique `key` workaround hasn't been used.
//
export default function useHandleItemsChange(items, {
	virtualScroller,
	// `preserveScrollPosition` property name is deprecated,
	// use `preserveScrollPositionOnPrependItems` property instead.
	preserveScrollPosition,
	preserveScrollPositionOnPrependItems,
	updateItemKeysForNewItems
}) {
	const {
		items: renderedItems,
		firstShownItemIndex
	} = virtualScroller.getState()

	// During render, check if the `items` list has changed.
	// If it has, capture the Y scroll position and updated item element `key`s.

	// A long "advanced" sidenote on why capturing scroll Y position
	// is done during render instead of in an "effect":
	//
	// Previously, capturing scroll Y position was being done in `useLayoutEffect()`
	// but it was later found out that it wouldn't work for a "Show previous" button
	// scenario because that button would get hidden by the time `useLayoutEffect()`
	// gets called when there're no more "previous" items to show.
	//
	// Consider this code example:
	//
	// const { fromIndex, items } = this.state
	// const items = allItems.slice(fromIndex)
	// return (
	// 	{fromIndex > 0 &&
	// 		<button onClick={this.onShowPrevious}>
	// 			Show previous
	// 		</button>
	// 	}
	// 	<VirtualScroller
	// 		items={items}
	// 		itemComponent={ItemComponent}/>
	// )
	//
	// Consider a user clicks "Show previous" to show the items from the start.
	// By the time `componentDidUpdate()` is called on `<VirtualScroller/>`,
	// the "Show previous" button has already been hidden
	// (because there're no more "previous" items)
	// which results in the scroll Y position jumping forward
	// by the height of that "Show previous" button.
	// This is because `<VirtualScroller/>` captures scroll Y
	// position when items are prepended via `.setItems()`
	// when the "Show previous" button is still being shown,
	// and then restores scroll Y position in `.onRender()`
	// when the "Show previous" button has already been hidden:
	// that's the reason for the scroll Y "jump".
	//
	// To prevent that, scroll Y position is captured at `render()`
	// time rather than later in `componentDidUpdate()`: this way,
	// scroll Y position is captured while the "Show previous" button
	// is still being shown.

	const previousItems = useRef(items)
	const hasItemsPropertyChanged = items !== previousItems.current
	previousItems.current = items
	if (hasItemsPropertyChanged) {
		let itemsHaveChanged = true
		let shouldUpdateItemKeys = true
		const itemsDiff = virtualScroller.getItemsDiff(renderedItems, items)
		// `itemsDiff` will be `undefined` in case of a non-incremental items list change.
		if (itemsDiff) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff
			if (prependedItemsCount === 0 && appendedItemsCount === 0) {
				// The items haven't changed. No need to re-generate
				// the `key` prefix or to snapshot the Y scroll position.
				itemsHaveChanged = false
				shouldUpdateItemKeys = false
			}
			else if (prependedItemsCount === 0 && appendedItemsCount > 0) {
				// Just some items got appended. No need to re-generate
				// the `key` prefix or to snapshot the Y scroll position.
				shouldUpdateItemKeys = false
			}
		}

		if (itemsHaveChanged) {
			// Set the new `items`.
			virtualScroller.setItems(items, {
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` property instead.
				preserveScrollPositionOnPrependItems: preserveScrollPositionOnPrependItems || preserveScrollPosition
			})

			// Update React element `key`s for the new set of `items`.
			if (shouldUpdateItemKeys) {
				updateItemKeysForNewItems()
			}
		}
	}
}