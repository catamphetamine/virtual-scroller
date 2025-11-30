import VirtualScroller from './VirtualScroller.js'

describe('VirtualScroller', function() {
	it('should set item state', async function() {
		let SCREEN_WIDTH = 800
		const SCREEN_HEIGHT = 400

		const PRERENDER_MARGIN = SCREEN_HEIGHT

		const COLUMNS_COUNT = 4
		const ROWS_COUNT = 8
		const ITEMS_COUNT = ROWS_COUNT * COLUMNS_COUNT

		let ITEM_WIDTH = SCREEN_WIDTH / COLUMNS_COUNT
		let ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		// 16 items, 8 rows.
		const items = new Array(ROWS_COUNT * COLUMNS_COUNT)

		// Fill in item areas.
		// These item areas may change later.
		const itemAreas = new Array(ROWS_COUNT * COLUMNS_COUNT)
		let i = 0
		while (i < itemAreas.length) {
			itemAreas[i] = ITEM_WIDTH * ITEM_HEIGHT
			i++
		}
		// Fill the `items` array.
		// Each `item` must have a unique object "reference"
		// because it will be used as an argument of `.onItemHeightDidChange()` method.
		i = 0
		while (i < items.length) {
			// Work around javascript "closure" bug.
			const j = i
			items[i] = {
				getArea: () => itemAreas[j]
			}
			i++
		}

		const virtualScroller = new VirtualScroller({
			items,
			screenWidth: SCREEN_WIDTH,
			screenHeight: SCREEN_HEIGHT,
			columnsCount: COLUMNS_COUNT,
			verticalSpacing: VERTICAL_SPACING
		})

		// Start listening to scroll events.
		virtualScroller.start()

		// Shows rows 1 to 3.
		virtualScroller.verifyState({
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 3 * COLUMNS_COUNT - 1,
			beforeItemsHeight: 0 * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (ROWS_COUNT - 3) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Change the height of the first item in the second row.
		itemAreas[2 * COLUMNS_COUNT - COLUMNS_COUNT] = ITEM_WIDTH * ITEM_HEIGHT * 2

		// Notify that the height of the first item in the second row has changed.
		// New method signature: `item` argument instead of `itemIndex` argument.
		virtualScroller.onItemHeightDidChange(items[2 * COLUMNS_COUNT - COLUMNS_COUNT])

		// Verify the updated item state.
		// Shows rows 1 to 2.
		virtualScroller.verifyState({
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 2 * COLUMNS_COUNT - 1
		})

		// Change the height of the first item in the first row.
		itemAreas[1 * COLUMNS_COUNT - COLUMNS_COUNT] = ITEM_WIDTH * ITEM_HEIGHT * 2

		// Notify that the height of the first item in the first row has changed.
		// Old method signature: `itemIndex` argument instead of `item` argument.
		virtualScroller.onItemHeightDidChange(1 * COLUMNS_COUNT - COLUMNS_COUNT)

		// Verify the updated item state.
		// Shows rows 1 to 2.
		virtualScroller.verifyState({
			firstShownItemIndex: 1 * COLUMNS_COUNT - COLUMNS_COUNT,
			lastShownItemIndex: 2 * COLUMNS_COUNT - 1
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})