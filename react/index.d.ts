import { State, VirtualScrollerCommonOptionsWithoutInitialState } from '../index.d.ts';

export { State, ItemState } from '../index.d.ts';

import * as React from 'react';

interface Props<Item> extends VirtualScrollerCommonOptionsWithoutInitialState<HTMLElement, Item> {
	as?: React.ReactType;
	items: Item[];
	itemComponent: React.ReactType;
	itemComponentProps?: object;
	className?: string;
	initialCustomState?: object;
	initialState?: State<Item>;
	preserveScrollPositionOnPrependItems?: boolean;
	onMount?: () => void;
}

type ReactVirtualScroller<Item> = React.ComponentClass<Props<Item>, State<Item>>

// TypeScript doesn't know how to receive `<Item>` "generic":
// declare const VirtualScroller<Item>: ReactVirtualScroller<Item>;
//
// Uses `<any>` instead:
declare const VirtualScroller: ReactVirtualScroller<any>;

export default VirtualScroller;