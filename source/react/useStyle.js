import px from '../utility/px.js'

export default function useStyle({
	tbody,
	state
}) {
	if (tbody) {
		return
	}

	const {
		beforeItemsHeight,
		afterItemsHeight
	} = state

	return {
		paddingTop: px(beforeItemsHeight),
		paddingBottom: px(afterItemsHeight)
	}
}