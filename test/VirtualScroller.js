import VirtualScroller from '../source/VirtualScroller'
import Engine from './Engine'

const DEBUG = false

export default function createVirtualScroller({
	screenWidth: scrollableContainerWidth,
	screenHeight: scrollableContainerHeight,
	columnsCount,
	verticalSpacing,
	items
}) {
	let expectedStateUpdates = []

	const scrollableContainer = {
		width: scrollableContainerWidth,
		height: scrollableContainerHeight
	}

	const container = {
		paddingTop: 0,
		paddingBottom: 0,
		width: scrollableContainer.width,
		children: []
	}

	const getItemsContainerElement = () => container

	let getColumnsCount = () => columnsCount
	const getItemWidth = () => scrollableContainer.width / getColumnsCount()

	let state

	let pauseStateUpdates
	let pausedStateUpdate
	let pausedStateUpdateAction

	const _onStateUpdate = (stateUpdate) => {
		if (expectedStateUpdates.length > 0) {
			const expectedStateUpdate = expectedStateUpdates.shift()
			expect(stateUpdate).to.deep.equal(expectedStateUpdate.stateUpdate)
			if (expectedStateUpdate.callback) {
				expectedStateUpdate.callback()
			}
		}
	}

	const virtualScroller = new VirtualScroller(getItemsContainerElement, items, {
		scrollableContainer,
		engine: Engine,
		_waitForScrollingToStop: false,
		getColumnsCount: (scrollableContainer) => getColumnsCount(),
		getState: () => state,
		setState: (stateUpdate, { willUpdateState, didUpdateState }) => {
			const stateUpdateAction = (stateUpdate) => {
				// Is only used in tests.
				if (_onStateUpdate) {
					_onStateUpdate(stateUpdate)
				}
				const prevState = state
				const newState = {
					...prevState,
					...stateUpdate
				}
				willUpdateState(newState, prevState)
				state = newState
				didUpdateState(prevState)
			}
			if (pauseStateUpdates) {
				pausedStateUpdate = {
					...pausedStateUpdate,
					...stateUpdate
				}
				pausedStateUpdateAction = stateUpdateAction
			} else {
				stateUpdateAction(stateUpdate)
			}
		},
		onStateChange(state) {
			if (DEBUG) {
				console.log('~ Update State ~')
				console.log(state)
			}
			container.paddingTop = state.beforeItemsHeight
			container.paddingBottom = state.afterItemsHeight
			container.children = items
				.slice(state.firstShownItemIndex, state.lastShownItemIndex + 1)
				.map((item) => ({
					width: getItemWidth(),
					height: item.area / getItemWidth(),
					marginTop: verticalSpacing
				}))
		}
	})

	virtualScroller.pauseStateUpdates = () => {
		if (pauseStateUpdates) {
			throw new Error('[virtual-scroller] State updates have already been paused')
		}
		pauseStateUpdates = true
	}

	virtualScroller.resumeStateUpdates = () => {
		if (pausedStateUpdate) {
			pausedStateUpdateAction(pausedStateUpdate)
			pausedStateUpdate = undefined
			pausedStateUpdateAction = undefined
		}
		pauseStateUpdates = false
	}

	virtualScroller.verifyState = (expectedState) => {
		state.should.deep.include(expectedState)
	}

	virtualScroller.expectStateUpdate = (stateUpdate, callback) => {
		expectedStateUpdates.push({
			stateUpdate,
			callback
		})
	}

	virtualScroller.scrollTo = (scrollPosition) => {
		virtualScroller.scrollableContainer.scrollToY(scrollPosition)
	}

	virtualScroller.triggerResize = async ({
		screenWidth: scrollableContainerWidth,
		screenHeight: scrollableContainerHeight,
		columnsCount,
		verticalSpacing
	}) => {
		// Resize scrollable container.
		scrollableContainer.width = scrollableContainerWidth
		scrollableContainer.height = scrollableContainerHeight

		// Resize items container.
		container.width = scrollableContainerWidth

		// Update columns count.
		getColumnsCount = () => columnsCount

		// Call "on resize" listener.
		await virtualScroller.scrollableContainer.onResizeListener()
	}

	const stop = virtualScroller.stop
	virtualScroller.stop = () => {
		if (expectedStateUpdates.length > 0) {
			throw new Error(`[virtual-scroller] Expected ${expectedStateUpdates.length} state updates which didn't happen:\n${JSON.stringify(expectedStateUpdates, null, 2)}`)
		}
		if (pausedStateUpdate) {
			throw new Error('[virtual-scroller] State updates were paused and haven\'t been resumed afterwards')
		}
		stop()
	}

	return virtualScroller
}
