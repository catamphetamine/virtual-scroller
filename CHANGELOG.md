<!-- `virtual-scroller`: in `.updateItems()` handle a case when `items.length` is the same, in which case find different items and if those items are rendered then maybe update them on screen and update their height, if the items are past rendered then maybe just discard all item heights past rendered, if the items are before rendered then maybe ignore and it will jump on scroll up which is kinda acceptable. -->

1.12.3 / 23.03.2023
==================

* [Fixed](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/33) React `18.2.0` [bug](https://github.com/facebook/react/issues/26320) in ["strict" mode](https://hu.reactjs.org/docs/strict-mode.html) when `useInsertionEffect()` doesn't run twice on mount unlike `useEffect()` or `useLayoutEffect()`.

* Fixed React `18.2.0` [bug](https://github.com/facebook/react/issues/25023#issuecomment-1480463544) when out-of-sync (stale) state values are being rendered.

* `VirtualScroller` no longer restores the Y scroll position on mount: it was found out that this feature conflicted with the same feature of application "router" libraries.

1.11.3 / 05.02.2023
==================

* Renamed `onItemHeightChange()` to `onItemHeightDidChange()`.

1.11.0 / 19.01.2023
==================

* Added a new property on `<VirtualScroller/>` — `getInitialItemState(item)`. The same option was added in `VirtualScroller` constructor parameters.

* Deprecated `itemIndex` property of `itemComponent`. The rationale is that setting new `items` on a React component is an asynchronous operation, so when a user obtains `itemIndex`, they don't know which `items` list does that index correspond to, therefore making it useless, or even buggy if used incorreclty.

* (React) Renamed `itemComponent`'s `onStateChange()` property to `setState()`. The older property name still works but is considered deprecated.

* Renamed `VirtualScroller`'s `onItemStateChange()` instance method to `setItemState()`. The older instance method name still works but is considered deprecated.

* (TypeScript) Added a new (second or third) "generic" parameter (interface) called `ItemState` which is `undefined` by default. Removed the previously exported type called `ItemState` which was defined as `any | undefined`.
  * (React) The addition of the new "generic" parameter has changed the order of generic parameters in the `<VirtualScroller/>` React component from `<Item, ItemComponentProps, AsElement>` to `<ItemComponentProps, Item, ItemState, AsElement>`.

* (miscellaneous) In README, when describing `VirtualScroller` state, `itemStates` and `itemHeights` properties were previously marked as "optional" for some unknown reason. They've been properly marked as "required" now.

1.10.1 / 07.01.2023
==================

* Add a fix for calculating the initial state when using `getScrollableContainer` on the React component of `<VirtualScroller/>`. Previously, it threw an error when it found that the scrollable container element hasn't been mounted by the time `<VirtualScroller/>` element started being rendered (just rendered, not mounted yet). Now it falls back to some sensible default values for the size of the scrollable container until the `<VirtualScroller/>` element has been mounted on a page.

* Renamed `estimatedItemHeight` parameter to `getEstimatedItemHeight()`. The older parameter name still works but is deprecated.

* Added `getEstimatedVisibleItemRowsCount()` parameter. It can be used instead of `getEstimatedItemHeight()`.

1.10.0 / 22.11.2022
==================

* [React] Applied TypeScript [props fixes](https://gitlab.com/catamphetamine/virtual-scroller/-/merge_requests/1).

* [React] Added two new properties: `item` and [`itemIndex`](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/26). The legacy `children` property is still passed but is considered deprecated.

1.9.0 / 18.05.2022
==================

General changes:

* Refactored the code.

* Moved to "ES Modules" exports (`type: "module"`). It's supposed to be a non-breaking change.

Changes to the React component:

* Rewrote React `<VirtualScroller/>` component as a function instead of a `Component` class.

* Supposedly [fixed](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/21) re-mounting of the React component in accordance with React's recent [change](https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-strict-mode) when they demand a component be mountable and unmountable several times during its lifetime.

* Un-deprecated `getScrollableContainer()` option. It can be used instead of `scrollableContainer` option. The reason is React's recent [change](https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-strict-mode) when they demand a component be mountable and unmountable several times during its lifetime: in that case, if components get mounted and unmounted several times, the `scrollableContainer` DOM Element reference does change between those re-mounts, so simply passing a `scrollableContainer` option would end up pointing to a non-existent DOM element on re-mount because the "core" (low-level) `VirtualScroller` class doesn't get re-created on re-mount.

* (advanced) (breaking change) Removed the `initialCustomState` property due to not being used.

* (advanced) (breaking change) Removed `.renderItem(i)` instance method from React `<VirtualScroller/>` component.

(advanced) Changes to the "core" (low-level) `VirtualScroller` class:

* Renamed `.listen()` instance method of `VirtualScroller` to `.start()`.

* (breaking change) Removed long-deprecated instance methods:

  * `.layout()` — use `.updateLayout()` instead.
  * `.onMount()` — use `.start()` instead.
  * `.render()` — use `.start()` instead.
  * `.listen()` — use `.start()` instead.
  * `.onUnmount()` — use `.stop()` instead.
  * `.onUnmount()` — use `.destroy()` instead.
  * `.updateItems()` — use `.setItems()` instead.

* (breaking change) Removed the `customState` option due to not being used.

* (breaking change) `onStateChange()` function used to receive two parameters: `newState` and `previousState`. Now it only receives one parameter: `newState`. Also, previously the readme adviced to perform a re-rendering of the list in `onStateChange()`. That's no longer true and `onStateChange()` should only be used for keeping track of the `VirtualScroller` state. For rendering there's a new parameter function called `render()`.

* (breaking change) When not using custom (external) state management, passing a `render()` function as an option is required now. The `render()` function should (re)render the list.

(advanced) Changes to the "core" (low-level) `VirtualScroller` class when using custom (external) state management:

* (advanced) (breaking change) Removed `getState` / `setState` options of the `VirtualScroller` class. Instead, there's a new instance method called `.useState()` that should be called with `getState` and `updateState` parameters for enabling custom (external) state management. See the readme for more details.

* (breaking change) A custom `setState()` state updater function of `VirtualScroller` used to receive a `willUpdateState()` parameter. That parameter has been removed now due to no longer being used.

* (breaking change) A custom `setState()` state updater function of `VirtualScroller` previously received a `didUpdateState(prevState)` parameter function that should have been called on every state update. That parameter function has been removed. Instead, call a new instance method of `VirtualScroller`: `virtualScroller.onRender()` (without any arguments).

* (breaking change) Renamed the custom `setState()` state updater function to `updateState()`.

* (breaking change) The old `setState()` state updater function was called also when setting the initial state. The new `updateState()` state updater function doesn't get called to set the initial state. Instead, a `VirtualScroller` instance provides a `.getInitialState()` method, and developers are supposed to set the initial external state value themselves.

(advanced) Changes to custom rendering `Engine`s:

* (breaking change) Changed `Engine` interface: `createScrollableContainer()` function now receives `getScrollableContainer()` as its first argument instead of `scrollableContainer`. The reason is React's recent [change](https://reactjs.org/blog/2022/03/08/react-18-upgrade-guide.html#updates-to-strict-mode) when they demand a component be mountable and unmountable several times throughout its lifetime: in that case, if components get mounted and unmounted several times, the `scrollableContainer` DOM Element reference does change between those re-mounts, so simply passing a `scrollableContainer` option would end up pointing to a non-existent DOM element on re-mount because the "core" (low-level) `VirtualScroller` class doesn't get re-created on re-mount.re-mounts.

1.8.0 / 26.11.2021
==================

* Refactored the code. Some parts got rewritten.

* Added tests.

* Added TypeScript "typings" (didn't check).

* Fixed the list [being reset](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/15) on resize.

* Removed `preserveScrollPositionOfTheBottomOfTheListOnMount` option because it's not used.

1.7.9 / 30.04.2021
==================

* Fixed the [fix](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/10) of `.scrollTo()` in IE 11.

1.7.8 / 29.04.2021
==================

* Fixed `.scrollTo()` in IE 11. The fix was [suggested](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/10) by Patrik Prevužňák.

1.7.7 / 13.04.2021
==================

* Fixed [`ReferenceError: firstShownItemIndex is not defined`](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/9) in cases when `items` list has changed and the prepended items count is not a multiple of the columns count.

1.7.4 / 31.12.2020
==================

* Removed `scrollY` from `VirtualScroller`'s `state`: instead, pass `initialScrollPosition` and `onScrollPositionChange()` options to `VirtualScroller` constructor (or the same properties to the React component).

* Removed `getItemCoordinates(i)` function.

* Added `engine` option.

* Refactored.

1.7.3 / 30.12.2020
==================

* Removed `shouldUpdateLayoutOnWindowResize` function.

* Refactored DOM stuff into `ScrollableContainer.js` and `Screen.js`.

1.7.1 / 27.12.2020
==================

* React `<VirtualScroller/>` `.renderItem(i)` now supports passing item object itself as an argument.

1.7.0 / 25.12.2020
==================

* Refactored code a bit, wrote some comments.

* Fixed a small layout calculation bug when there're several `onItemHeightChange(i)` calls made at the same time.

1.6.6 / 18.12.2020
==================

* Removed `getItemKey(item)` property of React `<VirtualScroller/>`. Use `getItemId(item)` option of `VirtualScroller` instead.

* Added `getItemId(item)` option of `VirtualScroller`.

1.6.5 / 17.12.2020
==================

* Added `getItemKey(item)` property of React `<VirtualScroller/>`: that fixes forced re-rendering of all visible items whenever `items` property changes.

1.6.4 / 12.12.2020
==================

* [Fixed](https://gitlab.com/catamphetamine/read-excel-file/-/issues/10) measuring item vertical spacing.

1.6.1 / 07.12.2020
==================

* Fixed `VirtualScroller` re-rendering itself from scratch when calling `.setItems()` with no new items.

1.6.0 / 05.12.2020
==================

* Added support for [multiple columns](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/6).

* Fixed `shouldUpdateLayoutOnWindowResize()` bug when the `VirtualScroller` didn't rerender on window resize.

* Fixed `preserveScrollPositionOfTheBottomOfTheListOnMount` bug when it incorrectly calculated the new scroll position.

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