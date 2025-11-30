import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should show and hide items on scroll (restored state)', async function() {
		const SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 2
		const ROWS_COUNT = 8

		const ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		const ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		const items = new Array(ROWS_COUNT * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })

		const virtualScroller = new VirtualScroller({
			// The `items` option will be overridden by the `items` from the restored state.
			items: [],
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING,
			state: {
				items,
				itemHeights: new Array(items.length).fill(ITEM_HEIGHT),
				itemStates: new Array(items.length),
				firstShownItemIndex: 2,
				lastShownItemIndex: 3,
				beforeItemsHeight: 200,
				afterItemsHeight: ITEM_HEIGHT * 6,
				verticalSpacing: undefined,
				columnsCount: COLUMNS_COUNT,
				scrollableContainerWidth: SCREEN_WIDTH
			}
		})

		virtualScroller.verifyState({
			firstShownItemIndex: 2,
			lastShownItemIndex: 3,
			beforeItemsHeight: ITEM_HEIGHT * 1,
			afterItemsHeight: ITEM_HEIGHT * 6,
			scrollableContainerWidth: SCREEN_WIDTH
		})

		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 0,
			lastShownItemIndex: 4 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: ITEM_HEIGHT * 4
		})

		// Layout has been re-calculated based on the actual item heights
		// and the actual vertical spacing.
		virtualScroller.expectStateUpdate({
			verticalSpacing: 100
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})