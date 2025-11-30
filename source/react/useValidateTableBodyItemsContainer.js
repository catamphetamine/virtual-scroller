import { useEffect } from 'react'

// A developer might "forget" to pass `itemsContainerComponent="tbody"` property
// when using a `<tbody/>` as a container for list items.
// This hook validates that the developer didn't "forget" to do that in such case.
export default function useValidateTableBodyItemsContainer({
	virtualScroller,
	tbody
}) {
	useEffect(() => {
		const isTableBodyItemsContainer = virtualScroller.isItemsContainerElementTableBody()
		if (isTableBodyItemsContainer && !tbody) {
			console.error('[virtual-scroller] When using `<tbody/>` as a container for list items, `itemsContainerComponent` property must be `"tbody"`')
		}
	}, [])
}