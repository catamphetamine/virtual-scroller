import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should show and hide items on scroll', async function() {
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
			virtualScroller.getFirstNonMeasuredItemIndex().should.equal(2)
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

		// Shows the first 3 rows of items.
		virtualScroller.verifyState({
			firstShownItemIndex: 0,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// The first row of items is almost hidden.
		virtualScroller.scrollTo((ITEM_HEIGHT - 1) + PRERENDER_MARGIN)

		// Shows the first 5 rows of items.
		virtualScroller.verifyState({
			firstShownItemIndex: 0,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// The first row of items is hidden.
		virtualScroller.scrollTo(ITEM_HEIGHT + PRERENDER_MARGIN)

		// Doesn't show the first row of items.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// A new row of items is almost shown.
		virtualScroller.scrollTo((ITEM_HEIGHT + VERTICAL_SPACING) * 5 - SCREEN_HEIGHT * 2)
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// A new row of items is shown.
		virtualScroller.scrollTo((ITEM_HEIGHT + VERTICAL_SPACING) * 5 - SCREEN_HEIGHT * 2 + 1)
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: COLUMNS_COUNT + 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 1 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 6) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})

	it('should update layout manually', function() {
		const virtualScroller = new VirtualScroller({
			items: [{ area: 8000 }],
			screenWidth: 800,
			screenHeight: 400,
			columnsCount: 1,
			verticalSpacing: 0
		})

		virtualScroller.start()
		virtualScroller.updateLayout()
	})
})