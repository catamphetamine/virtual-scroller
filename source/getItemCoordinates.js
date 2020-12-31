// This function isn't currenly used.

/**
 * Returns coordinates of item with index `i` relative to the document.
 * `top` is the top offset of the item relative to the start of the document.
 * `bottom` is the top offset of the item's bottom edge relative to the start of the document.
 * `height` is the item's height.
 * @param  {number} i
 * @return {object} [coordinates] — An object of shape `{ top, bottom, height }`. Returns `undefined` if some of the items along the way haven't been measured.
 */
export default function getItemCoordinates(i, {
	itemHeights,
	columnsCount,
	verticalSpacing,
	listTopOffsetInsideScrollableContainer
}) {
	let rowTop = listTopOffsetInsideScrollableContainer
	const itemRowIndex = Math.floor(i / columnsCount)
	let rowIndex = 0
	while (rowIndex < itemRowIndex) {
		let rowHeight = 0
		let columnIndex = 0
		while (columnIndex < columnsCount) {
			const itemHeight = itemHeights[rowIndex * columnsCount + columnIndex]
			if (itemHeight === undefined) {
				return
			}
			rowHeight = Math.max(rowHeight, itemHeight)
			columnIndex++
		}
		rowTop += rowHeight
		rowTop += verticalSpacing
		rowIndex++
	}
	return {
		top: rowTop,
		bottom: rowTop + itemHeights[i],
		height: itemHeights[i]
	}
}