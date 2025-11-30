import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should rebalance rows on columns count change on window resize', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		let COLUMNS_COUNT = 4
		let ROWS_COUNT = 8
		const ITEMS_COUNT = ROWS_COUNT * COLUMNS_COUNT

		let ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		let ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		const items = new Array(ROWS_COUNT * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })

		const virtualScroller = new VirtualScroller({
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// The first row of items is hidden.
		virtualScroller.scrollTo(ITEM_HEIGHT + PRERENDER_MARGIN)

		// Shows rows 2 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Resize the window.

		const PREV_COLUMNS_COUNT = COLUMNS_COUNT
		const PREV_ROWS_COUNT = ROWS_COUNT

		const PREV_ITEM_HEIGHT = ITEM_HEIGHT

		SCREEN_WIDTH = SCREEN_WIDTH * 3 / 4
		COLUMNS_COUNT = 3
		ROWS_COUNT = Math.ceil(ITEMS_COUNT / COLUMNS_COUNT)

		virtualScroller.expectStateUpdate({
			beforeResize: {
				columnsCount: PREV_COLUMNS_COUNT,
				itemHeights: new Array(COLUMNS_COUNT).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING
			},
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: undefined,
			scrollableContainerWidth: SCREEN_WIDTH,
			itemHeights: new Array(items.length),
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 7 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (PREV_ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (PREV_ROWS_COUNT - 5) * (PREV_ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})