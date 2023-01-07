export default class ScrollableContainerNotReadyError extends Error {
	constructor() {
		super('[virtual-scroller] Scrollable container not found');
	}
}