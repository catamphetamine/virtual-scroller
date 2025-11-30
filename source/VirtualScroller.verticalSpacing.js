import log from './utility/debug.js'
import getVerticalSpacing from './getVerticalSpacing.js'
import { DEFAULT_INTER_ITEM_VERTICAL_SPACING } from './Layout.defaults.js'

export default function createVerticalSpacingHelpers({
	getEstimatedInterItemVerticalSpacing
}) {
	// Bind to `this` in order to prevent bugs when this function is passed by reference
	// and then called with its `this` being unintentionally `window` resulting in
	// the `if` condition being "falsy".
	this.getVerticalSpacing = () => {
		const { verticalSpacing } = this
		if (typeof verticalSpacing === 'number') {
			return verticalSpacing
		}
		return this.getEstimatedInterItemVerticalSpacing()
	}

	this.getVerticalSpacingBeforeResize = () => {
		const { beforeResize } = this.getState()
		if (beforeResize) {
			const { verticalSpacing } = beforeResize
			// `beforeResize.verticalSpacing` can be `undefined`.
			// For example, if `this.updateState({ verticalSpacing })` call hasn't been applied
			// before the resize happened (in case of an "asynchronous" state update).
			if (typeof verticalSpacing === 'number') {
				return verticalSpacing
			}
			return this.getEstimatedInterItemVerticalSpacing()
		}
	}

	this.getEstimatedInterItemVerticalSpacing = () => {
		if (getEstimatedInterItemVerticalSpacing) {
			const estimatedVerticalSpacing = getEstimatedInterItemVerticalSpacing()
			if (typeof estimatedVerticalSpacing === 'number') {
				return estimatedVerticalSpacing
			}
			throw new Error('[virtual-scroller] `getEstimatedInterItemVerticalSpacing()` must return a number')
		}
		// `DEFAULT_INTER_ITEM_VERTICAL_SPACING` will be used in server-side render
		// unless `getEstimatedInterItemVerticalSpacing()` parameter is specified.
		return DEFAULT_INTER_ITEM_VERTICAL_SPACING
	}

	/**
	 * Measures item vertical spacing, if not measured.
	 * @return {object} [stateUpdate]
	 */
	this.measureVerticalSpacingIfNotMeasured = () => {
		if (this.verticalSpacing === undefined) {
			this.verticalSpacing = measureVerticalSpacing.call(this)
			return this.verticalSpacing
		}
	}

	function measureVerticalSpacing() {
		const {
			firstShownItemIndex,
			lastShownItemIndex
		} = this.getState()

		log('~ Measure item vertical spacing ~')

		const verticalSpacing = getVerticalSpacing({
			itemsContainer: this.itemsContainer,
			renderedItemsCount: lastShownItemIndex - firstShownItemIndex + 1
		})

		if (verticalSpacing === undefined) {
			log('Not enough items rendered to measure vertical spacing')
		} else {
			log('Item vertical spacing', verticalSpacing)
			return verticalSpacing
		}
	}
}