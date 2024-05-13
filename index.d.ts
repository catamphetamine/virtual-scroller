export type ItemHeight = number | undefined;
export type NoItemState = undefined;

interface BeforeResizeState {
	itemHeights: number[];
	columnsCount: number;
	verticalSpacing: number;
}

export interface State<Item, ItemState> {
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

export class ItemsContainer<Element> {
	constructor(getElement: () => Element);
	getNthRenderedItemTopOffset(renderedElementIndex: number): number;
	getNthRenderedItemHeight(renderedElementIndex: number): number;
	getHeight(): number;
	clear(): void;
}

export class ScrollableContainer<Element> {
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

export interface VirtualScrollerCommonOptions<Item, ItemState> {
	bypass?: boolean;
	onStateChange?(newState: State<Item, ItemState>): void;
	getInitialItemState?: (item: Item) => ItemState;
	measureItemsBatchSize?: number;
	getEstimatedItemHeight?: () => number;
	getEstimatedVisibleItemRowsCount?: () => number;
	initialScrollPosition?: number;
	onScrollPositionChange?(scrollY: number): void;
	onItemInitialRender?(item: Item): void;
	getItemId?(item: Item): any;
	getColumnsCount?(scrollableContainer: ScrollableContainerArgument): number;
}

interface Options<Element, Item, ItemState> extends VirtualScrollerCommonOptions<Item, ItemState> {
	state?: State<Item, ItemState>;
	render?(state: State<Item, ItemState>, previousState?: State<Item, ItemState>): void;
	engine?: Engine<Element>;
	tbody?: boolean;
	scrollableContainer?: Element;
	getScrollableContainer?(): Element;
}

interface UseStateOptions<Item, ItemState> {
	getState?(): State<Item, ItemState>;
	updateState?(stateUpdate: Partial<State<Item, ItemState>>): void;
}

export interface SetItemsOptions {
	preserveScrollPositionOnPrependItems?: boolean;
}

export default class VirtualScroller<Element, Item, ItemState = NoItemState> {
	constructor(
		getItemsContainerElement: () => Element,
		items: Item[],
		options?: Options<Element, Item, ItemState>
	);

	start(): void;
	stop(): void;
	updateLayout(): void;
	onRender(): void;
	setItems(newItems: Item[], options?: SetItemsOptions): void;
  onItemHeightDidChange(i: number): void;
  setItemState(i: number, itemState?: object): void;
  getItemScrollPosition(i: number): number | undefined;
  getInitialState(): State<Item, ItemState>;
  useState(options: UseStateOptions<Item, ItemState>): void;
}

export class ItemNotRenderedError {
	constructor(
		message: string
	);
}