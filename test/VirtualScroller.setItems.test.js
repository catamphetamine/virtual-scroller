import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should append and prepend items', () => {
		const SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 2
		let ROWS_COUNT = 8

		const ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		const ITEM_HEIGHT = 200

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

		// Append a row of items.

		items = items.concat(new Array(1 * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT }))
		ROWS_COUNT++

		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING),
			items,
			itemStates: new Array(items.length),
			itemHeights: new Array(5 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
				new Array(items.length - 5 * COLUMNS_COUNT)
			)
		})

		virtualScroller.setItems(items)

		// Still shows rows 2 to 5.
		virtualScroller.verifyState({
			firstShownItemIndex: 2 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 5 * COLUMNS_COUNT - 1,
			beforeItemsHeight: ITEM_HEIGHT + VERTICAL_SPACING,
			afterItemsHeight: (ROWS_COUNT - 5) * (ITEM_HEIGHT + VERTICAL_SPACING),
			items
		})

		// Prepend a row of items.
		// (resets layout because showing not from the first item)

		let itemsCountBeforePrepend = items.length
		items = new Array(1 * COLUMNS_COUNT).fill({ area: ITEM_WIDTH * ITEM_HEIGHT }).concat(items)
		ROWS_COUNT++

		virtualScroller.expectStateUpdate({
			firstShownItemIndex: 0,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0,
			afterItemsHeight: 0,
			items,
			itemHeights: new Array(1 * COLUMNS_COUNT).concat(
				new Array(5 * COLUMNS_COUNT).fill(ITEM_HEIGHT).concat(
					new Array(itemsCountBeforePrepend - 5 * COLUMNS_COUNT)
				)
			),
			itemStates: new Array(items.length)
		})

		virtualScroller.setItems(items)

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})