import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should replace items after window resize', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const MARGIN = SCREEN_HEIGHT

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

		virtualScroller.pauseStateUpdates()

		// Resize the window.

		const PREV_COLUMNS_COUNT = COLUMNS_COUNT
		const PREV_ROWS_COUNT = ROWS_COUNT

		const PREV_ITEM_HEIGHT = ITEM_HEIGHT

		const {
			firstShownItemIndex: prevFirstShownItemIndex
		} = virtualScroller.getState()

		SCREEN_WIDTH /= 4
		COLUMNS_COUNT /= 2
		ROWS_COUNT *= 2

		ITEM_WIDTH /= 2
		ITEM_HEIGHT *= 2

		// Resize.
		await virtualScroller.triggerResize({
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Append items.
		items = new Array(items.length).fill({ area: ITEM_WIDTH * ITEM_HEIGHT })
		virtualScroller.setItems(items)

		// Combined state update.
		virtualScroller.expectStateUpdate({
			beforeResize: undefined,
			columnsCount: undefined, // COLUMNS_COUNT,
			verticalSpacing: undefined,
			scrollableContainerWidth: SCREEN_WIDTH,
			items,
			itemHeights: new Array(items.length),
			itemStates: new Array(items.length),
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: 0
		})

		virtualScroller.resumeStateUpdates()

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})