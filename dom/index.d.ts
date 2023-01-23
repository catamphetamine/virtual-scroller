import { State, NoItemState, VirtualScrollerCommonOptions, SetItemsOptions } from '../index.d.ts';

export { State } from '../index.d.ts';

import * as React from 'react';

interface Options<Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	state?: State<Item, ItemState>;
	scrollableContainer?: HTMLElement;
	onItemUnmount?(): void;
}

export default class VirtualScroller<Item, ItemState = NoItemState> {
	constructor(
		itemsContainerElement: HTMLElement,
		items: Item[],
		renderItem: (item: Item) => HTMLElement,
		options?: Options<Item, ItemState>
	);

	// start(): void;
	stop(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightChange(i: number): void;
  setItemState(i: number, newState: ItemState): void;
}