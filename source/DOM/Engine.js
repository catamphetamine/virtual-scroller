import ItemsContainer from './ItemsContainer.js'
import ScrollableContainer, { ScrollableWindowContainer } from './ScrollableContainer.js'
import ListTopOffsetWatcher from './ListTopOffsetWatcher.js'

export default {
	createItemsContainer(getItemsContainerElement) {
		return new ItemsContainer(getItemsContainerElement)
	},

	// Creates a `scrollableContainer`.
	// On client side, `scrollableContainer` is always created.
	// On server side, `scrollableContainer` is not created (and not used).
	createScrollableContainer(getScrollableContainerElement, getItemsContainerElement) {
		if (getScrollableContainerElement) {
			return new ScrollableContainer(getScrollableContainerElement, getItemsContainerElement)
		} else if (typeof window !== 'undefined') {
			return new ScrollableWindowContainer(getItemsContainerElement)
		}
	},

	watchListTopOffset({
		getListTopOffset,
		onListTopOffsetChange
	}) {
		return new ListTopOffsetWatcher({
			getListTopOffset,
			onListTopOffsetChange
		})
	}
}