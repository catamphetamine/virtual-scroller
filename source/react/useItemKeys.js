import { useRef, useMemo, useCallback } from 'react'

export default function useItemKeys({ getItemId }) {
	// List items are rendered with `key`s so that React doesn't
	// "reuse" `itemComponent`s in cases when `items` are changed.
  const itemKeyPrefix = useRef()

	// Generates a unique `key` prefix for list item components.
	const generateItemKeyPrefix = useMemo(() => {
		let counter = 0
		function getNextCounter() {
			if (counter === Number.MAX_SAFE_INTEGER) {
				counter = 0
			}
			counter++
			return counter
		}
		return () => {
			itemKeyPrefix.current = String(getNextCounter())
		}
	}, [
		itemKeyPrefix
	])

	useMemo(() => {
		// Generate an initial unique `key` prefix for list item components.
		generateItemKeyPrefix()
	}, [])

	const generateItemKeyPrefixIfNotUsingItemIds = useCallback(() => {
		if (!getItemId) {
			generateItemKeyPrefix()
		}
	}, [
		getItemId,
		generateItemKeyPrefix
	])

	/**
	 * Returns a `key` for an `item`'s element.
	 * @param  {object} item — The item.
	 * @param  {number} i — Item's index in `items` list.
	 * @return {any}
	 */
	const getItemKey = useCallback((item, i) => {
		if (getItemId) {
			return getItemId(item)
		}
		return `${itemKeyPrefix.current}:${i}`
	}, [
		getItemId,
		itemKeyPrefix
	])

	return {
		getItemKey,
		updateItemKeysForNewItems: generateItemKeyPrefixIfNotUsingItemIds
	}
}