import { State, VirtualScrollerCommonOptions, VirtualScrollerSetItemsOptions } from '../index.d.ts';

export { State, ItemState } from '../index.d.ts';

import * as React from 'react';

interface Options<Item> extends VirtualScrollerCommonOptions<HTMLElement, Item> {
	onMount?: () => void;
	onItemUnmount?: () => void;
}

export default class VirtualScroller<Item> {
	constructor(
		itemsContainerElement: HTMLElement,
		items: Item[],
		renderItem: (item: Item) => HTMLElement,
		options?: Options<Item>
	);

	stop(): void;
	setItems(newItems: Item[], options?: VirtualScrollerSetItemsOptions): void;
  onItemHeightChange(i: number): void;
}