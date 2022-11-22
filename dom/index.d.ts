import { State, VirtualScrollerCommonOptions, SetItemsOptions } from '../index.d.ts';

export { State, ItemState } from '../index.d.ts';

import * as React from 'react';

interface Options<Item> extends VirtualScrollerCommonOptions<Item> {
	state?: State<Item>;
	scrollableContainer?: HTMLElement;
	onItemUnmount?(): void;
}

export default class VirtualScroller<Item> {
	constructor(
		itemsContainerElement: HTMLElement,
		items: Item[],
		renderItem: (item: Item) => HTMLElement,
		options?: Options<Item>
	);

	// start(): void;
	stop(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightChange(i: number): void;
}