import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should handle two consequitive window resizes (different columns count)', async function() {
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

		let PREV_COLUMNS_COUNT = COLUMNS_COUNT
		let PREV_ROWS_COUNT = ROWS_COUNT

		let PREV_ITEM_HEIGHT = ITEM_HEIGHT
		let PREV_SCREEN_WIDTH = SCREEN_WIDTH

		SCREEN_WIDTH /= 2
		COLUMNS_COUNT /= 2
		ROWS_COUNT = Math.ceil(ITEMS_COUNT / COLUMNS_COUNT)

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		virtualScroller.verifyState({
			beforeResize: {
				itemHeights: new Array(PREV_COLUMNS_COUNT).fill(PREV_ITEM_HEIGHT),
				verticalSpacing: VERTICAL_SPACING,
				columnsCount: PREV_COLUMNS_COUNT
			},
			firstShownItemIndex: 3 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 6 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 6) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Resize back to the original window width.

		const BEFORE_RESIZE_ITEMS_COUNT = virtualScroller.getState().beforeResize.itemHeights.length

		SCREEN_WIDTH = PREV_SCREEN_WIDTH
		COLUMNS_COUNT = PREV_COLUMNS_COUNT
		ITEM_HEIGHT = PREV_ITEM_HEIGHT
		ROWS_COUNT = PREV_ROWS_COUNT

		PREV_COLUMNS_COUNT = COLUMNS_COUNT / 2
		PREV_SCREEN_WIDTH = SCREEN_WIDTH / 2
		PREV_ITEM_HEIGHT = ITEM_HEIGHT
		PREV_ROWS_COUNT = Math.ceil(ITEMS_COUNT / PREV_COLUMNS_COUNT)

		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		virtualScroller.verifyState({
			beforeResize: {
				itemHeights: new Array(BEFORE_RESIZE_ITEMS_COUNT).fill(
					(PREV_ITEM_HEIGHT + VERTICAL_SPACING) * (PREV_COLUMNS_COUNT / COLUMNS_COUNT) - VERTICAL_SPACING
				),
				verticalSpacing: VERTICAL_SPACING,
				columnsCount: PREV_COLUMNS_COUNT
			},
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: PREV_ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})