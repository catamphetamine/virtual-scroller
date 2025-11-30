import px from '../utility/px.js'

export default function useStyle(style, {
	tbody,
	state
}) {
	if (tbody) {
		return style
	}

	const {
		beforeItemsHeight,
		afterItemsHeight
	} = state

	return {
		...style,
		paddingTop: px(beforeItemsHeight),
		paddingBottom: px(afterItemsHeight)
	}
}