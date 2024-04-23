export default function getVerticalSpacing({ itemsContainer, renderedItemsCount }) {
	// If there's more than a single item rendered, it becomes potentially possible
	// to measure vertical spacing.
	if (renderedItemsCount > 1) {
		// Measure the first item of the first rendered row: top offset and height.
		const firstShownRowTopOffset = itemsContainer.getNthRenderedItemTopOffset(0)
		let firstShownRowHeight = itemsContainer.getNthRenderedItemHeight(0)

		// Measure next items until a new row is started, at which point
		// it becomes possible to calculate the vertical spacing between the rows.
		let i = 1
		while (i < renderedItemsCount) {
			// Measure item: top offset and height.
			const itemTopOffset = itemsContainer.getNthRenderedItemTopOffset(i)
			const itemHeight = itemsContainer.getNthRenderedItemHeight(i)

			// See if the item is already on the next row. If yes, then can calculate
			// vertical spacing between the rows.
			//
			// To detect next row, it uses a `>=` operator rather than just a `!==` operator.
			// The reason is that simply checking for `itemTopOffset !== firstShownRowTopOffset`
			// wouldn't work because items in a row aren't required to be aligned to the top edge of the row.
			//
			// Also, it uses rounding here to work around a bug that manifests when a web browser
			// renders the web page with a scale value other than 100%. In that case, even when
			// different identical items would've had equal heights, they'd have slightly different heights
			// to the point of ~0.00001 because of the non-100% scale calculation imprecision.
			//
			// The result would be incorrect detection of same/next row, which would result in
			// returning a huge vertical spacing that is equal to a height of an item,
			// which would then result in a glitchy behavior of `virtual-scroller` when scrolling.
			//
			// To work around that bug, it rounds up to the closest higher `1px`
			// and only then performs the `>=` comparison to detect same/next row.
			//
			if (Math.ceil(itemTopOffset) >= Math.floor(firstShownRowTopOffset) + Math.floor(firstShownRowHeight)) {
				// Next row is detected. Measure inter-row spacing.
				// Can't be "negative" with the current `if` condition.
				return itemTopOffset - (firstShownRowTopOffset + firstShownRowHeight)
			}

			// Not at the next row yet. Re-measure the current row height.
			// The rationale for re-measuring is that there can be items of variable height
			// in a given row, so the row's height is not known until all items in it are measured.
			// A row height is the maximum of its items' heights.
			firstShownRowHeight = Math.max(firstShownRowHeight, itemHeight)

			// Proceed to the next item.
			i++
		}
	}
}