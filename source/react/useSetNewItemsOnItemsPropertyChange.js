import log from '../utility/debug.js'

import useOnChange from './useOnChange.js'

// If new `items` property is passed:
//
// * Store the scroll Y position for the first one of the current items
//   so that it could potentially (in some cases) be restored after the
//   new `items` are rendered.
//
// * Call `VirtualScroller.setItems()` function.
//
export default function useSetNewItemsOnItemsPropertyChange(itemsProperty, {
	virtualScroller,
	// `preserveScrollPosition` property name is deprecated,
	// use `preserveScrollPositionOnPrependItems` property instead.
	preserveScrollPosition,
	preserveScrollPositionOnPrependItems
}) {
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

	useOnChange(itemsProperty, (itemsProperty, prevItemsProperty) => {
		log('React: ~ Different `items` property has been passed', itemsProperty)

		let shouldUpdateItems = true

		// Analyze the upcoming `items` change.
		const itemsDiff = virtualScroller.getItemsDiff(prevItemsProperty, itemsProperty)

		// `itemsDiff` will be `undefined` in case of a non-incremental items list change.
		if (itemsDiff) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff
			if (prependedItemsCount === 0 && appendedItemsCount === 0) {
				// The items order hasn't changed.
				// No need to update them in `VirtualScroller` or to snapshot the Y scroll position.
				log('React: ~ The `items` elements are identical to the previous ones')
				shouldUpdateItems = false
			}
		}

		if (shouldUpdateItems) {
			// Make a request to update the `items` in `VirtualScroller`.
			// This will result in a `setState()` call.
			// The new items won't be rendered until that state update is applied.
			virtualScroller.setItems(itemsProperty, {
				// `preserveScrollPosition` property name is deprecated,
				// use `preserveScrollPositionOnPrependItems` property instead.
				preserveScrollPositionOnPrependItems: preserveScrollPositionOnPrependItems || preserveScrollPosition
			})
		}
	})
}