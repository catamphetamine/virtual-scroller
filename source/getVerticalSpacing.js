export default function getVerticalSpacing({ itemsContainer, renderedItemsCount }) {
	if (renderedItemsCount > 1) {
		const firstShownRowTopOffset = itemsContainer.getNthRenderedItemTopOffset(0)
		let firstShownRowHeight = itemsContainer.getNthRenderedItemHeight(0)
		let i = 1
		while (i < renderedItemsCount) {
			const itemTopOffset = itemsContainer.getNthRenderedItemTopOffset(i)
			const itemHeight = itemsContainer.getNthRenderedItemHeight(i)
			// See if the item is on the next row.
			// Simply checking for `itemTopOffset !== firstShownRowTopOffset` wouldn't work
			// because items in a row aren't required to be aligned to the top border.
			if (itemTopOffset >= firstShownRowTopOffset + firstShownRowHeight) {
				// Measure inter-row spacing.
				// Can't be "negative" with the current `if` condition.
				return itemTopOffset - (firstShownRowTopOffset + firstShownRowHeight)
			}
			// A row height is the maximum of its item heights.
			firstShownRowHeight = Math.max(firstShownRowHeight, itemHeight)
			i++
		}
	}
}