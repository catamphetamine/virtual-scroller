import px from '../utility/px.js'

export default function useStyle({
	tbody,
	virtualScroller
}) {
	if (tbody) {
		return
	}

	const {
		beforeItemsHeight,
		afterItemsHeight
	} = virtualScroller.getState()

	return {
		paddingTop: px(beforeItemsHeight),
		paddingBottom: px(afterItemsHeight)
	}
}