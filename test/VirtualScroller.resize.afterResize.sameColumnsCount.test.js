import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should handle two consequitive window resizes (same columns count)', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 4
		const ROWS_COUNT = 8
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
		virtualScroller.scrollTo(ITEM_HEIGHT + MARGIN)

		// Shows rows 2 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Resize the window.

		let PREV_ITEM_HEIGHT = ITEM_HEIGHT
		let PREV_SCREEN_WIDTH = SCREEN_WIDTH

		SCREEN_WIDTH /= 2
		ITEM_HEIGHT *= 2

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		virtualScroller.verifyState({
			beforeResize: {
				itemHeights: new Array(COLUMNS_COUNT).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING,
				columnsCount: COLUMNS_COUNT
			},
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 4 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 4) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Resize back to the original window width.

		const BEFORE_RESIZE_ITEMS_COUNT = virtualScroller.getState().beforeResize.itemHeights.length

		SCREEN_WIDTH = PREV_SCREEN_WIDTH
		ITEM_HEIGHT = PREV_ITEM_HEIGHT

		PREV_SCREEN_WIDTH = SCREEN_WIDTH / 2
		PREV_ITEM_HEIGHT = ITEM_HEIGHT * 2

		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		virtualScroller.verifyState({
			beforeResize: {
				itemHeights: new Array(BEFORE_RESIZE_ITEMS_COUNT).fill(ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING,
				columnsCount: COLUMNS_COUNT
			},
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})