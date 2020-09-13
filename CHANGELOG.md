<!-- `virtual-scroller`: in `.updateItems()` handle a case when `items.length` is the same, in which case find different items and if those items are rendered then maybe update them on screen and update their height, if the items are past rendered then maybe just discard all item heights past rendered, if the items are before rendered then maybe ignore and it will jump on scroll up which is kinda acceptable. -->

1.5.1 / 13.09.2020
==================

* Renamed `.onMount()`/`.render()` instance method to `.listen()`. The older method name still works.

* Renamed `.onUnmount()`/`.destroy()` instance method to `.stop()`. The older method name still works.

1.5.0 / 12.09.2020
==================

* (unlikely breaking change) If custom `setState` is defined, then it must call two `VirtualScroller`'s instance methods: `.willUpdateState(newState, prevState)` and `.didUpdateState(prevState)`. This is unlikely to break anyone's code because it's unlikely that someone implemented their own `VirtualScroller` rather than using the provided `/dom` or `/react` ones.

* (unlikely breaking change) Removed `.onUpdate(prevState)` instance method of `VirtualScroller`: it has been superceded by `.didUpdateState(prevState)`. This is unlikely to break anyone's code because it's unlikely that someone implemented their own `VirtualScroller` rather than using the provided `/dom` or `/react` ones.

* (unlikely breaking change) `setState(newState)` option function no longer receives the second `callback` argument (instead, the argument is an object now). This is unlikely to break anyone's code because it's unlikely that someone implemented their own `VirtualScroller` rather than using the provided `/dom` or `/react` ones.

* Fixed "window is not defined" error on server side.

* Renamed `.onMount()` instance method to `.render()`. The older method name still works.

* Renamed `.onUnmount()` instance method to `.destroy()`. The older method name still works.

* Renamed `preserveScrollPositionAtBottomOnMount` option/property to `preserveScrollPositionOfTheBottomOfTheListOnMount`.

* Deprecated `onItemFirstRender(i)`. Added `onItemInitialRender(item)` as a replacement. The reason is that `item` is more consistent than `i` which can be non-consistent with the `items` passed to `<VirtualScroller/>` in React due to `setState()` not being instanteneous: when new `items` are passed to `<VirtualScroller/>`, `VirtualScroller.setState({ items })` is called, and if `onItemFirstRender(i)` is called after the aforementioned `setState()` is called but before it finishes, `i` would point to an index in "previous" `items` while the application would assume that `i` points to an index in the "new" `items`, resulting in an incorrect item being assumed by the application or even in an "array index out of bounds" error.

1.4.1 / 10.09.2020
==================

* Fixed Chrome's `setTimeout()` delay lag [bug](https://github.com/bvaughn/react-virtualized/issues/722) by using `requestAnimationFrame()`.

1.4.0 / 10.09.2020
==================

* An *experimental* `getScrollableContainer()` option has been changed to just `scrollableContainer`.

1.3.0 / 19.04.2020
==================

* Added an *experimental* `getScrollableContainer()` option that supports rendering `VirtualScroller` somewhere in a scrollable ancestor.

1.2.1 / 18.04.2020
===================

* Fixed an [infinite initial render loop](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) in `DOMVirtualScroller`.

* It [turned out](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) that rendering items as `<tr/>`s inside a `<tbody/>` didn't work because a `<tbody/>` [can't have](https://stackoverflow.com/questions/294885/how-to-put-spacing-between-tbody-elements/294925) `padding`. A workaround has been added that involves CSS variables which aren't supported in Internet Explorer: in such case, `VirtualScroller` renders in "bypass" mode (render all items).

1.2.0 / 27.02.2020
===================

* Added `onItemUnmount` option on DOM `VirtualScroller`: it's called when a `VirtualScroller` item DOM `Element` is unmounted. Can be used to add DOM `Element` ["pooling"](https://github.com/ChrisAntaki/dom-pool#what-performance-gains-can-i-expect).

* Deprecated `onMount` option.

1.1.0 / 23.02.2020
===================

* `state.scrollY` is now applied on mount: if initial `state` is passed, then the page will be scrolled to `state.scrollY` on `VirtualScroller` mount.

* Documented `bypass: boolean` property/option. Can be used on server side to render the full list of items (for example, search engine indexing).

1.0.26 / 19.01.2020
===================

* Added `scrollY` in `VirtualScroller` state.

1.0.22 / 27.12.2019
===================

* Added `<VirtualScroller/>` `as` property.

1.0.20 / 24.12.2019
===================

* Fixed `VirtualScroller` not rendering more than `measureItemsBatchSize` items.

* Fixed `VirtualScroller` performing a re-layout on enter/exit fullscreen.

* Added `shouldUpdateLayoutOnWindowResize(event)` option / property to prevent re-layout on some window `resize` events. The `resize` event is not only triggered when a user resizes the window itself: it's also [triggered](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes) when the user switches into (and out of) fullscreen mode. By default, `VirtualScroller` performs a re-layout on all window `resize` events, except for ones that don't result in actual window width or height change, and except for cases when, for example, a video somewhere in a list is maximized into fullscreen. There still can be other "custom" cases: for example, when an application uses a custom "slideshow" component (rendered outside of the list DOM element) that goes into fullscreen when a user clicks a picture or a video in the list. For such "custom" cases `shouldUpdateLayoutOnWindowResize(event)` option / property can be specified.

* Renamed `VirtualScroller.layout()` to `VirtualScroller.updateLayout()`. The old method name still works but is considered deprecated.

* Replaced `throttle` with `debounce` on window `resize`.

1.0.13 / 08.12.2019
===================

* Renamed `VirtualScroller.updateItems()` to `VirtualScroller.setItems()`. The old method name still works but is considered deprecated.

* Renamed `ReactVirtualScroller.updateItem(i)` to `ReactVirtualScroller.renderItem(i)`. The old method name still works but is considered deprecated.

* Renamed `preserveScrollPosition` option/property to `preserveScrollPositionOnPrependItems`. The old option/property name still works but is considered deprecated.

* Added `preserveScrollPositionAtBottomOnMount: boolean` option/property.

<!-- * Added preserving scroll position on showing an item when its height has changed (for some reason) while it was hidden. This feature is only active when the item's new bottom border is above the center of the screen. -->

* Added `.getItemCoordinates(i)` instance method.

* Fixed `preserveScrollPosition` (previously it could measure the change in document height incorrectly).

* Fixed re-layout on window resize.

1.0.12 / 21.09.2019
===================

* Added `preserveScrollPosition: boolean` option to `VirtualScroller.updateItems(newItems, [options])` and the corresponding `preserveScrollPosition: boolean` property to `<ReactVirtualScroller/>`. Previously, when prepending items it would automatically preserve scroll position. Turned out that it might not always be the desired behavior. For example, when displaying live search results via `<VirtualScroller/>` as the user types the search query: in such cases erasing a character at the end of the search query could result in "prepending" an item to the search results that would in turn result in scroll position changing due to being "auto-preserved" which is not what a user would expect. Now the "preserve scroll position on prepending items" feature is only active when explicitly enabled via the `preserveScrollPosition: boolean` option/property.

1.0.8 / 10.08.2019
==================

* Removed `onLastSeenItemIndexChange(newIndex, prevIndex)` option, use `onItemFirstRender(i)` option instead.