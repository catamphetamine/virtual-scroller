import Screen from './Screen'

import ScrollableContainer, {
	ScrollableWindowContainer
} from './ScrollableContainer'

export default {
	name: 'DOM',
	createScreen() {
		return new Screen()
	},
	// Create `scrollableContainer`.
	// On client side, `scrollableContainer` is always created.
	// On server side, `scrollableContainer` is not created (and not used).
	createScrollableContainer(scrollableContainer) {
		if (scrollableContainer) {
			return new ScrollableContainer(scrollableContainer)
		} else if (typeof window !== 'undefined') {
			return new ScrollableWindowContainer()
		}
	}
}