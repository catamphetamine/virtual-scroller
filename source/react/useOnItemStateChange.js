import { useMemo, useRef, useCallback } from 'react'

export default function useOnItemStateChange({
	items,
	virtualScroller
}) {
	// Only compute the initial cache value once.
	const initialCacheValue = useMemo(() => {
		return new Array(items.length)
	}, [])

	// Handler functions cache.
	const cache = useRef(initialCacheValue)

	// Caches per-item `onItemStateChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemStateChange = useCallback((i) => {
		if (!cache.current[i]) {
			cache.current[i] = (itemState) => virtualScroller.onItemStateChange(i, itemState)
		}
		return cache.current[i]
	}, [
		virtualScroller,
		cache
	])

	return getOnItemStateChange
}