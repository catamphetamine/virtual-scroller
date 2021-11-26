import ItemsContainer from './ItemsContainer'
import ScrollableContainer from './ScrollableContainer'

export default {
	createItemsContainer(getItemsContainerElement) {
		return new ItemsContainer(getItemsContainerElement)
	},
	createScrollableContainer(element, getItemsContainerElement) {
		return new ScrollableContainer(element, getItemsContainerElement)
	}
}