import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should handle window resize when columns count changes', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		let COLUMNS_COUNT = 2
		let ROWS_COUNT = 8

		let ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		let ITEM_HEIGHT = 200

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

		// The first 4 rows of items are hidden.
		virtualScroller.scrollTo(PRERENDER_MARGIN + 4 * (ITEM_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING)

		// Shows rows 5 to 8.
		virtualScroller.verifyState({
			firstShownItemIndex: 5 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 8 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 4 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 8) * (ITEM_HEIGHT + VERTICAL_SPACING),
			itemStates: new Array(items.length),
			itemHeights: new Array(8 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array((ROWS_COUNT - 8) * COLUMNS_COUNT)
			),
			scrollableContainerWidth: SCREEN_WIDTH
		})

		// Resize the window.

		const PREV_COLUMNS_COUNT = COLUMNS_COUNT
		const PREV_ROWS_COUNT = ROWS_COUNT

		const PREV_ITEM_WIDTH = ITEM_WIDTH
		const PREV_ITEM_HEIGHT = ITEM_HEIGHT

		const {
			firstShownItemIndex: prevFirstShownItemIndex
		} = virtualScroller.getState()

		SCREEN_WIDTH *= 1.5
		COLUMNS_COUNT *= 2
		ROWS_COUNT /= 2

		ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		ITEM_HEIGHT = PREV_ITEM_WIDTH * PREV_ITEM_HEIGHT / ITEM_WIDTH

		virtualScroller.expectStateUpdate({
			beforeResize: {
				columnsCount: PREV_COLUMNS_COUNT,
				itemHeights: new Array(prevFirstShownItemIndex).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING
			},
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: undefined,
			scrollableContainerWidth: SCREEN_WIDTH,
			itemHeights: new Array(items.length),
			firstShownItemIndex: 4 * PREV_COLUMNS_COUNT + (1 * COLUMNS_COUNT - COLUMNS_COUNT),
			lastShownItemIndex: 8 * PREV_COLUMNS_COUNT - 1,
			beforeItemsHeight: 4 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (PREV_ROWS_COUNT - 8) * (PREV_ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Verify the average item height before resize.
		virtualScroller.getAverageItemHeight().should.equal(PREV_ITEM_HEIGHT)

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// The average item height has changed after resize.
		virtualScroller.getAverageItemHeight().should.equal(ITEM_HEIGHT)

		// Shows rows 3 to 4.
		// (total items count: 4 rows)
		virtualScroller.verifyState({
			firstShownItemIndex: 3 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 4 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 4 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 4) * (ITEM_HEIGHT + VERTICAL_SPACING),
			verticalSpacing: VERTICAL_SPACING,
			itemHeights: new Array(4 * PREV_COLUMNS_COUNT).concat(
				new Array(ROWS_COUNT * COLUMNS_COUNT - 4 * PREV_COLUMNS_COUNT).fill(ITEM_HEIGHT)
			)
		})

		// Scroll up to the original scroll position before resize, minus one pixel,
		// so that a new "upper" row becomes visible.
		virtualScroller.scrollTo(
			PRERENDER_MARGIN + 4 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING - 1
		)

		// Shows rows 2 to 4.
		// (total items count: 4 rows)
		virtualScroller.verifyState({
			beforeResize: {
				columnsCount: PREV_COLUMNS_COUNT,
				itemHeights: new Array(2 * PREV_COLUMNS_COUNT).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING
			},
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 4 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 2 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 4) * (ITEM_HEIGHT + VERTICAL_SPACING),
			itemHeights: new Array(2 * PREV_COLUMNS_COUNT).concat(
				new Array(ROWS_COUNT * COLUMNS_COUNT - 2 * PREV_COLUMNS_COUNT).fill(ITEM_HEIGHT)
			)
		})

		// Should have adjusted the scroll position due to clearing out
		// some of the "before resize" item heights.
		virtualScroller.getScrollY().should.equal(
			(PRERENDER_MARGIN + 4 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING - 1) +
			(
				(ITEM_HEIGHT + VERTICAL_SPACING) - 2 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING)
			)
		)

		// Scroll to the top.
		virtualScroller.scrollTo(PRERENDER_MARGIN)

		// Shows rows 1 to 3.
		virtualScroller.verifyState({
			beforeResize: undefined,
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			itemHeights: new Array(ROWS_COUNT * COLUMNS_COUNT).fill(ITEM_HEIGHT)
		})

		// Should have adjusted the scroll position due to clearing out
		// some of the "before resize" item heights.
		virtualScroller.getScrollY().should.equal(
			(PRERENDER_MARGIN) +
			(
				(ITEM_HEIGHT + VERTICAL_SPACING) - 2 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING)
			)
		)

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})