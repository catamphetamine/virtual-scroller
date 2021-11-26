import ItemsContainer from './ItemsContainer'

import ScrollableContainer, {
	ScrollableWindowContainer
} from './ScrollableContainer'

import ListTopOffsetWatcher from './ListTopOffsetWatcher'

export default {
	createItemsContainer(getItemsContainerElement) {
		return new ItemsContainer(getItemsContainerElement)
	},
	// Creates a `scrollableContainer`.
	// On client side, `scrollableContainer` is always created.
	// On server side, `scrollableContainer` is not created (and not used).
	createScrollableContainer(scrollableContainer, getItemsContainerElement) {
		if (scrollableContainer) {
			return new ScrollableContainer(scrollableContainer, getItemsContainerElement)
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