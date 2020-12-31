export default function getVerticalSpacing({ container, screen }) {
	if (screen.getChildElementsCount(container) > 1) {
		const firstShownRowTopOffset = screen.getChildElementTopOffset(container, 0)
		let firstShownRowHeight = screen.getChildElementHeight(container, 0)
		let i = 1
		while (i < screen.getChildElementsCount(container)) {
			const itemTopOffset = screen.getChildElementTopOffset(container, i)
			const itemHeight = screen.getChildElementHeight(container, i)
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