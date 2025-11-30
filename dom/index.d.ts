import { State, VirtualScrollerCommonOptions, SetItemsOptions } from '../index.d.js';

export { State, NoItemState } from '../index.d.js';

interface Options<Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	state?: State<Item, ItemState>;
	// `scrollableContainer` is deprecated, use `getScrollableContainer()` instead.
	scrollableContainer?: HTMLElement;
	getScrollableContainer?(): HTMLElement;
	onItemUnmount?(itemElement: HTMLElement): void;
	readyToStart?: boolean;
	readyToRender?: boolean;
}

export default class VirtualScroller<Item, ItemState = unknown> {
	constructor(
		itemsContainerElement: HTMLElement | (() => HTMLElement),
		items: Item[],
		renderItem: (item: Item) => HTMLElement,
		options?: Options<Item, ItemState>
	);

	// start(): void;
	stop(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightDidChange(item: Item): void;
  setItemState(item: Item, newState: ItemState): void;
}