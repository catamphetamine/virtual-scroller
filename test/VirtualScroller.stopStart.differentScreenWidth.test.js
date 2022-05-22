import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should show and hide items on scroll (restart) (different screen width)', async function() {
		let SCREEN_WIDTH = 800
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
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Shows just the first row of items in order to measure non-measured items.
		// (when no `estimatedItemHeight` has been supplied)
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

		// Stop listening to scroll events.
		virtualScroller.stop()

		SCREEN_WIDTH /= 2

		// Resize.
		virtualScroller.resize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
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

		virtualScroller.expectStateUpdate({
			beforeItemsHeight: 0,
			afterItemsHeight: (ITEM_HEIGHT + VERTICAL_SPACING) * 10,
			firstShownItemIndex: 0,
			lastShownItemIndex: 2 * COLUMNS_COUNT - 1,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})