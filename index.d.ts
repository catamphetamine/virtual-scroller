export type ItemHeight = number | undefined;
export type ItemState = any | undefined;

export interface State<Item> {
	items: Item[];
	firstShownItemIndex: number;
	lastShownItemIndex: number;
	beforeItemsHeight: number;
	afterItemsHeight: number;
	itemStates: ItemState[];
	itemHeights: ItemHeight[];
	verticalSpacing?: number;
	columnsCount?: number;
}

export interface ItemsContainer<Element> {
	constructor(getElement: () => Element);
	getNthRenderedItemTopOffset(renderedElementIndex: number): number;
	getNthRenderedItemHeight(renderedElementIndex: number): number;
	getHeight(): number;
	clear(): void;
}

export interface ScrollableContainer<Element> {
	constructor(element: Element, getItemsContainerElement: () => Element);
	getWidth(): number;
	getHeight(): number;
	getItemsContainerTopOffset(): number;
	getScrollY(): number;
	scrollToY(scrollY: number): void;
	onScroll(onScroll: () => void): () => void;
	onResize(onResize: () => void): () => void;
}

export interface Engine<Element> {
	createItemsContainer(getItemsContainerElement: () => Element): ItemsContainer<Element>;
	createScrollableContainer(scrollableContainer: Element, getItemsContainerElement: () => Element): ScrollableContainer<Element>;
}

export interface VirtualScrollerCommonOptionsWithoutInitialState<Element, Item> {
	bypass?: boolean;
	onStateChange?(newState: State<Item>, prevState?: State<Item>);
	measureItemsBatchSize?: number;
	estimatedItemHeight?: number;
	initialScrollPosition?: number;
	onScrollPositionChange?(scrollY: number): void;
	onItemInitialRender?(item: Item): void;
	getItemId?(item: Item): any;
	getColumnsCount?(scrollableContainer: Element): number;
}

export interface VirtualScrollerCommonOptions<Element, Item> extends VirtualScrollerCommonOptionsWithoutInitialState<Element, Item> {
	state?: State<Item>;
	customState?: object;
}

interface Options<Element, Item> extends VirtualScrollerCommonOptions<Element, Item> {
	getState?(): State<Item>;
	setState?(stateUpdate: Partial<State<Item>>): void;
	engine?: Engine<Element>;
	tbody?: boolean;
}

export interface VirtualScrollerSetItemsOptions {
	preserveScrollPositionOnPrependItems?: boolean;
}

export default class VirtualScroller<Element, Item> {
	constructor(
		getItemsContainerElement: () => Element,
		items: Item[],
		options?: Options<Element, Item>
	);

	listen(): void;
	stop(): void;
	willUpdateState(newState: State<Item>, prevState: State<Item>): void;
	didUpdateState(prevState: State<Item>): void;
	updateLayout(): void;
	setItems(newItems: Item[], options?: VirtualScrollerSetItemsOptions): void;
  onItemHeightChange(i: number): void;
  onItemStateChange(i: number, itemState?: object): void;
  getItemScrollPosition(i: number): number | undefined;
}