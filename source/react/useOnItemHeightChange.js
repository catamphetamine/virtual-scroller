import { useMemo, useRef, useCallback } from 'react'

export default function useOnItemHeightChange({
	initialItemsCount,
	virtualScroller
}) {
	// Only compute the initial cache value once.
	const initialCacheValue = useMemo(() => {
		return new Array(initialItemsCount)
	}, [])

	// Handler functions cache.
	const cache = useRef(initialCacheValue)

	// Caches per-item `onItemHeightChange` functions' "references"
	// so that item components don't get re-rendered needlessly.
	const getOnItemHeightChange = useCallback((i) => {
		if (!cache.current[i]) {
			cache.current[i] = () => virtualScroller.onItemHeightChange(i)
		}
		return cache.current[i]
	}, [
		virtualScroller,
		cache
	])

	return getOnItemHeightChange
}