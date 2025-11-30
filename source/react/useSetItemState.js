import { useMemo, useRef, useCallback } from 'react'

export default function useSetItemState({
	getItemKey,
	onItemKeysReset,
	virtualScroller
}) {
	// Only create the initial cache once.
	const initialCache = useMemo(() => {
		return createCache()
	}, [])

	// A cache of `setItemState()` functions.
	const cache = useRef(initialCache)

	// Adds an "on item keys reset" listener that clears the cache when item keys are reset.
	useMemo(() => {
		onItemKeysReset(() => {
			cache.current = createCache()
		})
	}, [])

	// Caches per-item `setItemState` functions' "references"
	// so that item components don't get re-rendered needlessly.
	// I.e. it could just re-create this function every time
	// but that would also make React re-render the item component every time
	// which wouldn't be efficient.
	const getSetItemState = useCallback((item) => {
		const itemKey = getItemKey(item)
		if (!cache.current[itemKey]) {
			cache.current[itemKey] = (itemState) => {
				virtualScroller.setItemState(item, itemState)
			}
		}
		return cache.current[itemKey]
	}, [
		virtualScroller,
		getItemKey,
		cache
	])

	return getSetItemState
}

function createCache() {
	// It could also use a `new Map()` here and then use `item` as a key.
	// Although, sometimes an `item` "reference" might change while it still being
	// the same item, i.e. having the same `getItemId(item)` value.
	return {}
}