import px from '../utility/px.js'

export default function useStyle({
	tbody,
	getNextState
}) {
	if (tbody) {
		return
	}

	const {
		beforeItemsHeight,
		afterItemsHeight
	} = getNextState()

	return {
		paddingTop: px(beforeItemsHeight),
		paddingBottom: px(afterItemsHeight)
	}
}