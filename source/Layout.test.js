import Layout from './Layout.js'

import Engine from './test/Engine.js'

describe('Layout', function() {
	it('should work', function() {
		const SCREEN_HEIGHT = 400

		const scrollableContainer = {
			width: 800,
			height: SCREEN_HEIGHT
		}

		const ITEM_WIDTH = scrollableContainer.width
		const ITEM_HEIGHT = 200

		const VERTICAL_SPACING = 100

		const items = new Array(9).fill(ITEM_WIDTH * ITEM_HEIGHT)

		const layout = new Layout({
			getPrerenderMargin: () => SCREEN_HEIGHT,
			getVerticalSpacing: () => VERTICAL_SPACING,
			getColumnsCount: () => 1,
			getItemHeight: (i) => items[i] / scrollableContainer.width,
			getBeforeResizeItemsCount: () => 0,
			getAverageItemHeight: () => ITEM_HEIGHT,
			getScrollableContainerHeight: () => scrollableContainer.height
		})

		// Initial render.
		layout.getShownItemIndexes({
			itemsCount: items.length,
			visibleAreaInsideTheList: {
				top: 0,
				bottom: SCREEN_HEIGHT
			}
		}).should.deep.equal({
			firstShownItemIndex: 0,
			lastShownItemIndex: 2
		})

		// The first item is almost hidden.
		layout.getShownItemIndexes({
			itemsCount: items.length,
			visibleAreaInsideTheList: {
				top: SCREEN_HEIGHT + ITEM_HEIGHT - 1,
				bottom: (SCREEN_HEIGHT + ITEM_HEIGHT - 1) + SCREEN_HEIGHT
			}
		}).should.deep.equal({
			firstShownItemIndex: 0,
			lastShownItemIndex: 4
		})

		// The first item is hidden.
		layout.getShownItemIndexes({
			itemsCount: items.length,
			visibleAreaInsideTheList: {
				top: SCREEN_HEIGHT + ITEM_HEIGHT,
				bottom: (SCREEN_HEIGHT + ITEM_HEIGHT) + SCREEN_HEIGHT
			}
		}).should.deep.equal({
			firstShownItemIndex: 1,
			lastShownItemIndex: 4
		})

		// A new item at the bottom is almost visible.
		layout.getShownItemIndexes({
			itemsCount: items.length,
			visibleAreaInsideTheList: {
				top: (ITEM_HEIGHT + VERTICAL_SPACING) * 5 - SCREEN_HEIGHT * 2,
				bottom: (ITEM_HEIGHT + VERTICAL_SPACING) * 5 - SCREEN_HEIGHT
			}
		}).should.deep.equal({
			firstShownItemIndex: 1,
			lastShownItemIndex: 4
		})

		// A new item at the bottom is visible.
		layout.getShownItemIndexes({
			itemsCount: items.length,
			visibleAreaInsideTheList: {
				top: (ITEM_HEIGHT + VERTICAL_SPACING) * 5 + 1 - SCREEN_HEIGHT * 2,
				bottom: (ITEM_HEIGHT + VERTICAL_SPACING) * 5 + 1 - SCREEN_HEIGHT
			}
		}).should.deep.equal({
			firstShownItemIndex: 1,
			lastShownItemIndex: 5
		})
	})

	it('should update layout for items incremental change', function() {
		const scrollableContainer = {
			width: 800,
			height: 400
		}

		const ITEM_WIDTH = scrollableContainer.width
		const ITEM_HEIGHT = 200

		const items = new Array(9).fill(ITEM_WIDTH * ITEM_HEIGHT)

		const VERTICAL_SPACING = 100

		const layout = new Layout({
			getPrerenderMargin: () => scrollableContainer.height,
			getVerticalSpacing: () => VERTICAL_SPACING,
			getColumnsCount: () => 1,
			getItemHeight: (i) => ITEM_HEIGHT,
			getBeforeResizeItemsCount: () => 0,
			getAverageItemHeight: () => ITEM_HEIGHT,
			getScrollableContainerHeight: () => scrollableContainer.height
		})

		layout.getLayoutUpdateForItemsDiff(
			{
				firstShownItemIndex: 3,
				lastShownItemIndex: 5,
				beforeItemsHeight: 3 * (ITEM_HEIGHT + VERTICAL_SPACING),
				afterItemsHeight: 3 * (ITEM_HEIGHT + VERTICAL_SPACING)
			},
			{
				prependedItemsCount: 5,
				appendedItemsCount: 5
			}, {
				itemsCount: 5 + 5 + items.length,
				columnsCount: 1
			}
		).should.deep.equal({
			firstShownItemIndex: 5 + 3,
			lastShownItemIndex: 5 + 5,
			beforeItemsHeight: (5 + 3) * (ITEM_HEIGHT + VERTICAL_SPACING),
			afterItemsHeight: (3 + 5) * (ITEM_HEIGHT + VERTICAL_SPACING)
		})
	})

	it('should update layout for items incremental change (rows get rebalanced)', function() {
		const scrollableContainer = {
			width: 800,
			height: 400
		}
		const ITEM_WIDTH = scrollableContainer.width
		const ITEM_HEIGHT = 400

		const items = new Array(9).fill(ITEM_WIDTH * ITEM_HEIGHT)

		const VERTICAL_SPACING = 100

		const layout = new Layout({
			getPrerenderMargin: () => scrollableContainer.height,
			getVerticalSpacing: () => VERTICAL_SPACING,
			getColumnsCount: () => 4,
			getItemHeight: () => ITEM_HEIGHT,
			getBeforeResizeItemsCount: () => 0,
			getAverageItemHeight: () => ITEM_HEIGHT,
			getScrollableContainerHeight: () => scrollableContainer.height
		})

		let shouldResetGridLayout

		// Don't `throw` `VirtualScroller` errors but rather collect them in an array.
		const errors = []
		global.VirtualScrollerCatchError = (error) => {
			errors.push(error)
		}

		layout.getLayoutUpdateForItemsDiff(
			{
				firstShownItemIndex: 3,
				lastShownItemIndex: 5,
				beforeItemsHeight: 3 * (ITEM_HEIGHT + VERTICAL_SPACING),
				afterItemsHeight: 3 * (ITEM_HEIGHT + VERTICAL_SPACING)
			},
			{
				prependedItemsCount: 5,
				appendedItemsCount: 5
			}, {
				itemsCount: 5 + 5 + items.length,
				columnsCount: 4,
				shouldRestoreScrollPosition: true,
				onResetGridLayout: () => shouldResetGridLayout = true
			}
		).should.deep.equal({
			firstShownItemIndex: 0,
			lastShownItemIndex: 5 + 5,
			beforeItemsHeight: 0,
			afterItemsHeight: 5 * (ITEM_HEIGHT + VERTICAL_SPACING)
		})

		// Stop collecting `VirtualScroller` errors in the `errors` array.
		// Use the default behavior of just `throw`-ing such errors.
		global.VirtualScrollerCatchError = undefined
		// Verify the errors that have been `throw`-n.
		errors.length.should.equal(2)
		errors[0].message.should.equal('[virtual-scroller] ~ Prepended items count 5 is not divisible by Columns Count 4 ~')
		errors[1].message.should.equal('[virtual-scroller] Layout reset required')

		shouldResetGridLayout.should.equal(true)
	})
})