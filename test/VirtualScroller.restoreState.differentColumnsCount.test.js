import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should show and hide items on scroll (restored state) (different columns count)', async function() {
		const SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const MARGIN = SCREEN_HEIGHT

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
				scrollableContainerWidth: SCREEN_WIDTH
			}
		})

		// Columns count mismatch — the state gets reset.
		virtualScroller.verifyState({
			firstShownItemIndex: 0,
			lastShownItemIndex: 1,
			beforeItemsHeight: 0,
			afterItemsHeight: 0
		})
	})
})