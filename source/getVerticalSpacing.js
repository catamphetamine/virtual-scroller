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
			if (itemTopOffset + PAGE_ZOOM_ROUNDING_PRECISION_FIX_INCREMENT >= firstShownRowTopOffset + firstShownRowHeight) {
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

// There's a rounding precision error when a web browser has a non-100% scale
// when viewing a page. I dunno what's the source of the imprecision.
// The thing is: previousRow.top + previousRow.height !== nextRow.top.
// The two parts of the equation above differ by a magnitude of 0.0001.
// To fix that, when performing a `>=` comparison, an additional increment is added.
//
// This value of the increment is set to `0.9px` for no real reason.
// It could be `1px` or `0.99px` and it would most likely work the same way.
// The rationale for the `0.9px` value is that a minimum height of a DOM element
// is assumed to be `1px` so having a value less than `1px` would theoretically be
// less buggy in a way that it wouldn't skip the rows that're `1px` high.
//
const PAGE_ZOOM_ROUNDING_PRECISION_FIX_INCREMENT = 0.9