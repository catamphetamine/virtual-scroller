export default function getVerticalSpacing({ itemsContainer, renderedItemsCount }) {
	if (renderedItemsCount > 1) {
		const firstShownRowTopOffset = itemsContainer.getNthRenderedItemTopOffset(0)
		let firstShownRowHeight = itemsContainer.getNthRenderedItemHeight(0)
		let i = 1
		while (i < renderedItemsCount) {
			const itemTopOffset = itemsContainer.getNthRenderedItemTopOffset(i)
			const itemHeight = itemsContainer.getNthRenderedItemHeight(i)
			// If next row is detected.
			if (itemTopOffset !== firstShownRowTopOffset) {
				// Measure inter-row spacing.
				return itemTopOffset - (firstShownRowTopOffset + firstShownRowHeight)
			}
			// A row height is the maximum of its item heights.
			firstShownRowHeight = Math.max(firstShownRowHeight, itemHeight)
			i++
		}
	}
}