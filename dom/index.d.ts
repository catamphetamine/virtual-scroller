import { State, NoItemState, VirtualScrollerCommonOptions, SetItemsOptions } from '../index.d.js';

export { State } from '../index.d.js';

interface Options<Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	state?: State<Item, ItemState>;
	scrollableContainer?: HTMLElement;
	getScrollableContainer?(): HTMLElement;
	onItemUnmount?(itemElement: HTMLElement): void;
	readyToStart?: boolean;
	readyToRender?: boolean;
}

export default class VirtualScroller<Item, ItemState = NoItemState> {
	constructor(
		itemsContainerElement: HTMLElement | (() => HTMLElement),
		items: Item[],
		renderItem: (item: Item) => HTMLElement,
		options?: Options<Item, ItemState>
	);

	// start(): void;
	stop(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightDidChange(i: number): void;
  setItemState(i: number, newState: ItemState): void;
}