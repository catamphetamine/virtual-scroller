import { default as VirtualScrollerCore, State, VirtualScrollerCommonOptions } from '../index.d.js';

// `as` property is now deprecated, so `WithAsProperty` type is a legacy one.
// Use `itemsContainerComponent` property instead.
import { WithAsProperty } from './as.d.js';

import * as React from 'react';

export { State, NoItemState } from '../index.d.js';

// If `<VirtualScroller/>` simply forwarded the `ref` to the `itemsContainerComponent`
// then the type of the `ref` would be this:
//
// export type VirtualScrollerRef<Component> = Ref<Component>
//
// But since `<VirtualScroller/>` exposes some instance methods through the `ref`,
// the type of the `ref` is:
//
export interface VirtualScrollerRefValue {
	// // Returns the items container `Element`.
	// getElement(): HTMLElement;
	//
	// Below is a more sophisticated variant of `getElement()` that returns exactly
	// the tag specified as the `ItemsContainerComponent`.
	// There seems to be no requirement for such "more sophisticated" type declaration.
	// Hence, it is commented out and a simpler type of just `HTMLElement` is used.
	//
	// getElement(): ItemsContainerComponent extends keyof React.JSX.IntrinsicElements
	// 	? (
	// 		React.JSX.IntrinsicElements[ItemsContainerComponent] extends React.DetailedHTMLProps<React.AnchorHTMLAttributes<infer T>, T>
	// 			? T
	// 			: HTMLElement
	// 	) : HTMLElement;

	// Forces a re-calculation and re-render of the list.
	updateLayout(): void;
}

// // This is a type of a `ref` that will be passed to a given `Component`.
// type ComponentRef<Component extends React.ElementType> = React.ComponentPropsWithRef<Component>['ref']

// These props are shared between `useVirtualScroller()` hook and `<VirtualScroller/>` component.
interface PropsBase<
	// `Item` is the type of an element of the `items` array.
	Item,

	// `ItemComponentState` is the type of an item component state.
	// Example: `interface ItemComponentState { expanded?: boolean }`.
	//
	// In most cases, a developer won't even have to bother about item component state
	// because `ItemComponent` won't have any state.
	// In such cases, type `unknown` is used as a "dummy" placeholder
	// just so that TypeScript doesn't complain about this "generic" being unspecified.
	//
	ItemComponentState = unknown
> extends VirtualScrollerCommonOptions<Item, ItemComponentState> {
	items: Item[];
	initialState?: State<Item, ItemComponentState>;
	preserveScrollPositionOnPrependItems?: boolean;
	readyToStart?: boolean;
	tbody?: boolean;
	getScrollableContainer?(): HTMLElement;
}

// These are `<VirtualScroller/>` props except the deprecated `as` property.
// When `as` property is removed in some future, `PropsWithoutAs` could be renamed to just `export Props`.
interface PropsWithoutAs<
	// `Item` is the type of an element of the `items` array.
	Item,

	// `ItemComponent` is a React component that renders an `item` element.
	ItemComponent extends React.ElementType,

	// `ItemComponentState` is the type of an item component state.
	// Example: `interface ItemComponentState { expanded?: boolean }`.
	//
	// In most cases, a developer won't even have to bother about item component state
	// because `ItemComponent` won't have any state.
	// In such cases, type `unknown` is used as a "dummy" placeholder
	// just so that TypeScript doesn't complain about this "generic" being unspecified.
	//
	ItemComponentState = unknown,

	// `ItemsContainerComponent` is a React component that renders an element
	// that will be used as a container for all item elements.
	//
	// The default value of `"div"` is legacy behavior.
	// New applications should always specify `itemsContainerComponent` property value.
	//
	ItemsContainerComponent extends React.ElementType = 'div'
> extends PropsBase<Item, ItemComponentState> {
	ref?: React.Ref<VirtualScrollerRefValue>;
	// If `ref` was just "forwarded" to the `ItemsContainerComponent`, its type would have been this:
	// ref: ComponentRef<ItemsContainerComponent>;
	itemComponent: ItemComponent;
	itemComponentProps?: Partial<
		Omit<
			React.ComponentPropsWithoutRef<ItemComponent>,
			keyof VirtualScrollerItemComponentProps<Item, ItemComponentState>
		>
	>;
	// `itemsContainerComponent` property is optional just to avoid legacy compatibility issues.
	// Any new application should explicitly specify it and consider it required.
	itemsContainerComponent?: ItemsContainerComponent;
	itemsContainerComponentProps?: Partial<
		React.ComponentPropsWithoutRef<ItemsContainerComponent>
	>;
	itemsContainerRef?: React.ComponentPropsWithRef<ItemsContainerComponent>['ref'];
}

// These are `<VirtualScroller/>` props including the deprecated `as` property.
// When `as` property is removed in some future, `PropsWithoutAs` will simply replace this type.
export type Props<
	// `Item` is the type of an element of the `items` array.
	Item,

	// `ItemComponent` is a React component that renders an `item` element.
	ItemComponent extends React.ElementType,

	// `ItemComponentState` is the type of an item component state.
	// Example: `interface ItemComponentState { expanded?: boolean }`.
	//
	// In most cases, a developer won't even have to bother about item component state
	// because `ItemComponent` won't have any state.
	// In such cases, type `unknown` is used as a "dummy" placeholder
	// just so that TypeScript doesn't complain about this "generic" being unspecified.
	//
	ItemComponentState = unknown,

	// `ItemsContainerComponent` is a React component that renders an element
	// that will be used as a container for all item elements.
	//
	// The default value of `"div"` is legacy behavior.
	// New applications should always specify `itemsContainerComponent` property value.
	//
	ItemsContainerComponent extends React.ElementType = 'div',

	// `as` property is deprecated; use `itemsContainerComponent` property instead.
	// In some future, `AsComponent` "generic" will be removed from here
	// and it won't be considered a "breaking change" because it doesn't affect the javascript code.
	AsComponent extends React.ElementType = 'div'
> = WithAsProperty<
	AsComponent,
	PropsWithoutAs<
		Item,
		ItemComponent,
		ItemComponentState,
		ItemsContainerComponent
	>
>

declare function VirtualScroller<
	// `Item` is the type of an element of the `items` array.
	Item,

	// `ItemComponent` is a React component that renders an `item` element.
	ItemComponent extends React.ElementType,

	// `ItemComponentState` is the type of an item component state.
	// Example: `interface ItemComponentState { expanded?: boolean }`.
	//
	// In most cases, a developer won't even have to bother about item component state
	// because `ItemComponent` won't have any state.
	// In such cases, type `unknown` is used as a "dummy" placeholder
	// just so that TypeScript doesn't complain about this "generic" being unspecified.
	//
	ItemComponentState = unknown,

	// `ItemsContainerComponent` is a React component that renders an element
	// that will be used as a container for all item elements.
	//
	// The default value of `"div"` is legacy behavior.
	// New applications should always specify `itemsContainerComponent` property value.
	//
	ItemsContainerComponent extends React.ElementType = 'div',

	// `as` property is deprecated, use `itemsContainerComponent` property instead.
	// In some future, `AsComponent` "generic" will be removed from here
	// and it won't be considered a "breaking change" because it doesn't affect the javascript code.
	AsComponent extends React.ElementType = 'div'
>(
	props: Props<
		Item,
		ItemComponent,
		ItemComponentState,
		ItemsContainerComponent,
		// `as` property is deprecated, use `itemsContainerComponent` property instead.
		// In some future, `AsComponent` "generic" will be removed from here
		// and it won't be considered a "breaking change" because it doesn't affect the javascript code.
		AsComponent
	>
): React.JSX.Element;

export default VirtualScroller;

export function useVirtualScroller<
	// `Item` is the type of an element of the `items` array.
	Item,

	// `ItemComponentState` is the type of an item component state.
	// Example: `interface ItemComponentState { expanded?: boolean }`.
	//
	// In most cases, a developer won't even have to bother about item component state
	// because `ItemComponent` won't have any state.
	// In such cases, type `unknown` is used as a "dummy" placeholder
	// just so that TypeScript doesn't complain about this "generic" being unspecified.
	//
	ItemComponentState = unknown
>(
	props: PropsBase<Item, ItemComponentState>
): UseVirtualScrollerResult<Item, ItemComponentState>;

interface UseVirtualScrollerResult<Item, ItemComponentState> {
	// Use this `state` instead of `virtualScroller.getState()`.
	state: State<Item, ItemComponentState>;
	style?: React.CSSProperties;
	className?: string;
	itemsContainerRef: React.Ref<HTMLElement>;
	virtualScroller: VirtualScrollerCore<HTMLElement, Item, ItemComponentState>;
}

// The props that're passed by `<VirtualScroller/>` to `ItemComponent`.
export interface VirtualScrollerItemComponentProps<Item, ItemComponentState> {
	item: Item;
	state?: ItemComponentState;
	setState: (newState: ItemComponentState) => void;
	onHeightDidChange: () => void;
}

// This properties are passed by `<VirtualScroller/>` to the `itemsContainerComponent`.
export interface VirtualScrollerItemsContainerComponentProps<
	ItemsContainerComponent extends React.ElementType
> {
	ref: React.ComponentPropsWithRef<ItemsContainerComponent>['ref'];
	className?: string;
	style?: React.CSSProperties;
}

// // Utility Type: Combines props with any additional props.
// //
// // The rationale for using it is that the standard `&` operator
// // doesn't work in "merge-and-replace" mode but rather in "merge-and-combine" mode.
// //
// // "When properties with the same name but different types are intersected,
// //  TypeScript tries to find a common type. If no common type exists,
// //  the resulting type for that property becomes `never`."
// //
// type CombineProps<
// 	BaseProps = {},
// 	AdditionalProps = {}
// > = Omit<BaseProps, keyof AdditionalProps> & AdditionalProps

// // `ItemComponentProps`.
// type ItemComponentProps<Item, ItemComponent extends React.ElementType, ItemComponentState> =
// 	CombineProps<
// 		React.ComponentPropsWithRef<ItemComponent>,
// 		VirtualScrollerItemComponentProps<Item, ItemComponentState>
// 	>

// // `ItemsContainerComponentProps`.
// type ItemsContainerComponentProps<ItemsContainerComponent extends React.ElementType> =
// 	CombineProps<
// 		React.ComponentPropsWithRef<ItemsContainerComponent>,
// 		VirtualScrollerItemsContainerComponentProps
// 	>

// // Utility Type: Fits any object.
// interface AnyObject {
// 	[key: string]: any;
// }
