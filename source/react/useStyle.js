import px from '../utility/px.js'
import { reportError } from '../utility/debug.js'

export default function useStyle(style, {
	tbody,
	state
}) {
	if (tbody) {
		return style
	}

	// Validate that the passed `style` property doesn't include
	// `padding-top` or `padding-bottom` or `padding`.
	if (style) {
		if (typeof style.padding === 'number') {
			reportError('`style` property can\'t include any `padding`')
		}
		if (typeof style.paddingTop === 'number') {
			reportError('`style` property can\'t include any `paddingTop`')
		}
		if (typeof style.paddingBottom === 'number') {
			reportError('`style` property can\'t include any `paddingBottom`')
		}
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