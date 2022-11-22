export type ItemHeight = number | undefined;
export type ItemState = any | undefined;

interface BeforeResizeState {
	itemHeights: number[];
	columnsCount: number;
	verticalSpacing: number;
}

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
	scrollableContainerWidth?: number;
	beforeResize?: BeforeResizeState;
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
	createScrollableContainer(getScrollableContainer: () => Element, getItemsContainerElement: () => Element): ScrollableContainer<Element>;
}

interface ScrollableContainerArgument {
	getWidth(): number;
}

export interface VirtualScrollerCommonOptions<Item> {
	bypass?: boolean;
	onStateChange?(newState: State<Item>);
	measureItemsBatchSize?: number;
	estimatedItemHeight?: number;
	initialScrollPosition?: number;
	onScrollPositionChange?(scrollY: number): void;
	onItemInitialRender?(item: Item): void;
	getItemId?(item: Item): any;
	getColumnsCount?(scrollableContainer: ScrollableContainerArgument): number;
}

interface Options<Element, Item> extends VirtualScrollerCommonOptions<Item> {
	state?: State<Item>;
	render?(state: State<Item>, previousState?: State<Item>): void;
	engine?: Engine<Element>;
	tbody?: boolean;
	scrollableContainer?: Element;
	getScrollableContainer?(): Element;
}

interface UseStateOptions<Item> {
	getState?(): State<Item>;
	updateState?(stateUpdate: Partial<State<Item>>): void;
}

export interface SetItemsOptions {
	preserveScrollPositionOnPrependItems?: boolean;
}

export default class VirtualScroller<Element, Item> {
	constructor(
		getItemsContainerElement: () => Element,
		items: Item[],
		options?: Options<Element, Item>
	);

	start(): void;
	stop(): void;
	updateLayout(): void;
	onRender(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightChange(i: number): void;
  onItemStateChange(i: number, itemState?: object): void;
  getItemScrollPosition(i: number): number | undefined;
  getInitialState(): State<Item>;
  useState(options: UseStateOptions<Item>): void;
}
