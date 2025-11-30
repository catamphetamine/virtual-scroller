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

		// Fill the `items` array.
		// Each `item` must have a unique object "reference"
		// because it will be used as an argument of `.setItemState()` method.
		let i = 0
		while (i < items.length) {
			items[i] = { area: ITEM_WIDTH * ITEM_HEIGHT }
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

		// Set the state of the first item in the second row.
		// New method signature: `item` argument instead of `itemIndex` argument.
		virtualScroller.setItemState(items[2 * COLUMNS_COUNT - COLUMNS_COUNT], { a: 'b' })

		// Verify the updated item state
		const itemStatesUpdated = new Array(ROWS_COUNT * COLUMNS_COUNT).fill(undefined)
		itemStatesUpdated[2 * COLUMNS_COUNT - COLUMNS_COUNT] = { a: 'b' }
		virtualScroller.verifyState({
			itemStates: itemStatesUpdated
		})

		// Set the state of the first item in the second row.
		// Old method signature: `itemIndex` argument instead of `item` argument.
		virtualScroller.setItemState(2 * COLUMNS_COUNT - COLUMNS_COUNT, { a: 'c' })

		// Verify the updated item state
		const itemStatesUpdatedSecondTime = new Array(ROWS_COUNT * COLUMNS_COUNT).fill(undefined)
		itemStatesUpdatedSecondTime[2 * COLUMNS_COUNT - COLUMNS_COUNT] = { a: 'c' }
		virtualScroller.verifyState({
			itemStates: itemStatesUpdatedSecondTime
		})

		// Stop listening to scroll events.
		virtualScroller.stop()
	})
})