export default function createColumnsHelpers({ getColumnsCount }) {
	if (getColumnsCount) {
		const scrollableContainerArgument = {
			getWidth: () => this.scrollableContainer.getWidth()
		}
		this.getActualColumnsCountForState = () => {
			const columnsCount = getColumnsCount(scrollableContainerArgument)
			// `columnsCount: 1` is effectively same as `columnsCount: undefined`
			// from the code's point of view. This makes one less property in `state`
			// which makes `state` a bit less cluttered (easier for inspection).
			if (columnsCount !== 1) {
				return columnsCount
			}
		}
	} else {
		this.getActualColumnsCountForState = () => undefined
	}

	this.getActualColumnsCount = () => {
		return this.getActualColumnsCountForState() || 1
	}

	this.getColumnsCount = () => {
		return this.getState() && this.getState().columnsCount || 1
	}
}