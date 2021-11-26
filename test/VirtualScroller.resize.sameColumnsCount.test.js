import VirtualScroller from './VirtualScroller'

describe('VirtualScroller', function() {
	it('should handle window resize', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 2
		const ROWS_COUNT = 8

		let ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		let ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		let items = new Array(ROWS_COUNT * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })

		const virtualScroller = VirtualScroller({
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.listen()

		// The first row of items is hidden.
		virtualScroller.scrollTo(ITEM_HEIGHT + MARGIN)

		// Shows rows 2 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING),
			items,
			itemStates: new Array(items.length),
			itemHeights: new Array(5 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array((ROWS_COUNT - 5) * COLUMNS_COUNT)
			)
		})

		// Resize the window.

		const PREV_ITEM_HEIGHT = ITEM_HEIGHT

		const {
			firstShownItemIndex: prevFirstShownItemIndex
		} = virtualScroller.getState()

		SCREEN_WIDTH /= 4

		ITEM_WIDTH /= 2
		ITEM_HEIGHT *= 4

		virtualScroller.expectStateUpdate({
			beforeResize: {
				columnsCount: COLUMNS_COUNT,
				itemHeights: new Array(prevFirstShownItemIndex).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING
			},
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: undefined,
			itemHeights: new Array(items.length),
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (PREV_ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// The average item height before resize.
		virtualScroller.itemHeights.getAverage().should.equal(PREV_ITEM_HEIGHT)

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// The average item height has changed after resize.
		virtualScroller.itemHeights.getAverage().should.equal(ITEM_HEIGHT)

		// Shows rows 3 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			verticalSpacing: VERTICAL_SPACING,
			items,
			itemHeights: new Array(1 * COLUMNS_COUNT).concat(
				new Array(4 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
					new Array(ROWS_COUNT * COLUMNS_COUNT - 4 * COLUMNS_COUNT - 1 * COLUMNS_COUNT)
				)
			)
		})

		// Scroll down.
		virtualScroller.scrollTo(2 * (ITEM_HEIGHT + MARGIN))

		virtualScroller.verifyState({
			beforeResize: {
				columnsCount: COLUMNS_COUNT,
				itemHeights: [PREV_ITEM_HEIGHT, PREV_ITEM_HEIGHT],
				verticalSpacing: VERTICAL_SPACING
			},
			firstShownItemIndex: 4 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING + 2 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING),
			itemHeights: new Array(1 * COLUMNS_COUNT).concat(
				new Array(4 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
					new Array(ROWS_COUNT * COLUMNS_COUNT - 4 * COLUMNS_COUNT - 1 * COLUMNS_COUNT)
				)
			)
		})

		// Scroll up so that the first row of items is visible.
		virtualScroller.scrollTo(PREV_ITEM_HEIGHT + MARGIN - 1)

		virtualScroller.verifyState({
			beforeResize: undefined,
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			itemHeights: new Array(1 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array(4 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
					new Array(ROWS_COUNT * COLUMNS_COUNT - 4 * COLUMNS_COUNT - 1 * COLUMNS_COUNT)
				)
			)
		})

		// Should have adjusted the scroll position due to clearing out
		// some of the "before resize" item heights.
		virtualScroller.scrollableContainer.getScrollY().should.equal(
			(PREV_ITEM_HEIGHT + MARGIN - 1) + (ITEM_HEIGHT - PREV_ITEM_HEIGHT)
		)

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})