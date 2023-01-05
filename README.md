# VirtualScroller

A universal open-source implementation of Twitter's [`VirtualScroller`](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) component: a component for efficiently rendering large lists of *variable height* items. Supports grid layout.

<!-- Automatically measures items as they're rendered and supports items of variable/dynamic height. -->

* For React users, includes a [React](#react) component.
* For those who prefer "vanilla" DOM, there's a [DOM](#dom) component.
* For everyone else, there's a low-level [core](#core) component that supports any type of [rendering engine](#rendering-engine), not just DOM. Use it to create your own implementation for any framework or environment.

## Demo

[DOM](#dom) (no frameworks):

* [Basic](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html)
* [Dynamically loaded](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html?dynamic=✓)

[React](#react):

* [Basic](https://catamphetamine.gitlab.io/virtual-scroller/)
* [Dynamically loaded](https://catamphetamine.gitlab.io/virtual-scroller/?dynamic=✓)

[Grid Layout](#grid-layout):

* [Basic](https://catamphetamine.gitlab.io/virtual-scroller/index-grid.html)
* [Dynamically loaded](https://catamphetamine.gitlab.io/virtual-scroller/index-grid.html?dynamic=✓)

## Rationale

Rendering really long lists in HTML can be performance intensive which sometimes leads to slow page load times and wasting mobile users' battery. For example, consider a chat app rendering a list of a thousand of the most recent messages: when using React the full render cycle can take up to 100 milliseconds or more on a modern PC. If the chat message component is complex enough (rich text formatting, pictures, videos, attachments, buttons) then it could take up to a second or more (on a modern PC). Now imagine users viewing the website on their aged low-tier smartphones and it quickly results in annoying user experience resulting in them closing the website and the website losing its user base.

In 2017 Twitter completely redesigned their website with responsiveness and performance in mind using the latest performance-boosting techniques available at that time. They wrote an [article](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) about it where they briefly mentioned this:

![Twitter website responsiveness before using the VirtualScroller technique](https://cdn-images-1.medium.com/max/2600/1*mDPjaeBNhCAbEcbKV-IX3Q.gif)

> On slower devices, we noticed that it could take a long time for our main navigation bar to appear to respond to taps, often leading us to tap multiple times, thinking that perhaps the first tap didn’t register.
It turns out that mounting and unmounting large trees of components (like timelines of Tweets) is very expensive in React.
Over time, we developed a new infinite scrolling component called VirtualScroller. With this new component, we know exactly what slice of Tweets are being rendered into a timeline at any given time, avoiding the need to make expensive calculations as to where we are visually.

However, Twitter didn't share the code for their `VirtualScroller` component (unlike Facebook, Twitter doesn't share much of their code). This library is an attempt to create an open-source implementation of such `VirtualScroller` component for anyone to use in their projects.

There's also an ["RFC"](https://github.com/WICG/virtual-scroller) for a native `VirtualScroller` component where they try to formulate what is a `VirtualScroller` component and how it should behave.

## How it works

`VirtualScroller` works by measuring each list item's height as it's being rendered, and then, as the user scrolls, it hides the items that are no longer visible, and shows the now-visible items as they're scrolled to. The hidden items at the top are compensated by setting `padding-top` on the list element, and the hidden items at the bottom are compensated by setting `padding-bottom` on the list element. The component listens to `scroll` / `resize` events and re-renders the currently visible items as the user scrolls (or if the browser window is resized).

To observe list item elements being dynamically mounted and unmounted, go to the [demo](https://catamphetamine.gitlab.io/virtual-scroller) page, open Developer Tools ("Elements" tab), find `<div id="root"/>` element, expand it, see `<div id="messages"/>` element, expand it and observe the changes to it while scrolling the page.

To add some inter-item spacing, one could use `margin-top` / `margin-bottom` or `border-top` / `border-bottom`: see the [Gotchas](#gotchas) section for more details on how to do that properly.

## Install

```
npm install virtual-scroller --save
```

If you're not using a bundler then use a [standalone version from a CDN](#cdn).

## Core

The default export is a low-level `VirtualScroller` class: it implements the core logic of a `VirtualScroller` component and can be used for building a `VirtualScroller` component for any UI framework or even any [rendering engine](#rendering-engine) other than DOM. This core class is not meant to be used in applications directly. Instead, prefer using one of the high-level components provided by this library: [`virtual-scroller/dom`](#dom) or [`virtual-scroller/react`](#react) packages. Or implement your own: see `source/test` folder for an example of using the core class to build an "imaginary" renderer implementation.

#### State

The core `VirtualScroller` component works by dynamically updating its `state` as the user scrolls the page. The `state` provides the calculations on which items should be rendered (and which should not be) depending on the current scroll position.

A higher-level wrapper around the core `VirtualScroller` component must manage the rendering of the items using the information from the `state`. At any given time, `state` should correspond exactly to what's rendered on the screen: whenever `state` gets updated, the corresponding changes should be immediately (without any "timeout" or "delay") rendered on the screen.

<details>
<summary><code>state</code> properties</summary>

#####

The main `state` properties are:

* `items: any[]` — The list of items (can be updated via [`.setItems()`](#dynamically-loaded-lists)).

* `firstShownItemIndex: number` — The index of the first item that should be rendered.

* `lastShownItemIndex: number` — The index of the last item that should be rendered.

* `beforeItemsHeight: number` — The `padding-top` which should be applied to the "container" element: it emulates all items before `firstShownItemIndex` as if they were rendered.

* `afterItemsHeight: number` — The `padding-bottom` which should be applied to the "container" element: it emulates all items after `lastShownItemIndex` as if they were rendered.

The following `state` properties are only used for saving and restoring `VirtualScroller` `state`, and normally shouldn't be accessed:

* `itemStates: object?[]` — The states of all items. Any change in an item's appearance while it's rendered must be reflected in changing that item's state by calling `.onItemStateChange(i, itemState)` instance method (described below): this way, the item's state is preserved when it's shown next time after being hidden due to going off screen. For example, if an item is a social media comment, and there's a "Show more"/"Show less" button that shows the full text of the comment, then it must call `.onItemStateChange(i, { showMore: true/false })` every time.

* `itemHeights: number?[]` — The measured heights of all items. If an item's height hasn't been measured yet then it's `undefined`. By default, items are only measured once: when they're initially rendered. If an item's height changes afterwards, then `.onItemHeightChange(i)` instance method must be called (described below), otherwise `VirtualScroller`'s calculations will be off. For example, if an item is a social media comment, and there's a "Show more"/"Show less" button that shows the full text of the comment, then it must call `.onItemHeightChange(i)` every time. And every change in an item's height must come as a result of changing some kind of state, be it the item's state in `VirtualScroller` via `.onItemStateChange()`, or some other state managed by the application.

* `verticalSpacing: number?` — Vertical item spacing. Is `undefined` until it has been measured. Is only measured once, when at least two rows of items have been rendered.

* `columnsCount: number?` — The count of items in a row. Is `undefined` if no `getColumnsCount()` parameter has been passed to `VirtualScroller`, or if the columns count is `1`.

* `scrollableContainerWidth: number?` — The width of the scrollable container. For DOM implementations, that's gonna be either the browser window width or some scrollable parent element width. Is `undefined` until it has been measured after the `VirtualScroller` has been `start()`-ed.
</details>

#### Example

A general idea of using the low-level <code>VirtualScroller</code> class:

#####

```js
import VirtualScroller from 'virtual-scroller'

const items = [
  { name: 'Apple' },
  { name: 'Banana' },
  ...
]

const getContainerElement = () => document.getElementById(...)

const virtualScroller = new VirtualScroller(getContainerElement, items, {
  render(state) {
    // Re-renders the list based on its `state`.
    const {
      items,
      firstShownItemIndex,
      lastShownItemIndex,
      beforeItemsHeight,
      afterItemsHeight
    } = state

    container.paddingTop = beforeItemsHeight
    container.paddingBottom = afterItemsHeight

    container.children = items
      .slice(firstShownItemIndex, lastShownItemIndex + 1)
      .map(createItemElement)
  }
})

// Start listening to scroll events.
virtualScroller.start()

// Stop listening to scroll events.
virtualScroller.stop()
```

* `getContainerElement()` — Returns the list "element" that is gonna contain all list item "elements".
* `items` — The list of items.
* `render(state, prevState)` — "Renders" the list.

#####

<details>
<summary>An example of implementing a high-level <code>virtual-scroller/dom</code> component on top of the low-level <code>VirtualScroller</code> class.
</summary>

#####

```js
import VirtualScroller from 'virtual-scroller'

const items = [
  { title: 'Apple' },
  { title: 'Banana' },
  { title: 'Cranberry' }
]

function renderItem(item) {
  const div = document.createElement('div')
  div.innerText = item.title
  return div
}

const container = document.getElementById('list')

function render(state, prevState) {
  const {
    items,
    beforeItemsHeight,
    afterItemsHeight,
    firstShownItemIndex,
    lastShownItemIndex
  } = state

  // Set `paddingTop` and `paddingBottom` on the container element:
  // it emulates the non-visible items as if they were rendered.
  container.style.paddingTop = Math.round(beforeItemsHeight) + 'px'
  container.style.paddingBottom = Math.round(afterItemsHeight) + 'px'

  // Perform an intelligent "diff" re-render as the user scrolls the page.
  // This also requires that the list of `items` hasn't been changed.
  // On initial render, `prevState` is `undefined`.
  if (prevState && items === prevState.items) {

    // Remove no longer visible items.
    let i = prevState.lastShownItemIndex
    while (i >= prevState.firstShownItemIndex) {
      if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
        // The item is still visible.
      } else {
        // The item is no longer visible. Remove it.
        container.removeChild(container.childNodes[i - prevState.firstShownItemIndex])
      }
      i--
    }

    // Add newly visible items.
    let prependBefore = container.firstChild
    let i = firstShownItemIndex
    while (i <= lastShownItemIndex) {
      if (i >= prevState.firstShownItemIndex && i <= prevState.lastShownItemIndex) {
        // The item is already being rendered.
        // Next items will be appended rather than prepended.
        prependBefore = undefined
      } else {
        if (prependBefore) {
          container.insertBefore(renderItem(items[i]), prependBefore)
        } else {
          container.appendChild(renderItem(items[i]))
        }
      }
      i++
    }
  }
  else {
    // Re-render the list from scratch.
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
    let i = firstShownItemIndex
    while (i <= lastShownItemIndex) {
      container.appendChild(renderItem(items[i]))
      i++
    }
  }
}

const virtualScroller = new VirtualScroller(() => element, items, { render })

// Start VirtualScroller listening for scroll events.
virtualScroller.start()

// Stop VirtualScroller listening for scroll events
// when the user navigates to another page:
// router.onPageUnload(virtualScroller.stop)
```
</details>

#### Options

<details>
<summary><code>VirtualScroller</code> <code>options</code></summary>

#####

* `state: object` — The initial state for `VirtualScroller`. Can be used, for example, to quicky restore the list when it's re-rendered on "Back" navigation.

* `render(state: object, previousState: object?)` — When a developer doesn't pass custom `getState()`/`updateState()` parameters (more on that later), `VirtualScroller` uses the default ones. The default `updateState()` function relies on a developer-supplied `render()` function that must "render" the current `state` of the `VirtualScroller` on the screen. See DOM `VirtualScroller` implementation for an example of such a `render()` function.

* `onStateChange(newState: object, previousState: object?)` — An "on change" listener for the `VirtualScroller` `state` that gets called whenever `state` gets updated, including when setting the initial `state`.

  * Is not called when individual item heights (including "before resize" ones) or individual item states are updated: instead, individual item heights or states are updated in-place, as `state.itemHeights[i] = newItemHeight` or `state.itemStates[i] = newItemState`. That's because those `state` properties are the ones that don’t affect the presentation, so there's no need to re-render the list when those properties do change — updates to those properties are just an effect of a re-render rather than a cause for a new re-render.

  * `onStateChange()` parameter could be used to keep a copy of `VirtualScroller` `state` so that it could be quickly restored in case the `VirtualScroller` component gets unmounted and then re-mounted back again — for example, when the user navigates away by clicking on a list item and then navigates "Back" to the list.

  * (advanced) If state updates are done "asynchronously" via a custom (external) `updateState()` function, then `onStateChange()` gets called after such state updates get "rendered" (after `virtualScroller.onRender()` gets called).

* `getScrollableContainer(): Element` — (advanced) If the list is being rendered in a "scrollable container" (for example, if one of the parent elements of the list is styled with `max-height` and `overflow: auto`), then passing the "scrollable container" DOM Element is required for correct operation. "Gotchas":

  * If `getColumnsCount()` parameter depends on the "scrollable container" argument for getting the available area width, then the "scrollable container" element must already exist when creating a `VirtualScroller` class instance, because the initial `state` is calculated at construction time.

  * When used with one of the DOM environment `VirtualScroller` implementations, the width and height of a "scrollable container" should only change when the browser window is resized, i.e. not manually via `scrollableContainerElement.width = 720`, because `VirtualScroller` only listens to browser window resize events, and any other changes in "scrollable container" width won't be detected.

* `getColumnsCount(container: ScrollableContainer): number` — (advanced) Provides support for ["grid"](#grid-layout) layout. Should return the columns count. The `container` argument provides a `.getWidth()` method for getting the available area width.

#### "Advanced" (rarely used) options

* `bypass: boolean` — Pass `true` to turn off `VirtualScroller` behavior and just render the full list of items.

* `initialScrollPosition: number` — If passed, the page will be scrolled to this `scrollY` position.

* `onScrollPositionChange(scrollY: number)` — Is called whenever a user scrolls the page.

<!-- * `customState: object` — (advanced) A developer might want to store some "custom" (additional) state along with the `VirtualScroller` state, for whatever reason. To do that, pass the initial value of such "custom" state as the `customState` option when creating a `VirtualScroller` instance.  -->

* `getItemId(item)` — (advanced) When `items` are dynamically updated via `.setItems()`, `VirtualScroller` detects an "incremental" update by comparing "new" and "old" item ["references"](https://codeburst.io/explaining-value-vs-reference-in-javascript-647a975e12a0): this way, `VirtualScroller` can understand that the "new" `items` are (mostly) the same as the "old" `items` when some items get prepended or appended to the list, in which case it doesn't re-render the whole list from scratch, but rather just renders the "new" items that got prepended or appended. Sometimes though, some of the "old" items might get updated: for example, if `items` is a list of comments, then some of those comments might get edited in-between the refreshes. In that case, the edited comment object reference should change in order to indicate that the comment's content has changed and that the comment should be re-rendered (at least that's how it has to be done in React world). At the same time, changing the edited comment object reference would break `VirtualScroller`'s "incremental" update detection, and it would re-render the whole list of comments from scratch, which is not what it should be doing in such cases. So, in cases like this, `VirtualScroller` should have some way to understand that the updated item, even if its object reference has changed, is still the same as the old one, so that it doesn't break "incremental" update detection. For that, `getItemId(item)` parameter could be passed, which `VirtualScroller` would use to compare "old" and "new" items (instead of the default "reference equality" check), and that would fix the "re-rendering the whole list from scratch" issue. It can also be used when `items` are fetched from an external API, in which case all item object references change on every such fetch.

* `onItemInitialRender(item)` — (advanced) Is called for each `item` when it's about to be rendered for the first time. Is guaranteed to be called at least once for each item rendered, though, in "asynchronous" rendering systems like React, it could be called multiple times for a given item, because "an item is calculated to be rendered" doesn't necessarily mean that the actual rendering will take place before a later calculation supercedes the former one. This function can be used to somehow "initialize" items before they're rendered for the first time. For example, consider a list of items that must be somehow "preprocessed" (parsed, enhanced, etc) before being rendered, and such "preprocessing" puts some load on the CPU (and therefore takes some time). In such case, instead of "preprocessing" the whole list of items up front, a developer could "preprocess" the items as they're being rendered, thereby eliminating any associated lag or freezing that would be inevitable have all the items been "preprocessed" up front. If a user only wants to see a few of the items, "preprocessing" all the items up front would simply be a waste.

<!-- * `shouldUpdateLayoutOnScreenResize(event: Event): boolean`  — By default, `VirtualScroller` always performs a re-layout on window `resize` event. The `resize` event is not only triggered when a user resizes the window itself: it's also [triggered](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes) when the user switches into (and out of) fullscreen mode. By default, `VirtualScroller` performs a re-layout on all window `resize` events, except for ones that don't result in actual window width or height change, and except for cases when, for example, a video somewhere in a list is maximized into fullscreen. There still can be other "custom" cases: for example, when an application uses a custom "slideshow" component (rendered outside of the list DOM element) that goes into fullscreen when a user clicks a picture or a video in the list. For such "custom" cases `shouldUpdateLayoutOnScreenResize(event)` option / property can be specified. -->

* `measureItemsBatchSize: number` — (advanced) (experimental) Imagine a situation when a user doesn't gradually scroll through a huge list but instead hits an End key to scroll right to the end of such huge list: this will result in the whole list rendering at once (because an item needs to know the height of all previous items in order to render at correct scroll position) which could be CPU-intensive in some cases (for example, when using React due to its slow performance when initially rendering components on a page). To prevent freezing the UI in the process, a `measureItemsBatchSize` could be configured, that would limit the maximum count of items that're being rendered in a single pass for measuring their height: if `measureItemsBatchSize` is configured, then such items will be rendered and measured in batches. By default it's set to `100`. This is an experimental feature and could be removed in future non-major versions of this library. For example, the future React 17 will come with [Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) rendering engine that is said to resolve such freezing issues internally. In that case, introducing this option may be reconsidered.

* `estimatedItemHeight: number` — Is used for the initial render of the list: determines how many list items are rendered initially to cover the screen height plus some extra vertical margin (called "prerender margin") for future scrolling. If not set then the list first renders just the first item, measures it, and then assumes it to be the `estimatedItemHeight` from which it calculates how many items to show on the second render pass to fill the screen height plus the "prerender margin". Therefore, this setting is only for the initial render minor optimization and is not required.

* `prerenderMargin` — The list component renders not only the items that're currently visible but also the items that lie within some extra vertical margin (called "prerender margin") on top and bottom for future scrolling: this way, there'll be significantly less layout recalculations as the user scrolls, because now it doesn't have to recalculate layout on each scroll event. By default, the "prerender margin" is equal to the screen height: this seems to be the optimal value for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling. This parameter is currently ignored because the default value seems to fit all possible use cases.
</details>

#####

<details>
<summary><code>VirtualScroller</code> instance methods</summary>

#####

* `start()` — `VirtualScroller` starts listening for scroll events. Should be called after the list has been rendered initially.

* `stop()` — `VirtualScroller` stops listening for scroll events. Should be called when the list is about to be removed from the page. To re-start the `VirtualScroller`, call `.start()` method again.

* `getState(): object` — Returns `VirtualScroller` state.

* `setItems(newItems: any[], options: object?)` — Updates `VirtualScroller` `items`. For example, it can be used to prepend or append new items to the list. See [Dynamically Loaded Lists](#dynamically-loaded-lists) section for more details. Available options:
  * `preserveScrollPositionOnPrependItems: boolean` — Set to `true` to enable "restore scroll position after prepending new items" feature (should be used when implementing a "Show previous items" button).

#### Custom (External) State Management

A developer might prefer to use custom (external) state management rather than the default one. That might be the case when a certain high-order `VirtualScroller` implementation comes with a specific state management paradigm, like in React. In such case, `VirtualScroller` provides the following instance methods:

* `onRender()` — When using custom (external) state management, the `.onRender()` function must be called every time right after the list has been "rendered" (including the initial render).

* `getInitialState(): object` — Returns the initial `VirtualScroller` state for the cases when a developer configures `VirtualScroller` for custom (external) state management.

* `useState({ getState, updateState })` — Enables custom (external) state management.

  * `getState(): object` — Returns the externally managed `VirtualScroller` `state`.

  * `updateState(stateUpdate: object)` — Updates the externally managed `VirtualScroller` `state`. Must call `.onRender()` right after the updated `state` gets "rendered". A higher-order `VirtualScroller` implementation could either "render" the list immediately in its `updateState()` function, like the DOM implementation does, or the `updateState()` function could "schedule" a "re-render", like the React implementation does, in which case such `updateState()` function would be called an ["asynchronous"](https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous) one, meaning that state updates aren't "rendered" immediately and are instead queued and then "rendered" in a single compound state update for better performance.

For a usage example, see `./source/react/VirtualScroller.js`. The steps are:

* Create a `VirtualScroller` instance.

* Get the initial state value via `virtualScroller.getInitialState()`.

* Initialize the externally managed state with the initial state value.

* Define `getState()` and `updateState()` functions for reading or updating the externally managed state.

* Call `virtualScroller.useState({ getState, updateState })`.

* "Render" the list and call `virtualScroller.start()`.

When using custom (external) state management, contrary to the default (internal) state management approach, the `render()` function parameter can't be passed to the `VirtualScroller` constructor. The reason is that `VirtualScroller` wouldn't know when exactly should it call such `render()` function because by design it can only be called right after the state has been updated, and `VirtualScroller` doesn't know when exactly does the state get updated, because state updates are done via an "external" `updateState()` function that could as well apply state updates "asynchronously" (after a short delay), like in React, rather than "synchronously" (immediately). That's why the `updateState()` function must re-render the list by itself, at any time it finds appropriate, and right after the list has been re-rendered, it must call `virtualScroller.onRender()`.

#### "Advanced" (rarely used) instance methods

* `onItemHeightChange(i: number)` — (advanced) Must be called whenever a list item's height changes (for example, when a user clicks an "Expand"/"Collapse" button of a list item): it re-measures the item's height and updates `VirtualScroller` layout. Every change in an item's height must come as a result of changing some kind of a state, be it the item's state in `VirtualScroller` via `.onItemStateChange()`, or some other state managed by the application. Implementation-wise, calling `onItemHeightChange()` manually could be replaced with detecting item height changes automatically via [Resize Observer](https://caniuse.com/#search=Resize%20Observer).

* `onItemStateChange(i: number, itemState: object?)` — (advanced) Updates a list item's state inside `VirtualScroller` state. Must be called whenever an item's "state" changes: this way, the item's state is preserved when the item is unmounted due to going off screen, and then restored when the item is on screen again. Calling `onItemStateChange()` doesn't trigger a re-layout of `VirtualScroller` because changing a list item's state doesn't necessarily mean a change of its height, so a re-layout might not be required. If an item's height did change as a result of changing its state, then `VirtualScroller` layout must be updated, and to do that, call `onItemHeightChange(i)` after calling `onItemStateChange()`. For example, consider a social network feed, each post optionally having an attachment. Suppose there's a post in the feed having a YouTube video attachment. The attachment is initially shown as a small thumbnail that expands into a full-sized embedded YouTube video player when a user clicks on it. If the expanded/collapsed state of such attachment isn't been managed in `VirtualScroller`, then, when the user expands the video, then scrolls down so that the post with the video is no longer visible and is unmounted as a result, then scrolls back up so that the post with the video is visible again, the video's expanded state would be lost, and it would be rendered as a small thumbnail as if the user didn't click on it. And don't forget about calling `onItemHeightChange(i)` in such cases: if `onItemHeightChange(i)` isn't called after expanding the thumbnail into a video player, then the scroll position would "jump" when such item goes off screen, because `VirtualScroller` would have based its calculations on the initially measured item height, not the "expanded" one.

* `getItemScrollPosition(i: number): number?` — (advanced) Returns an item's scroll position inside the scrollable container. Returns `undefined` if any of the items before this item haven't been rendered yet.

<!-- * `getItemCoordinates(i: number): object` — Returns coordinates of item with index `i` relative to the "scrollable container": `top` is the top offset of the item relative to the start of the "scrollable container", `bottom` is the top offset of the item's bottom edge relative to the start of the "scrollable container", `height` is the item's height. -->

* `updateLayout()` — (advanced) Triggers a re-layout of `VirtualScroller`. It's what's called every time on page scroll or window resize. You most likely won't ever need to call this method manually. Still, one could imagine a hypothetical case when a developer might want to call this method. For example, when the list's top position changes not as a result of scrolling the page or resizing the window, but rather because of some unrelated "dynamic" changes of the page's content. For example, if some DOM elements above the list are removed (like a closeable "info" notification element) or collapsed (like an "accordion" panel), then the list's top position changes, which means that now some of the previoulsy shown items might go off screen, revealing an unrendered blank area to the user. The area would be blank because the "shift" of the list's vertical position happened not as a result of the user scrolling the page or resizing the window, and, therefore, it won't be registered by the `VirtualScroller` component. To fix that, a developer might want to trigger a re-layout manually.
</details>

## DOM

`virtual-scroller/dom` component implements a `VirtualScroller` in a standard [Document Object Model](https://en.wikipedia.org/wiki/Document_Object_Model) environment (a web browser).

The DOM `VirtualScroller` component constructor accepts arguments:

* `container` — Container DOM `Element`.
* `items` — The list of items.
* `renderItem(item)` — A function that "renders" an `item` as a DOM `Element`.
* `options` — (optional) Core `VirtualScroller` options.

It `.start()`s automatically upon being created, so there's no need to call `.start()` after creating it.

```js
import VirtualScroller from 'virtual-scroller/dom'

const messages = [
  {
    username: 'john.smith',
    date: new Date(),
    text: 'I woke up today'
  },
  ...
]

function renderMessage(message) {
  // Message element.
  const root = document.createElement('article')

  // Message author.
  const author = document.createElement('a')
  author.setAttribute('href', `/users/${message.username}`)
  author.textContent = `@${message.username}`
  root.appendChild(author)

  // Message date.
  const time = document.createElement('time')
  time.setAttribute('datetime', message.date.toISOString())
  time.textContent = message.date.toString()
  root.appendChild(time)

  // Message text.
  const text = document.createElement('p')
  text.textContent = message.text
  root.appendChild(text)

  // Return message element.
  return root
}

const virtualScroller = new VirtualScroller(
  document.getElementById('messages'),
  messages,
  renderMessage
)

// When the `VirtualScroller` component is no longer needed on the page:
// virtualScroller.stop()
```
<details>
<summary>Additional DOM <code>VirtualScroller</code> options</summary>

#####

<!-- * `onMount()` — Is called before `VirtualScroller.onMount()` is called. -->

* `onItemUnmount(itemElement)` — Is called after a `VirtualScroller` item DOM `Element` is unmounted. Can be used to add DOM `Element` ["pooling"](https://github.com/ChrisAntaki/dom-pool#what-performance-gains-can-i-expect).
</details>

#####

<details>
<summary>DOM <code>VirtualScroller</code> instance methods</summary>

#####

* `start()` — A proxy for the corresponding `VirtualScroller` method.

* `stop()` — A proxy for the corresponding `VirtualScroller` method.

* `setItems(items, options)` — A proxy for the corresponding `VirtualScroller` method.

* `onItemHeightChange(i)` — A proxy for the corresponding `VirtualScroller` method.

* `onItemStateChange(i, itemState)` — A proxy for the corresponding `VirtualScroller` method.

<!-- * `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method. -->
</details>

## React

`virtual-scroller/react` component implements a `VirtualScroller` in a [React](https://reactjs.org/) environment.

The required properties are:

* `items` — The list of items.

* `itemComponent` — List item React component.

  * The `itemComponent` will receive properties:
    * `item` — the item object itself (an element of the `items` array).
    * `itemIndex: number` — the index of the item object in the `items` array.

  * For best performance, make sure that `itemComponent` is a `React.memo()` component or a `React.PureComponent`. Otherwise, list items will keep re-rendering themselves as the user scrolls because the containing `<VirtualScroller/>` component gets re-rendered on scroll.

#####

```js
import React from 'react'
import PropTypes from 'prop-types'
import VirtualScroller from 'virtual-scroller/react'

function Messages({ messages }) {
  return (
    <VirtualScroller
      items={messages}
      itemComponent={Message}
    />
  )
}

function Message({ item: message }) {
  const {
    username,
    date,
    text
  } = message
  return (
    <article>
      <a href={`/users/${username}`}>
        @{username}
      </a>
      <time dateTime={date.toISOString()}>
        {date.toString()}
      </time>
      <p>
        {text}
      </p>
    </article>
  )
}

const message = PropTypes.shape({
  username: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  text: PropTypes.string.isRequired
})

Messages.propTypes = {
  messages: PropTypes.arrayOf(message).isRequired
}

Message.propTypes = {
  item: message.isRequired
}
```

<details>
<summary>Managing <code>itemComponent</code> state</summary>

#####

If the `itemComponent` has any internal state, it should be stored in the `VirtualScroller` `state`. The need for saving and restoring list item component state arises because item components get unmounted as they go off screen. If the item component's state is not persested somehow, it would be lost when the item goes off screen. If the user then decides to scroll back up, that item would get re-rendered "from scratch", potentually causing a "jump of content" if it was somehow "expanded" prior to being hidden.

For example, consider a social network feed where feed items (posts) can be expanded or collapsed via a "Show more"/"Show less" button. Suppose a user clicks a "Show more" button on a post resulting in that post expanding in height. Then the user scrolls down and since the post is no longer visible it gets unmounted. Since no state is preserved by default, when the user scrolls back up and the post gets mounted again, its previous state will be lost and it will render as a collapsed post instead of an expanded one, resulting in a perceived "jump" of page content by the difference in height of the post being expanded and collapsed.

To fix that, `itemComponent` receives the following state management properties:

* `state` — Saved state of the item component. Use this property to render the item component.

  * In the example described above, `state` might look like `{ expanded: true }`.

  * This is simply a proxy for `virtualScroller.getState().itemStates[i]`.

* `onStateChange(newItemState)` — Use this function to save the item component state whenever it changes.

  * In the example described above, `onStateChange()` would be called whenever a user clicks a "Show more"/"Show less" button.

  * This is simply a proxy for `virtualScroller.onItemStateChange(i, itemState)`.

* `onHeightChange()` — Call this function whenever the item element height changes.

  * In the example described above, `onHeightChange()` would be called whenever a user clicks a "Show more"/"Show less" button, because that results in a change of the item element's height, so `VirtualScroller` should re-measure it in order for its internal calculations to stay correct.

  * This is simply a proxy for `virtualScroller.onItemHeightChange(i)`.

```js
function ItemComponent({
  state: savedState,
  onStateChange,
  onHeightChange,
  item
}) {
  const [state, setState] = useState(savedState)

  useLayoutEffect(() => {
    onStateChange(state)
    onHeightChange()
  }, [state])

  return (
    <section>
      <h1>
        {item.title}
      </h1>
      {state.expanded &&
        <p>{item.text}</p>
      }
      <button onClick={() => {
        setState({
          ...state,
          expanded: !expanded
        })
      }}>
        {state.expanded ? 'Show less' : 'Show more'}
      </button>
    </section>
  )
}
```
</details>

#####

<details>
<summary><code>&lt;VirtualScroller/&gt;</code> optional properties</summary>

#####

Note: When passing any core `VirtualScroller` class options, only the initial values of those options will be applied, and any updates to those options will be ignored. That's because those options are only passed to the `VirtualScroller` base class constructor at initialization time. That means that none of those options should depend on any variable state or props. For example, if `getColumnsCount()` parameter was defined as `() => props.columnsCount`, then, if the `columnsCount` property changes, the underlying `VirtualScroller` instance won't see that change.

* `itemComponentProps: object` — The props passed to `itemComponent`.

* `getColumnsCount(): number` — The `getColumnsCount()` option of `VirtualScroller`.

* `as` — A component used as a container for the list items. Is `"div"` by default.

* `initialState: object` — The initial state for `VirtualScroller`: the `state` option of `VirtualScroller`. For example, can be used to quicky restore the list on "Back" navigation.

<!-- * `initialCustomState: object` — (advanced) The initial "custom" state for `VirtualScroller`: the `initialCustomState` option of `VirtualScroller`. It can be used to initialize the "custom" part of `VirtualScroller` state in cases when `VirtualScroller` state is used to store some "custom" list state. -->

* `onStateChange(newState: object, previousState: object?)` — The `onStateChange` option of `VirtualScroller`. Could be used to restore a `VirtualScroller` state on "Back" navigation:

```js
import {
  readVirtualScrollerState,
  saveVirtualScrollerState
} from './globalStorage'

function Example() {
  const virtualScrollerState = useRef()

  useEffect(() => {
    return () => {
      // Save `VirtualScroller` state before the page unmounts.
      saveVirtualScrollerState(virtualScrollerState.current)
    }
  })

  return (
    <VirtualScroller
      items={...}
      itemComponent={...}
      state={hasUserNavigatedBack ? readVirtualScrollerState() : undefined}
      onStateChange={state => virtualScrollerState.current = state}
    />
  )
}
```

* `preserveScrollPositionOnPrependItems: boolean` — The `preserveScrollPositionOnPrependItems` option of `VirtualScroller.setItems()` method.

* `getItemId(item): any` — The `getItemId` option of `VirtualScroller` class. The React component also uses it as a source for a React `key` for rendering an `item`. If `getItemId()` is not supplied, then item `key`s are autogenerated from a random-generated prefix (that changes every time `items` are updated) and an `item` index. Can be used to prevent `<VirtualScroller/>` from re-rendering all visible items every time `items` property is updated.

* `bypass: boolean` — The `bypass` option of `VirtualScroller` class.

* `tbody: boolean` — The `tbody` option of `VirtualScroller` class.

* `estimatedItemHeight: number` — The `estimatedItemHeight` option of `VirtualScroller` class.

* `measureItemsBatchSize: number` — The `measureItemsBatchSize` option of `VirtualScroller`.

<!-- * `onMount()` — Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. -->

* `onItemInitialRender(item)` — The `onItemInitialRender` option of `VirtualScroller` class.

<!-- * `shouldUpdateLayoutOnScreenResize(event)` — The `shouldUpdateLayoutOnScreenResize` option of `VirtualScroller` class. -->

* `getScrollableContainer(): Element` — The `getScrollableContainer` option of `VirtualScroller` class. The scrollable container DOM Element must exist by the time `<VirtualScroller/>` component is mounted.

<!--
If one considers that `useEffect()` hooks [run in the order from child element to parent element](https://stackoverflow.com/questions/58352375/what-is-the-correct-order-of-execution-of-useeffect-in-react-parent-and-child-co), one can conclude that there's no way that the application's `useLayoutEffect()` hook could run before the `useLayoutEffect()` hook in a `<VirtualScroller/>` component. Therefore, there's only one option to make it work, and that would be only rendering `<VirtualScroller/>` after the scrollable container has mounted:

```js
import React, { useState, useLayoutEffect } from 'react'
import VirtualScroller from 'virtual-scroller'

function ListContainer() {
  return (
    <div id="ListContainer">
      <List/>
    </div>
  )
}

function List() {
  const [scrollableContainerHasMounted, setScrollableContainerHasMounted] = useState()

  useLayoutEffect(() => {
    setScrollableContainerHasMounted(true)
  }, [])

  if (!scrollableContainerHasMounted) {
    return null
  }

  return (
    <VirtualScroller
      items={...}
      itemComponent={...}
      getScrollableContainer={getScrollableContainer}
    />
  )
}

function getScrollableContainer() {
  return document.getElementById('ListContainer')
}
```

```css
#ListContainer {
  max-height: 30rem;
  overflow-y: auto;
}
```
-->
</details>

#####

<details>
<summary><code>&lt;VirtualScroller/&gt;</code> instance methods</summary>

#####

<!--
* `renderItem(i)` — Calls `.forceUpdate()` on the `itemComponent` instance for the item with index `i`. Does nothing if the item isn't currently rendered. Is only supported for `itemComponent`s that are `React.Component`s. The `i` item index argument could be replaced with the item object itself, in which case `<VirtualScroller/>` will get `i` as `items.indexOf(item)`.
-->

<!-- * `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method. -->

* `updateLayout()` — A proxy for the corresponding `VirtualScroller` method.
</details>

## Dynamically Loaded Lists

All previous examples described cases with static `items` list. When there's a need to update the `items` list dynamically, one can use `virtualScroller.setItems(newItems)` instance method. For example:
* When the user clicks "Show previous items" button, the `newItems` argument should be `previousItems.concat(currentlyShownItems)`.
* When the user clicks "Show next items" button, the `newItems` argument should be `currentlyShownItems.concat(nextItems)`.

<details>
<summary>Find out what are "incremental" and "non-incremental" items updates, and why "incremental" updates are better.</summary>

#####

When using `virtual-scroller/dom` component, a developer should call `.setItems(newItems)` instance method in order to update items.

When using `virtual-scroller/react` React component, it calls `.setItems(newItems)` method automatically when new `items` property is passed.

The basic equality check (`===`) is used to intelligently compare `newItems` to the existing `items`. If `getItemId()` parameter is passed, then items are compared by their ids rather than by themselves. If a simple append and/or prepend operation is detected, then the update is an "incremental" one, and the list seamlessly transitions from the current state to the new state, preserving its state and scroll position. If, however, the items have been updated in such a way that it's not a simple append and/or prepend operation, then such update is a "non-incremental" one, and the entire list is rerendered from scratch, losing its state and resetting the scroll position. There're valid use cases for both situations.

For example, suppose a user navigates to a page where a list of `items: object[]` is shown using a `VirtualScroller`. When a user scrolls down to the last item in the list, a developer might want to query the database for the newly added items, and then show those new items to the user. In that case, the developer could send a query to the API with `afterId: number` parameter being the `id: number` of the last item in the list, and the API would then return a list of the `newItems: object[]` whose `id: number` is greater than the `afterId: number` parameter. Then, the developer would append the `newItems: object[]` to the `items: object[]`, and then call `VirtualScroller.setItems()` with the updated `items: object[]`, resulting in a "seamless" update of the list, preserving its state and scroll position.

Another example. Suppose a user navigates to a page where they can filter a huge list by a query entered in a search bar. In that case, when the user edits the query in the search bar, `VirtualScroller.setItems()` method is called with a list of filtered items, and the entire list is rerendered from scratch. In this case, it's ok to reset the `VirtualScroller` state and the scroll position.

<!--
`virtualScroller.setItems(newItems)` also receives an optional second `options` argument having shape `{ state }` where `state` can be used for updating "custom state" previously set in `getInitialState(customState)` and can be an `object` or a function `(previousState, { prependedCount, appendedCount }) => object`. If the items update is not incremental (i.e. if `newItems` doesn't contain previous `items`) then both `prependedCount` and `appendedCount` will be `undefined`.
-->

When new items are appended to the list, the page scroll position remains unchanged. Same's for prepending new items to the list: the scroll position of the page stays the same, resulting in the list "jumping" down when new items get prepended. To fix that, pass `preserveScrollPositionOnPrependItems: true` option to the `VirtualScroller`. When using `virtual-scroller/dom` component, pass that option when creating a new instance, and when using `virtual-scroller/react` React component, pass `preserveScrollPositionOnPrependItems` property.

For implementing "infinite scroll" lists, a developer could also use [`on-scroll-to`](https://gitlab.com/catamphetamine/on-scroll-to) component.
</details>

## Grid Layout

To display items using a "grid" layout (i.e. multiple columns in a row), supply a `getColumnsCount(container: ScrollableContainer): number` parameter to `VirtualScroller`.

For example, to show a three-column layout on screens wider than `1280px`:

```js
function getColumnsCount(container) {
  // The `container` argument provides a `.getWidth()` method.
  if (container.getWidth() > 1280) {
    return 3
  }
  return 1
}

<VirtualScroller getColumnsCount={getColumnsCount} .../>
```

```css
.container {
  display: flex;
  flex-wrap: wrap;
}

.item {
  flex-basis: 33.333333%;
  box-sizing: border-box;
}

@media screen and (max-width: 1280px) {
  .item {
    flex-basis: 100%;
  }
}
```

## Gotchas

### Images

`VirtualScroller` measures item heights as soon as they've rendered and later uses those measurements to determine which items should be rendered when the user scrolls. This means that things like `<img/>`s require special handling to prevent them from changing their size. For example, when rendering a simple `<img src="..."/>` first it renders an element with zero width and height and only after the image file header has been parsed does it resize itself to the actual image's width and height. When used inside `VirtualScroller` items such images would result in scroll position "jumping" as the user scrolls. To avoid that, any `<img/>`s rendered inside `VirtualScroller` items must either have their `width` and `height` set explicitly or have their [aspect ratio](https://www.w3schools.com/howto/howto_css_aspect_ratio.asp) set explicitly by making them `position: absolute` and wrapping them in a parent `<div/>` having `position: relative` and `padding-bottom: ${100/aspectRatio}%`.

### Margin collapse

If any vertical CSS `margin` is set on the list items, then this may lead to page content "jumping" by the value of that margin while scrolling. The reason is that when the top of the list is visible on screen, no `padding-top` gets applied to the list element, and the CSS spec states that having `padding` on an element disables its ["margin collapse"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Mastering_margin_collapsing), so, while there's no `padding-top` on the list element, its margins do "collapse" with outer margins, but when the first item is no longer visible (and no longer rendered), `padding-top` gets applied to the list element to compensate for the non-rendered items, and that `padding-top` prevents the list's margins from "collapsing" with outer margins. So that results in the page content "jumping" when the first item in the list becomes invisible or becomes visible again. To fix that, don't set any `margin-top` on the first item of the list, and don't set any `margin-bottom` on the last item of the list. An example of fixing `margin` for the first and the last items of the list:

```css
/* This margin is supposed to "collapse" with the outer ones
   but requires a fix below to work correctly with `VirtualScroller`. */
.list-item {
  margin: 10px;
}
/* Fixes margin "collapse" for the first item. */
.list-item:first-child {
  margin-top: 0;
}
/* Fixes margin "collapse" for the last item. */
.list-item:last-child {
  margin-top: 0;
}
```

### Styling `:first-child` and `:last-child`

When styling the first and the last items of the list via `:first-child` and `:last-child`, one should also check that such styles don't change the item's height, which means that one should not add any `border` or `padding` styles to `:first-child` and `:last-child`, otherwise the list items will jump by that extra height during scrolling.

An example of a `:first-child`/`:last-child` style that will not work correctly with `VirtualScroller`:

```css
.list-item {
  border-bottom: 1px solid black;
}
.list-item:first-child {
  border-top: 1px solid black;
}
```

### Resize

When the container width changes, all items' heights must be recalculated because:

* If item elements render multi-line text, the lines count might've changed because there's more or less width available now.

* Some CSS [`@media()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries) rules might have been added or removed, affecting item layout.

If the list currently shows items starting from the `N`-th one, then all `N - 1` previous items have to be remeasured. But they can't be remeasured until they're rendered again, so `VirtualScroller` temporarily uses their old heights until those items get re-measured after they become visible again as the user scrolls up.

When such upper items get rendered and re-measured, the scroll position is automatically corrected to avoid ["content jumping"](https://css-tricks.com/content-jumping-avoid/).

<details>
<summary>I found a single edge case when the automatic correction of scroll position doesn't seem to work.</summary>

#####

(was reproduced in Chrome web browser on a desktop)

When the user scrolls up past the "prerender margin", which equals to the screen height by default, the list content does "jump" because the web browser doesn't want to apply the scroll position correction while scrolling for some weird reason. Looks like a bug in the web browser.

```
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
Current scroll position: 7989
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
Current scroll position: 7972
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
Current scroll position: 7957
[virtual-scroller] The user has scrolled far enough: perform a re-layout
[virtual-scroller] ~ Update Layout (on scroll) ~
...
[virtual-scroller] ~ Rendered ~
[virtual-scroller] State ...
[virtual-scroller] ~ Measure item heights ~
[virtual-scroller] Item index 27 height 232
[virtual-scroller] Item index 28 height 178
[virtual-scroller] ~ Clean up "before resize" item heights and correct scroll position ~
[virtual-scroller] For item indexes from 27 to 28 — drop "before resize" heights [340, 259]
[virtual-scroller] Correct scroll position by -189
Scroll to position: 7768
[virtual-scroller] Set state ...
[virtual-scroller] ~ Rendered ~
[virtual-scroller] State ...
Current scroll position: 7944
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
Current scroll position: 7933
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
Current scroll position: 7924
[virtual-scroller] The user is scrolling: perform a re-layout when they stop scrolling
...
```

```js
var listener = () => {
  console.log('Current scroll position:', window.pageYOffset)
}
document.addEventListener('scroll', listener)
var unlisten = () => document.removeEventListener('scroll', listener)

// Also add `console.log('Scroll to position:', scrollY)` in
// `scrollToY()` method in `./source/DOM/ScrollableContainer.js`.
```

Also, pressing the "Home" key wouldn't scroll up past the "prerender margin", which is equal to the screen height by default. The reason is the same: applying scroll position correction while the "Home" key is pressed cancels the effect of pressing the "Home" key.

A hypothetical workaround for this edge case bug could be rewriting the scroll position automatic correction code to postpone scroll position correction until the user stops scrolling, and instead change `margin-bottom` of some "spacer" element at the top of the list (or maybe even before the list). When the user stops scrolling, the scroll position would get corrected by the value of `margin-bottom` of that "spacer" element, after which the `margin-bottom` value on that "spacer" element would be reset. But this type of a workaround would only work in a DOM environment because it requires the support of "negative" margin.

For now, I don't see it as a bug that would be worth fixing. The user could just refresh the page, or not scroll up at all because they've already seen that content.
</details>

#####

The "before resize" layout parameters snapshot is stored in `VirtualScroller` state in `beforeResize` object:

* `itemHeights: number[]`
* `verticalSpacing: number`
* `columnsCount: number`

### `<tbody/>`

Due to the [inherent limitations](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) of the `<tbody/>` HTML tag, when a `<tbody/>` is used as a container for the list items, the `VirtualScroller` code has to use a workaround involving CSS variables, and CSS variables aren't supported in Internet Explorer, so using a `<tbody/>` as a list items container won't work in Internet Explorer: in such case, `VirtualScroller` renders in "bypass" mode (render all items). In all browsers other than Internet Explorer it works as usual.

### Search, focus management.

Due to offscreen list items not being rendered native browser features like "Find on page", moving focus through items via `Tab` key, screen reader announcement and such won't work. A workaround for "search on page" is adding a custom "🔍 Search" input field that would filter items by their content and then call `VirtualScroller.setItems()`.

### If only the first item is rendered on page load in dev mode.

<details>
<summary>See the description of this very rare dev mode bug.</summary>

#####

`VirtualScroller` calculates the shown item indexes when its `.onMount()` method is called, but if the page styles are applied after `VirtualScroller` is mounted (for example, if styles are applied via javascript, like Webpack does it in dev mode with its `style-loader`) then the list might not render correctly and will only show the first item. The reason for that is because calling `.getBoundingClientRect()` on the list container DOM element on mount returns "incorrect" `top` position because the styles haven't been applied yet, and so `VirtualScroller` thinks it's offscreen.

For example, consider a page:

```html
<div class="page">
  <nav class="sidebar">...</nav>
  <main>...</main>
</div>
```

The sidebar is styled as `position: fixed`, but until the page styles have been applied it's gonna be a regular `<div/>` meaning that `<main/>` will be rendered below the sidebar causing it to be offscreen and so the list will only render the first item. Then, the page styles are loaded and applied and the sidebar is now `position: fixed` so `<main/>` is now rendered at the top of the page but `VirtualScroller` has already been rendered and it won't re-render until the user scrolls or the window is resized.

This type of a bug doesn't occur in production, but it can appear in development mode when using Webpack. The workaround `VirtualScroller` implements for such cases is calling `.getBoundingClientRect()` on the list container DOM element periodically (every second) to check if the `top` coordinate has changed as a result of CSS being applied: if it has then it recalculates the shown item indexes and re-renders.
</details>

## Debug

Set `window.VirtualScrollerDebug` to `true` to output debug messages to `console`.

## Rendering Engine

(advanced)

`VirtualScroller` is written in such a way that it supports any type of a rendering engine, not just DOM. For example, it could support something like React Native or `<canvas/>`: for that, someone would have to write custom versions of [`Screen.js`](https://gitlab.com/catamphetamine/virtual-scroller/-/blob/master/source/DOM/Screen.js) and [`ScrollableContainer.js`](https://gitlab.com/catamphetamine/virtual-scroller/-/blob/master/source/DOM/ScrollableContainer.js), and then instruct `VirtualScroller` to use those instead of the default ones by passing custom `engine` object when constructing a `VirtualScroller` instance:

```js
import VirtualScroller from 'virtual-scroller'

import Container from './Container'
import ScrollableContainer from './ScrollableContainer'

new VirtualScroller(getItemsContainerElement, items, {
  getScrollableContainer,
  engine: {
    createItemsContainer(getItemsContainerElement) {
      return new Container(getItemsContainerElement)
    },
    createScrollableContainer(getScrollableContainer, getItemsContainerElement) {
      return new ScrollableContainer(getScrollableContainer, getItemsContainerElement)
    }
  },
  ...
})
```

`getItemsContainerElement()` function would simply return a list "element", whatever that could mean. The concept of an "element" is "something, that can be rendered", so it could be anything, not just a DOM Element. Any operations with "elements" are done either in `Container.js` or in `ScrollableContainer.js`: `Container.js` defines the operations that could be applied to the list "container", or its items, such as getting its height or getting an items' height, and `ScrollableContainer.js` defines the operations that could be applied to a "scrollable container", such as getting its dimensions, listening for "resize" and "scroll" events, controlling scroll position, etc.

## CDN

One can use any npm CDN service, e.g. [unpkg.com](https://unpkg.com) or [jsdelivr.net](https://jsdelivr.net)

```html
<!-- Core. -->
<script src="https://unpkg.com/virtual-scroller@1.x/bundle/virtual-scroller.js"></script>
<script>
  new VirtualScroller(...)
</script>

<!-- DOM component. -->
<script src="https://unpkg.com/virtual-scroller@1.x/bundle/virtual-scroller-dom.js"></script>
<script>
  new VirtualScroller(...)
</script>

<!-- React component. -->
<script src="https://unpkg.com/virtual-scroller@1.x/bundle/virtual-scroller-react.js"></script>
<script>
  <VirtualScroller .../>
</script>
```

<!--
## Possible enhancements

* Use [Resize Observer](https://caniuse.com/#search=Resize%20Observer) instead of calling `.onItemHeightChange(i)` manually.

* Currently React `<VirtualScroller/>` passes `onHeightChange()` property and provides `.renderItem(i)` instance method. Both these features could be replaced with doing it internally in `VirtualScroller`'s `.setItems(newItems)` method: it could detect the items that have changed (`prevItems[i] !== newItems[i]`) and recalculate heights for such items, while the changed `item` properties would also cause the relevant React elements to be rerendered.
-->

## TypeScript

This library comes with TypeScript "typings". If you happen to find any bugs in those, create an issue.

## Possible enhancements

### Alternative approach in DOM rendering

This library's `DOM` and `React` component implementations use `padding-top` and `padding-bottom` on the items container to emulate the items that're not currently visible. In DOM environment, this approach comes with a slight drawback: the web browser has to perform a "reflow" every time shown item indexes change as a result of the user scrolling the page.

Twitter seems to use a slightly different approach: they set `position: relative` and `min-height: <all-items-height>` on the items container, and then `position: absolute`, `width: 100%` and `transform: translateY(<item-top-offset>)` on every items. Since `transform`s are only applied at the "compositing" stage of a web browser's rendering cycle, there's no need to recalculate anything, and so scrolling the page comes without any possible performance penalties at all.

<details>
<summary>My thoughts on moving from <code>padding</code>s to <code>transform</code>s</summary>

######

I've fantasised a bit about moving to `transforms` in this library's `DOM` and `React` component implementations, and it seems to involve a bit more than it initially seems:

* Item heights aren't known before the items have been rendered, so it'll have to re-render twice rather than once as the user scrolls: first time to measure the newly-shown items' heights and second time to apply the calculated Y positions of those items.

* A bit more complexity is added when one recalls that this library supports multi-column layout: now not only `y` positions but also `x` positions of every item would have to be calculated, and not only vertical spacing but also horizontal spacing between the items in a row.

* The `state` would have to include a new property — `itemPositions` — that would include an `x` and `y` position for every item.

* Using `x`/`y` positions for every item would mean that the `x`/`y` position of every item would no longer be dynamically calculated by a web browser (in `auto` mode) and instead would have to be pre-calculated by the library meaning that everything would have to be constantly re-calculated and re-rendered as the user resizes the window, not just on window resize end like it currently does. For example, if the user starts shrinking window width, the items' heights would start increasing due to content overflow, which, without constant re-calculation and re-rendering, would result in items being rendered on top of each other. So the fix for that would be re-calculating and re-rendering stuff immediately on every window `resize` event as the user drags the handle rather than waiting for the user to let go of that handle and stop resizing the window, which would obviously come with some performance penalties but maybe a modern device can handle such things without breaking a sweat.

The points listed above aren't something difficult to implement, it's just that I don't want to do it unless there're any real observed performance issues related to the "reflows" during scrolling. "If it works, no need to change it".
</details>

## Tests

This component comes with about 80% code coverage (for the core `VirtualScroller`).

To run tests:

```
npm test
```

To generate a code coverage report:

```
npm run test-coverage
```

The code coverage report can be viewed by opening `./coverage/lcov-report/index.html`.

The `handlebars@4.5.3` [work](https://github.com/handlebars-lang/handlebars.js/issues/1646#issuecomment-578306544)[around](https://github.com/facebook/jest/issues/9396#issuecomment-573328488) in `devDependencies` is for the test coverage to not produce empty reports:

```
Handlebars: Access has been denied to resolve the property "statements" because it is not an "own property" of its parent.
You can add a runtime option to disable the check or this warning:
See https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access for details
```

## GitHub

On March 9th, 2020, GitHub, Inc. silently [banned](https://medium.com/@catamphetamine/how-github-blocked-me-and-all-my-libraries-c32c61f061d3) my account (erasing all my repos, issues and comments) without any notice or explanation. Because of that, all source codes had to be promptly moved to GitLab. The [GitHub repo](https://github.com/catamphetamine/virtual-scroller) is now only used as a backup (you can star the repo there too), and the primary repo is now the [GitLab one](https://gitlab.com/catamphetamine/virtual-scroller). Issues can be reported in any repo.

## License

[MIT](LICENSE)