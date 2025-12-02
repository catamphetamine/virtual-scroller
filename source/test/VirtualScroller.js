import VirtualScroller from '../VirtualScroller.js'
import Engine from './Engine.js'

const DEBUG = false

export default class TestVirtualScroller {
	constructor({
		screenWidth: scrollableContainerWidth,
		screenHeight: scrollableContainerHeight,
		columnsCount,
		verticalSpacing,
		items,
		getItemId,
		state: initialState,
		...rest
	}) {
		// Validate that no unknown properties are passed.
		// This prevents the cases when a developer confuses
		// `TestVirtualScroller` options for `VirtualScroller` options.
		if (Object.keys(rest).length > 0) {
			throw new Error(`Unknown options: ${Object.keys(rest).join(', ')}`)
		}

		this.expectedStateUpdates = []

		const scrollableContainerElement = {
			width: scrollableContainerWidth,
			height: scrollableContainerHeight
		}

		const containerElement = {
			paddingTop: 0,
			paddingBottom: 0,
			width: scrollableContainerElement.width,
			children: []
		}

		this.setScrollableContainerWidth = (width) => {
			scrollableContainerElement.width = width
			containerElement.width = width
		}

		this.setScrollableContainerHeight = (height) => {
			scrollableContainerElement.height = height
		}

		const getItemsContainerElement = () => containerElement

		this.__columnsCount = columnsCount

		const getColumnsCount = () => this.__columnsCount
		const getItemWidth = () => scrollableContainerElement.width / getColumnsCount()

		this.hasPausedStateUpdates = undefined
		this.pausedStateUpdate = undefined
		this.pausedStateUpdateAction = undefined

		const onBeforeUpdateState = (stateUpdate) => {
			if (this.expectedStateUpdates.length > 0) {
				const expectedStateUpdate = this.expectedStateUpdates.shift()
				expect(stateUpdate).to.deep.equal(expectedStateUpdate.stateUpdate)
				if (expectedStateUpdate.callback) {
					expectedStateUpdate.callback()
				}
			}
		}

		const render = () => {
			const {
				items,
				beforeItemsHeight,
				afterItemsHeight,
				firstShownItemIndex,
				lastShownItemIndex
			} = this.virtualScroller.getState()

			containerElement.paddingTop = beforeItemsHeight
			containerElement.paddingBottom = afterItemsHeight

			containerElement.children = items
				.slice(firstShownItemIndex, lastShownItemIndex + 1)
				.map((item) => ({
					getWidth: () => getItemWidth(),
					getHeight: () => (item.getArea ? item.getArea() : item.area) / getItemWidth(),
					getMarginTop: () => verticalSpacing
				}))
		}

		this.virtualScroller = new VirtualScroller(getItemsContainerElement, items, {
			scrollableContainer: scrollableContainerElement,
			engine: Engine,
			_waitForScrollingToStop: false,
			getItemId,
			getColumnsCount,
			state: initialState,
			onStateChange(state) {
				if (DEBUG) {
					console.log('~ Updated State ~')
					console.log(state)
				}
			}
		})

		let state = this.virtualScroller.getInitialState()

		this.virtualScroller.useState({
			getState: () => state,
			updateState: (stateUpdate) => {
				const stateUpdateAction = (stateUpdate) => {
					// Is only used in tests.
					if (onBeforeUpdateState) {
						onBeforeUpdateState(stateUpdate)
					}
					state = {
						...state,
						...stateUpdate
					}
					render()
					this.virtualScroller.onRender()
				}
				if (this.hasPausedStateUpdates) {
					this.pausedStateUpdate = {
						...this.pausedStateUpdate,
						...stateUpdate
					}
					this.pausedStateUpdateAction = stateUpdateAction
				} else {
					stateUpdateAction(stateUpdate)
				}
			}
		})

		render()
	}

	pauseStateUpdates() {
		if (this.hasPausedStateUpdates) {
			throw new Error('[virtual-scroller] State updates have already been paused')
		}
		this.hasPausedStateUpdates = true
	}

	resumeStateUpdates() {
		if (this.pausedStateUpdate) {
			this.pausedStateUpdateAction(this.pausedStateUpdate)
			this.pausedStateUpdate = undefined
			this.pausedStateUpdateAction = undefined
		}
		this.hasPausedStateUpdates = false
	}

	verifyState(expectedState) {
		// `mocha`/`chai`.
		this.virtualScroller.getState().should.deep.include(expectedState)
	}

	expectStateUpdate(stateUpdate, callback) {
		this.expectedStateUpdates.push({
			stateUpdate,
			callback
		})
	}

	getFirstNonMeasuredItemIndex() {
		return this.virtualScroller.firstNonMeasuredItemIndex
	}

	getScrollY() {
		return this.virtualScroller.scrollableContainer.getScrollY()
	}

	scrollTo(scrollPosition) {
		this.virtualScroller.scrollableContainer.scrollToY(scrollPosition)
	}

	updateScreenDimensions({
		screenWidth: scrollableContainerWidth,
		screenHeight: scrollableContainerHeight,
		columnsCount
	}) {
		// Resize scrollable container.
		this.setScrollableContainerWidth(scrollableContainerWidth)
		this.setScrollableContainerHeight(scrollableContainerHeight)

		// Update columns count.
		this.__columnsCount = columnsCount
	}

	// Returns a `Promise`.
	triggerResize({
		screenWidth,
		screenHeight,
		columnsCount,
		verticalSpacing
	}) {
		this.updateScreenDimensions({
			screenWidth,
			screenHeight,
			columnsCount,
			verticalSpacing
		})

		// Call "on resize" listener.
		return this.virtualScroller.scrollableContainer._triggerResizeListener()
	}

	stop() {
		if (this.expectedStateUpdates.length > 0) {
			throw new Error(`[virtual-scroller] Expected ${this.expectedStateUpdates.length} state updates which didn't happen:\n${JSON.stringify(this.expectedStateUpdates, null, 2)}`)
		}
		if (this.pausedStateUpdate) {
			throw new Error('[virtual-scroller] State updates were paused and haven\'t been resumed afterwards')
		}
		this.virtualScroller.stop()
	}

	start() {
		this.virtualScroller.start()
	}

	getState() {
		return this.virtualScroller.getState()
	}

	updateLayout() {
		this.virtualScroller.updateLayout()
	}

	getItemScrollPosition(itemOrIndex) {
		return this.virtualScroller.getItemScrollPosition(itemOrIndex)
	}

	onItemHeightDidChange(itemOrIndex) {
		this.virtualScroller.onItemHeightDidChange(itemOrIndex)
	}

	setItemState(itemOrIndex, newState) {
		this.virtualScroller.setItemState(itemOrIndex, newState)
	}

	getAverageItemHeight() {
		return this.virtualScroller.getAverageItemHeight()
	}

	setItems(newItems, options) {
		this.virtualScroller.setItems(newItems, options)
	}
}
