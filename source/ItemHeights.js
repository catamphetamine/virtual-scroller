import log from './log'

export default class ItemHeights {
	constructor(getContainerNode, getState) {
		this.getContainerNode = getContainerNode
		this.getState = getState
		this.resetMeasuredState()
	}

	resetMeasuredState() {
		this.measuredItemsHeight = 0
		this.firstMeasuredItemIndex = undefined
		this.lastMeasuredItemIndex = undefined
	}

	/**
	 * Initializes `this.measuredItemsHeight`, `this.firstMeasuredItemIndex` and
	 * `this.lastMeasuredItemIndex` instance variables.
	 * These instance variables are used when calculating "average" item height:
	 * the "average" item height is simply `this.measuredItemsHeight` divided by
	 * `this.lastMeasuredItemIndex` minus `this.firstMeasuredItemIndex` plus 1.
	 * Also, `this.firstMeasuredItemIndex` and `this.lastMeasuredItemIndex`
	 * are used to detect "non-continuous" scroll: the cases when scroll position
	 * jumps from one position to a distant another position. How could that happen?
	 * Maybe it can't, but just in case.
	 */
	onInitItemHeights() {
		this.resetMeasuredState()
		let i = 0
		while (i < this.getState().itemHeights.length) {
			if (this.getState().itemHeights[i] == undefined) {
				if (this.firstMeasuredItemIndex !== undefined) {
					this.lastMeasuredItemIndex = i - 1
					break
				}
			} else {
				if (this.firstMeasuredItemIndex === undefined) {
					this.firstMeasuredItemIndex = i
				}
				this.measuredItemsHeight += this.getState().itemHeights[i]
			}
			i++
		}
	}

	// Seems to be no longer used.
	// getItemHeight(i, firstShownItemIndex) {
	// 	if (this.get(i)) {
	// 		return this.get(i)
	// 	}
	// 	const itemHeight = this._getItemHeight(i, firstShownItemIndex)
	// 	if (itemHeight) {
	// 		this.set(i, itemHeight)
	// 		return itemHeight
	// 	}
	// 	return this.getAverage()
	// }

	_getItemHeight(i, firstShownItemIndex) {
		const container = this.getContainerNode()
		if (container) {
			const nodeIndex = i - firstShownItemIndex
			if (nodeIndex >= 0 && nodeIndex < container.childNodes.length) {
				// `offsetHeight` is not precise enough (doesn't return fractional pixels).
				// let height = container.childNodes[nodeIndex].offsetHeight
				return container.childNodes[nodeIndex].getBoundingClientRect().height
			}
		}
	}

	getItemSpacing() {
		const container = this.getContainerNode()
		if (container) {
			if (container.childNodes.length > 1) {
				const firstItem = container.childNodes[0]
				const secondItem = container.childNodes[1]
				const firstItemRect = firstItem.getBoundingClientRect()
				const secondItemRect = secondItem.getBoundingClientRect()
				const spacing = secondItemRect.top - (firstItemRect.top + firstItemRect.height)
				// Debugging.
				if (window.VirtualScrollerDebug) {
					log('Item spacing', spacing)
				}
				return spacing
			}
		}
	}

	/**
	 * Updates item heights and item spacing.
	 * @param  {number} fromIndex
	 * @param  {number} toIndex
	 * @param  {number} firstShownItemIndex
	 */
	update(fromIndex, toIndex, firstShownItemIndex) {
		if (this.getState().itemSpacing === undefined) {
			this.getState().itemSpacing = this.getItemSpacing()
		}
		// Reset `this.measuredItemsHeight` if it's not a continuous scroll.
		if (this.firstMeasuredItemIndex !== undefined) {
			if (fromIndex > this.lastMeasuredItemIndex + 1 || toIndex < this.firstMeasuredItemIndex - 1) {
				// The previously measured average item height might still be
				// more precise if it contains more measured items ("samples").
				this.previousAverageItemHeight = this.averageItemHeight
				this.previousAverageItemHeightSamplesCount = this.lastMeasuredItemIndex - this.firstMeasuredItemIndex + 1
				// Reset.
				this.resetMeasuredState()
			}
		}
		const previousFirstMeasuredItemIndex = this.firstMeasuredItemIndex
		const previousLastMeasuredItemIndex = this.lastMeasuredItemIndex
		let firstMeasuredItemIndexHasBeenUpdated = false
		let i = fromIndex
		while (i <= toIndex) {
			// Recalculate item heights because item height might change
			// after showing it compared to what it was when hiding it.
			// For example, a YouTube video might have been expanded
			// and then the item is hidden and it's state is reset
			// and when it's shown again the YouTube video is not expanded.
			// if (this.get(i) === undefined) {
				const height = this._getItemHeight(i, firstShownItemIndex)
				if (height !== undefined) {
					this.set(i, height)
					// Update new items height (before).
					if (previousFirstMeasuredItemIndex === undefined || i < previousFirstMeasuredItemIndex) {
						this.measuredItemsHeight += height
						// Update first measured item index.
						if (!firstMeasuredItemIndexHasBeenUpdated) {
							this.firstMeasuredItemIndex = i
							firstMeasuredItemIndexHasBeenUpdated = true
						}
					}
					// Update new items height (after).
					if (previousLastMeasuredItemIndex === undefined || i > previousLastMeasuredItemIndex) {
						// If `previousLastMeasuredItemIndex` is `undefined`
						// then `previousFirstMeasuredItemIndex` is also `undefined`
						// which means that `this.measuredItemsHeight` has already been updated.
						if (previousLastMeasuredItemIndex !== undefined) {
							this.measuredItemsHeight += height
						}
						// Update last measured item index.
						this.lastMeasuredItemIndex = i
					}
				}
			// }
			i++
		}
		// Update average item height.
		this.updateAverageItemHeight()
	}

	updateItemHeight(i, firstShownItemIndex) {
		const previousHeight = this.get(i)
		const height = this._getItemHeight(i, firstShownItemIndex)
		// The items might not have rendered at all,
		// for example, when using React, because
		// React performs DOM updates asynchronously
		// and if the user scrolls fast enough
		// React might not have rendered the item
		// since it has become visible till it became no longer visible.
		if (previousHeight === undefined || height === undefined) {
			return
		}
		this.set(i, height)
		this.measuredItemsHeight += height - previousHeight
	}

	updateAverageItemHeight() {
		this.averageItemHeightSamplesCount = this.lastMeasuredItemIndex - this.firstMeasuredItemIndex + 1
		this.averageItemHeight = this.measuredItemsHeight / this.averageItemHeightSamplesCount
	}

	/* Public API. */
	getAverage() {
		// Previously measured average item height might still be
		// more precise if it contains more measured items ("samples").
		if (this.previousAverageItemHeight) {
			if (this.previousAverageItemHeightSamplesCount > this.averageItemHeightSamplesCount) {
				return this.previousAverageItemHeight
			}
		}
		return this.averageItemHeight || 0
	}

	get(i) {
		return this.getState().itemHeights[i]
	}

	set(i, height) {
		this.getState().itemHeights[i] = height
	}

	onPrepend(count) {
		if (this.firstMeasuredItemIndex !== undefined) {
			this.firstMeasuredItemIndex += count
			this.lastMeasuredItemIndex += count
		}
	}
}