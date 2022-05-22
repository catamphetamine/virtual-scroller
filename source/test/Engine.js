import ItemsContainer from './ItemsContainer.js'
import ScrollableContainer from './ScrollableContainer.js'

export default {
	createItemsContainer(getItemsContainerElement) {
		return new ItemsContainer(getItemsContainerElement)
	},
	createScrollableContainer(getScrollableContainerElement, getItemsContainerElement) {
		return new ScrollableContainer(getScrollableContainerElement, getItemsContainerElement)
	}
}