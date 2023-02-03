import { useRef } from 'react'

// If the order of the `items` changes, or new `items` get prepended resulting in a "shift":
//
// * Re-generate the React `key` prefix for item elements
//   so that all item components are re-rendered for the new `items` list.
//   That's because item components may have their own internal state,
//   and simply passing another `item` property for an item component
//   might result in bugs, which React would do with its "re-using" policy
//   if the unique `key` workaround hasn't been used.
//
export default function useHandleItemIndexesChange({
	virtualScroller,
	itemsBeingRendered,
	updateItemKeysForNewItems
}) {
	const previousItemsBeingRenderedRef = useRef(itemsBeingRendered)
	const previousItemsBeingRendered = previousItemsBeingRenderedRef.current
	const haveItemsChanged = itemsBeingRendered !== previousItemsBeingRendered
	previousItemsBeingRenderedRef.current = itemsBeingRendered

	if (haveItemsChanged) {
		let shouldUpdateItemKeys = true

		const itemsDiff = virtualScroller.getItemsDiff(previousItemsBeingRendered, itemsBeingRendered)
		// `itemsDiff` will be `undefined` in case of a non-incremental items list change.
		if (itemsDiff) {
			const {
				prependedItemsCount,
				appendedItemsCount
			} = itemsDiff
			if (prependedItemsCount === 0 && appendedItemsCount === 0) {
				// The items order hasn't changed.
				// No need to re-generate the `key` prefix.
				shouldUpdateItemKeys = false
			}
			else if (prependedItemsCount === 0 && appendedItemsCount > 0) {
				// The item order hasn't changed.
				// No need to re-generate the `key` prefix.
				shouldUpdateItemKeys = false
			}
		}

		// Update React element `key`s for the new set of `items`.
		if (shouldUpdateItemKeys) {
			updateItemKeysForNewItems()
		}
	}
}