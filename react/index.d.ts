import { State, NoItemState, VirtualScrollerCommonOptions } from '../index.d.js';

export { State } from '../index.d.js';

import * as React from 'react';

// Taken from https://www.benmvp.com/blog/polymorphic-react-components-typescript/

// A more precise version of just React.ComponentPropsWithoutRef on its own
export type PropsOf<
	C extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>
	> = JSX.LibraryManagedAttributes<C, React.ComponentPropsWithoutRef<C>>

type AsProp<C extends React.ElementType> = {
	/**
	 * An override of the default HTML tag.
	 * Can also be another React component.
	 */
	as?: C
}

/**
 * Allows for extending a set of props (`ExtendedProps`) by an overriding set of props
 * (`OverrideProps`), ensuring that any duplicates are overridden by the overriding
 * set of props.
 */
export type ExtendableProps<
	ExtendedProps = {},
	OverrideProps = {}
	> = OverrideProps & Omit<ExtendedProps, keyof OverrideProps>

/**
 * Allows for inheriting the props from the specified element type so that
 * props like children, className & style work, as well as element-specific
 * attributes like aria roles. The component (`C`) must be passed in.
 */
export type InheritableElementProps<
	C extends React.ElementType,
	Props = {}
	> = ExtendableProps<PropsOf<C>, Props>

/**
 * A more sophisticated version of `InheritableElementProps` where
 * the passed in `as` prop will determine which props can be included
 */
export type PolymorphicComponentProps<
	C extends React.ElementType,
	Props = {}
	> = InheritableElementProps<C, Props & AsProp<C>>

export interface ItemComponentVirtualScrollerProps<Item, ItemState> {
	item: Item;
	state: ItemState;
	setState: (newState: ItemState) => void;
	onHeightDidChange: () => void;
}

interface PropsBase<ItemComponentProps extends object, Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	items: Item[];
	itemComponent: React.ElementType<ItemComponentProps & ItemComponentVirtualScrollerProps<Item, ItemState>>;
	itemComponentProps?: ItemComponentProps;
	initialState?: State<Item, ItemState>;
	preserveScrollPositionOnPrependItems?: boolean;
	readyToStart?: boolean;

	getScrollableContainer?(): HTMLElement;
}

export type Props<
	ItemComponentProps extends object = {},
	Item = any,
	ItemState = NoItemState,
	AsElement extends React.ElementType = 'div'
> = PolymorphicComponentProps<AsElement, PropsBase<ItemComponentProps, Item, ItemState>>

declare function VirtualScroller<
	ItemComponentProps extends object = {},
	Item = any,
	ItemState = NoItemState,
	AsElement extends React.ElementType = 'div'
>(
	props: Props<ItemComponentProps, Item, ItemState, AsElement>
): JSX.Element;

export default VirtualScroller;
