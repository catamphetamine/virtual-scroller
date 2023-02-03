import { useMemo, useRef, useCallback } from 'react'

export default function useSetItemState({
	initialItemsCount,
	virtualScroller
}) {
	// Only compute the initial cache value once.
	const initialCacheValue = useMemo(() => {
		return new Array(initialItemsCount)
	}, [])

	// Handler functions cache.
	const cache = useRef(initialCacheValue)

	// Caches per-item `setItemState` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getSetItemState = useCallback((i) => {
		if (!cache.current[i]) {
			cache.current[i] = (itemState) => virtualScroller.setItemState(i, itemState)
		}
		return cache.current[i]
	}, [
		virtualScroller,
		cache
	])

	return getSetItemState
}