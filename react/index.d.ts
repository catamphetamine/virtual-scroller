import { State, VirtualScrollerCommonOptions } from '../index.d.ts';

export { State, ItemState } from '../index.d.ts';

import * as React from 'react';

interface Props<Item> extends VirtualScrollerCommonOptions<HTMLElement, Item>, React.HTMLAttributes<HTMLElement> {
	as?: React.ElementType;
	items: Item[];
	itemComponent: React.ElementType;
	itemComponentProps?: object;
	initialState?: State<Item>;
	preserveScrollPositionOnPrependItems?: boolean;
	getScrollableContainer?(): HTMLElement;
}

type ReactVirtualScroller<Item> = (props: Props<Item>) => JSX.Element;

// TypeScript doesn't know how to receive `<Item>` "generic":
// declare const VirtualScroller<Item>: ReactVirtualScroller<Item>;
//
// Uses `<any>` instead.
//
// If someone finds a fix for this, create an issue.
//
declare const VirtualScroller: ReactVirtualScroller<any>;

export default VirtualScroller;