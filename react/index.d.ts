import { State, NoItemState, VirtualScrollerCommonOptions } from '../index.d.ts';

export { State } from '../index.d.ts';

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

interface ItemComponentPassedProps<Item, ItemState> {
	item: Item;
	state: ItemState;
	setState: (newState: ItemState) => void;
	onHeightChange: () => void;
}

interface Props<ItemComponentProps extends object, Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	items: Item[];
	itemComponent: React.ElementType<ItemComponentProps & ItemComponentPassedProps<Item, ItemState>>;
	itemComponentProps?: ItemComponentProps;
	initialState?: State<Item, ItemState>;
	preserveScrollPositionOnPrependItems?: boolean;

	getScrollableContainer?(): HTMLElement;
}

declare function VirtualScroller<ItemComponentProps extends object = {}, Item = any, ItemState = NoItemState, AsElement extends React.ElementType = 'div'>(
	props: PolymorphicComponentProps<AsElement, Props<ItemComponentProps, Item, ItemState>>
): JSX.Element;

export default VirtualScroller;
