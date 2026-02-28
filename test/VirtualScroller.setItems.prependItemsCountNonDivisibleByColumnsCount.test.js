import { describe, it } from 'mocha'
import { expect } from 'chai'

import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should prepend an items count that is not divisible by columns count', () => {
		const SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 2
		let ROWS_COUNT = 8

		const ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		const ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		let items = new Array(ROWS_COUNT * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })

		const virtualScroller = new VirtualScroller({
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Shows rows 1 to 3.
		virtualScroller.verifyState({
			firstShownItemIndex: 0,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			items,
			// First it renders only 1 row, then renders 4 rows, then measures
			// vertical padding and renders 3 rows. The result is 4 rows measured.
			itemHeights: new Array(4 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array(items.length - 4 * COLUMNS_COUNT)
			)
		})

		// The first row of items is hidden.
		virtualScroller.scrollTo(ITEM_HEIGHT + PRERENDER_MARGIN)

		// Shows rows 2 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING),
			items,
			itemHeights: new Array(5 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array(items.length - 5 * COLUMNS_COUNT)
			)
		})

		// Prepend a partial row of items.
		// (resets layout and won't preserve scroll position).

		const itemsCountBeforePrepend = items.length

		expect(COLUMNS_COUNT).to.not.equal(1)

		items = new Array(1 * COLUMNS_COUNT - 1).fill({ area: ITEM_WIDTH * ITEM_HEIGHT }).concat(items)
		ROWS_COUNT++

		const getRenderedItemRowsCountNotIncludingPrerenderMarginOnTop = () => {
			return Math.ceil((SCREEN_HEIGHT + PRERENDER_MARGIN) / ITEM_HEIGHT)
		}

		const RENDERED_ITEM_ROWS_COUNT_NOT_INCLUDING_PRERENDER_MARGIN_ON_TOP = getRenderedItemRowsCountNotIncludingPrerenderMarginOnTop()

		const firstShownItemIndex = 0
		const lastShownItemIndex = firstShownItemIndex + RENDERED_ITEM_ROWS_COUNT_NOT_INCLUDING_PRERENDER_MARGIN_ON_TOP * COLUMNS_COUNT - 1 // + 3 * COLUMNS_COUNT - 1
		const beforeItemsHeight = 0
		const afterItemsHeight = (ITEM_HEIGHT + VERTICAL_SPACING) * Math.ceil((items.length - (lastShownItemIndex + 1)) / COLUMNS_COUNT)

		virtualScroller.expectStateUpdate({
			firstShownItemIndex,
			lastShownItemIndex,
			beforeItemsHeight,
			afterItemsHeight,
			items,
			itemHeights: new Array(1 * COLUMNS_COUNT - 1).concat(
				new Array(5 * COLUMNS_COUNT).concat(
					new Array(itemsCountBeforePrepend - 5 * COLUMNS_COUNT)
				)
			),
			itemStates: new Array(items.length)
		})

		// Don't `throw` `VirtualScroller` errors but rather collect them in an array.
		const errors = []
		global.VirtualScrollerCatchError = (error) => {
			errors.push(error)
		}

		virtualScroller.setItems(items, {
			preserveScrollPositionOnPrependItems: true
		})

		// Stop collecting `VirtualScroller` errors in the `errors` array.
		// Use the default behavior of just `throw`-ing such errors.
		global.VirtualScrollerCatchError = undefined
		// Verify the errors that have been `throw`-n.
		expect(errors.length).to.equal(2)
		expect(errors[0].message).to.equal('[virtual-scroller] ~ Prepended items count 1 is not divisible by Columns Count 2 ~')
		expect(errors[1].message).to.equal('[virtual-scroller] Layout reset required')

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})