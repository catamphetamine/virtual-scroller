import { describe, it } from 'mocha'
import { expect } from 'chai'

import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should show and hide items on scroll (restart) (different screen width)', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 2
		const ROWS_COUNT = 8

		const ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		const ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		const items = new Array(ROWS_COUNT * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })

		// Don't `throw` `VirtualScroller` errors but rather collect them in an array.
		const errors = []
		global.VirtualScrollerCatchError = (error) => {
			errors.push(error)
		}

		const virtualScroller = new VirtualScroller({
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Shows just the first row of items in order to measure non-measured items.
		// (when no `getEstimatedItemHeight()` or `getEstimatedVisibleItemRowsCount()` have been supplied)
		virtualScroller.verifyState({
			firstShownItemIndex: 0,
			lastShownItemIndex: COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: 0
		})

		// Only the first item has been measured.
		// Vertical spacing is assumed `0` at this point,
		// so estimated visible rows count is `4` rather than `3`.
		// For the same reason, `afterItemsHeight` doesn't include
		// `VERTICAL_SPACING` yet.
		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 0,
			lastShownItemIndex: 4 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: ITEM_HEIGHT * 4,
			scrollableContainerWidth: SCREEN_WIDTH
		}, () => {
			expect(virtualScroller.getFirstNonMeasuredItemIndex()).to.equal(2)
		})

		// Layout has been re-calculated based on the actual item heights
		// and the actual vertical spacing.
		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 0,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			// Vertical spacing has been measured.
			verticalSpacing: 100
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Stop listening to scroll events.
		virtualScroller.stop()

		SCREEN_WIDTH /= 2

		// Screen width has changed while the `virtualScroller` was stopped.
		virtualScroller.updateScreenDimensions({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT
		})

		// Screen size mismatch detected. Reset layout.
		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 0,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ITEM_HEIGHT + VERTICAL_SPACING) * 5,
			itemHeights: new Array(items.length),
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: undefined,
			scrollableContainerWidth: SCREEN_WIDTH
		})

		// Layout has been reset.
		virtualScroller.expectStateUpdate({
			beforeItemsHeight: 0,
			afterItemsHeight: (ITEM_HEIGHT + VERTICAL_SPACING) * 10,
			firstShownItemIndex: 0,
			lastShownItemIndex: 2 * COLUMNS_COUNT - 1,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Stop collecting `VirtualScroller` errors in the `errors` array.
		// Use the default behavior of just `throw`-ing such errors.
		global.VirtualScrollerCatchError = undefined
		// Verify the errors that have been `throw`-n.
		expect(errors.length).to.equal(6)
		expect(errors[0].message).to.include('[virtual-scroller] Item index 0 height changed unexpectedly: it was 200 before, but now it is 400')
		expect(errors[1].message).to.include('[virtual-scroller] Item index 1 height changed unexpectedly: it was 200 before, but now it is 400')
		expect(errors[2].message).to.include('[virtual-scroller] Item index 2 height changed unexpectedly: it was 200 before, but now it is 400')
		expect(errors[3].message).to.include('[virtual-scroller] Item index 3 height changed unexpectedly: it was 200 before, but now it is 400')
		expect(errors[4].message).to.include('[virtual-scroller] Item index 4 height changed unexpectedly: it was 200 before, but now it is 400')
		expect(errors[5].message).to.include('[virtual-scroller] Item index 5 height changed unexpectedly: it was 200 before, but now it is 400')

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})