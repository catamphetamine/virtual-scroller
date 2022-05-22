import log from './utility/debug.js'
import getVerticalSpacing from './getVerticalSpacing.js'

export default function createVerticalSpacingHelpers() {
	// Bind to `this` in order to prevent bugs when this function is passed by reference
	// and then called with its `this` being unintentionally `window` resulting in
	// the `if` condition being "falsy".
	this.getVerticalSpacing = () => {
		return this.verticalSpacing || 0
	}

	this.getVerticalSpacingBeforeResize = () => {
		// `beforeResize.verticalSpacing` can be `undefined`.
		// For example, if `this.updateState({ verticalSpacing })` call hasn't been applied
		// before the resize happened (in case of an "asynchronous" state update).
		const { beforeResize } = this.getState()
		return beforeResize && beforeResize.verticalSpacing || 0
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