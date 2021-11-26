# VirtualScroller

A universal open-source implementation of Twitter's [`VirtualScroller`](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) component: a component for efficiently rendering large lists of *variable height* items. Automatically measures items as they're rendered and supports items of variable/dynamic height. Also includes a [React](#react) component for those who're using React. Also provides a low-level component that supports any type of [rendering engine](#rendering-engine), not just DOM.

## Demo

DOM (no frameworks):

* [Basic](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html)
* [Dynamically loaded](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html?dynamic=✓)

React:

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

The default export is a low-level `VirtualScroller` class: it implements the core logic of a `VirtualScroller` component and can be used for building a `VirtualScroller` component for any UI framework or even any [rendering engine](#rendering-engine) other than DOM. Hence, the core component is not meant to be used in applications directly: instead, use the high-level components exported from [`virtual-scroller/dom`](#dom) or [`virtual-scroller/react`](#react) packages.

#### State

The core `VirtualScroller` component works by dynamically updating its `state` as the user scrolls the page. The `state` provides the calculations on which items should be rendered (and which should not) depending on the current scroll position. A high-level wrapper around `VirtualScroller` supplies a function that renders the actual list using the information from the `state`.

<details>
<summary>Show the list of all <code>state</code> properties</summary>

#####

A high-level wrapper should supply either `getState`/`setState` functions, or `onStateChange` function (or both of them), and those functions are gonna be responsible for rendering the actual list using the information from `state`.

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

* `columnsCount: number?` — The count of items in a row. Is `undefined` if no `getColumnsCount()` parameter has been passed to `VirtualScroller`.
</details>

#### Example

<details>
<summary>A general idea of using the low-level <code>VirtualScroller</code> class.</summary>

#####

```js
import VirtualScroller from 'virtual-scroller'

const items = [...]

const getItemsContainerElement = () => ...

const virtualScroller = new VirtualScroller(getItemsContainerElement, items, {
  onStateChange(state) {
    // Re-render the list based on its state:
    // * items
    // * firstShownItemIndex
    // * lastShownItemIndex
    // * beforeItemsHeight
    // * afterItemsHeight
  }
})

// Start listening to scroll events.
virtualScroller.listen()

// Stop listening to scroll events.
virtualScroller.stop()
```

* `getItemsContainerElement()` function returns the list "element" that is gonna contain all list item "elements".
* `items` is the list of items.
* `onStateChange(state)` is one of the available list `options`.
</details>

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

function onStateChange(newState, prevState) {
  const {
    items,
    beforeItemsHeight,
    afterItemsHeight,
    firstShownItemIndex,
    lastShownItemIndex
  } = newState
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
  } else {
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

const options = { onStateChange }

const virtualScroller = new VirtualScroller(() => element, items, options)

// Start VirtualScroller listening for scroll events.
virtualScroller.listen()

// Stop VirtualScroller listening for scroll events
// when the user navigates to another page:
// router.onPageUnload(virtualScroller.stop)
```
</details>

#### Options

<details>
<summary>Show the list of all available core <code>VirtualScroller</code> <code>options</code>.</summary>

#####

* `estimatedItemHeight: number` — Is used for the initial render of the list: determines how many list items are rendered initially to cover the screen height plus some extra vertical margin (called "prerender margin") for future scrolling. If not set then the list first renders just the first item, measures it, and then assumes it to be the `estimatedItemHeight` from which it calculates how many items to show on the second render pass to fill the screen height plus the "prerender margin". Therefore, this setting is only for the initial render minor optimization and is not required.

* `prerenderMargin` — The list component renders not only the items that're currently visible but also the items that lie within some extra vertical margin (called "prerender margin") on top and bottom for future scrolling: this way, there'll be significantly less layout recalculations as the user scrolls, because now it doesn't have to recalculate layout on each scroll event. By default, the "prerender margin" is equal to the screen height: this seems to be the optimal value for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling. This parameter is currently ignored because the default value seems to fit all possible use cases.

* `state: object` — The initial state for `VirtualScroller`. Can be used, for example, to quicky restore the list when it's re-rendered on "Back" navigation.

* `customState: object` — (advanced) The initial "custom" state for `VirtualScroller`. It can be used to initialize the "custom" part of `VirtualScroller` state in cases when `VirtualScroller` state is used to store some "custom" list state.

* `getState(): object` — (advanced) By default, `VirtualScroller` manages `state` internally by storing it in an instance variable. For more control, the `state` could be managed externally, in which case a developer should supply `getState`/`setState` options, in which case `getState` should return the externally stored `VirtualScroller` `state`. React `VirtualScroller` component implementation uses this option.

* `setState(stateUpdate: object, { willUpdateState, didUpdateState })` — (advanced) By default, `VirtualScroller` manages `state` internally by storing it in an instance variable. For more control, the `state` could be managed externally, in which case a developer should supply `getState`/`setState` options, in which case `setState` should update the externally stored `VirtualScroller` `state` (including setting the initial `state`), and it should do that by merging the previous `state` with the `stateUpdate` argument. `setState` must also call two functions: `willUpdateState(newState, prevState)` right before the state is updated and `didUpdateState(prevState)` right after the state is updated. The list should be re-rendered as part of either `setState` or `onStateChange`. `setState` could be ["asynchronous"](https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous), that is when state updates aren't applied immediately and are instead queued and then applied in a single state update for performance. React `VirtualScroller` component implementation uses this option.

* `onStateChange(newState: object, prevState: object?)` — Is called whenever `VirtualScroller` `state` is updated (including setting the initial `state`). Is not called when individual item heights (including "before resize" ones) or states are updated: instead, individual item heights or states are updated in-place — `state.itemHeights[i] = newItemHeight` or `state.itemStates[i] = newItemState`. That's because those `state` properties are the ones that don’t affect the presentation, so there's no need to re-render the list when those do change — updating those properties is just an effect of some change rather than cause for one. In order for a `VirtualScroller` implementation to work, a developer must either supply `getState`/`setState` options or `onStateChange` option (or both). The list should be re-rendered as part of either `setState` or `onStateChange`.

* `scrollableContainer: Element` — (advanced) If the list is being rendered in a "scrollable container" (for example, if one of the parent elements of the list is styled with `max-height` and `overflow: auto`), then passing the "scrollable container" DOM Element is required for correct operation. *This feature is considered [experimental](https://github.com/catamphetamine/virtual-scroller/issues/8).* The width and height of the `scrollableContainer` shouldn't change unless window is resized.

* `initialScrollPosition: number` — If passed, the page will be scrolled to this `scrollY` position.

* `onScrollPositionChange(scrollY: number)` — Is called whenever a user scrolls the page.

* `bypass: boolean` — Pass `true` to turn off `VirtualScroller` behavior and just render the full list of items.

* `getItemId(item)` — (advanced) When `items` are dynamically updated via `.setItems()`, `VirtualScroller` detects an "incremental" update by comparing "new" and "old" item ["references"](https://codeburst.io/explaining-value-vs-reference-in-javascript-647a975e12a0): this way, `VirtualScroller` can understand that the "new" `items` are (mostly) the same as the "old" `items` when some items get prepended or appended to the list, in which case it doesn't re-render the whole list from scratch, but rather just renders the "new" items that got prepended or appended. Sometimes though, some of the "old" items might get updated: for example, if `items` is a list of comments, then some of those comments might get edited in-between the refreshes. In that case, the edited comment object reference should change in order to indicate that the comment's content has changed and that the comment should be re-rendered (at least that's how it has to be done in React world). At the same time, changing the edited comment object reference would break `VirtualScroller`'s "incremental" update detection, and it would re-render the whole list of comments from scratch, which is not what it should be doing in such cases. So, in cases like this, `VirtualScroller` should have some way to understand that the updated item, even if its object reference has changed, is still the same as the old one, so that it doesn't break "incremental" update detection. For that, `getItemId(item)` parameter could be passed, which `VirtualScroller` would use to compare "old" and "new" items (instead of the default "reference equality" check), and that would fix the "re-rendering the whole list from scratch" issue. It can also be used when `items` are fetched from an external API, in which case all item object references change on every such fetch.

* `onItemInitialRender(item)` — Is called for each `item` when it's about to be rendered for the first time. Is guaranteed to be called at least once for each item rendered, though, in "asynchronous" rendering systems like React, it could be called multiple times for a given item, because "an item is calculated to be rendered" doesn't necessarily mean that the actual rendering will take place before a later calculation supercedes the former one. This function can be used to somehow "initialize" items before they're rendered for the first time. For example, consider a list of items that must be somehow "preprocessed" (parsed, enhanced, etc) before being rendered, and such "preprocessing" puts some load on the CPU (and therefore takes some time). In such case, instead of "preprocessing" the whole list of items up front, a developer could "preprocess" the items as they're being rendered, thereby eliminating any associated lag or freezing that would be inevitable have all the items been "preprocessed" up front. If a user only wants to see a few of the items, "preprocessing" all the items up front would simply be a waste.

* `shouldUpdateLayoutOnScreenResize(event: Event): boolean`  — By default, `VirtualScroller` always performs a re-layout on window `resize` event. The `resize` event is not only triggered when a user resizes the window itself: it's also [triggered](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes) when the user switches into (and out of) fullscreen mode. By default, `VirtualScroller` performs a re-layout on all window `resize` events, except for ones that don't result in actual window width or height change, and except for cases when, for example, a video somewhere in a list is maximized into fullscreen. There still can be other "custom" cases: for example, when an application uses a custom "slideshow" component (rendered outside of the list DOM element) that goes into fullscreen when a user clicks a picture or a video in the list. For such "custom" cases `shouldUpdateLayoutOnScreenResize(event)` option / property can be specified.

* `measureItemsBatchSize: number` — (advanced) (experimental) Imagine a situation when a user doesn't gradually scroll through a huge list but instead hits an End key to scroll right to the end of such huge list: this will result in the whole list rendering at once (because an item needs to know the height of all previous items in order to render at correct scroll position) which could be CPU-intensive in some cases (for example, when using React due to its slow performance when initially rendering components on a page). To prevent freezing the UI in the process, a `measureItemsBatchSize` could be configured, that would limit the maximum count of items that're being rendered in a single pass for measuring their height: if `measureItemsBatchSize` is configured, then such items will be rendered and measured in batches. By default it's set to `100`. This is an experimental feature and could be removed in future non-major versions of this library. For example, the future React 17 will come with [Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) rendering engine that is said to resolve such freezing issues internally. In that case, introducing this option may be reconsidered.

* `getColumnsCount(container: ScrollableContainer): number` — (advanced) Provides support for ["grid"](#grid-layout) layout. The `container` argument provides a `.getWidth()` method.
</details>

#####

<details>
<summary>Show the list of all available core <code>VirtualScroller</code> instance methods.</summary>

#####

* `listen()` — Starts `VirtualScroller` listening for scroll events. Should be called immediately after the list has been rendered on a page.

* `stop()` — Stops `VirtualScroller` listening for scroll events. Should be called when the list is about to be removed from the page. Once stopped, a `VirtualScroller` can't be restarted.

* `getState(): object` — Returns `VirtualScroller` state. Is used for React `VirtualScroller` component implementation.

<!-- * `willUpdateState(newState: object, prevState: object?)` — If custom `setState` is defined, then it must call `VirtualScroller`'s `.willUpdateState()` instance method right before updating the `state`. The `prevState` argument should be `undefined` when (and only when) setting initial `state`. -->
<!-- * `didUpdateState(prevState: object?)` — If custom `setState` is defined, then it must call `VirtualScroller`'s `.didUpdateState()` instance method right after updating the `state`. The `prevState` argument should be `undefined` when (and only when) setting initial `state`. -->

* `onItemHeightChange(i: number)` — Must be called whenever a list item's height changes (for example, when a user clicks an "Expand"/"Collapse" button of a list item): it re-measures the item's height and updates `VirtualScroller` layout. Every change in an item's height must come as a result of changing some kind of state, be it the item's state in `VirtualScroller` via `.onItemStateChange()`, or some other state managed by the application. Implementation-wise, calling `onItemHeightChange()` manually could be replaced with detecting item height changes automatically via [Resize Observer](https://caniuse.com/#search=Resize%20Observer).

* `onItemStateChange(i: number, itemState: object?)` — Updates a list item's state inside `VirtualScroller` state. Must be called whenever an item's "state" changes: this way, the item's state is preserved when the item is unmounted due to going off screen, and then restored when the item is on screen again. Calling `onItemStateChange()` doesn't trigger a re-layout of `VirtualScroller` because changing a list item's state doesn't necessarily mean a change of its height, so a re-layout might not be required. If an item's height did change as a result of changing its state, then `VirtualScroller` layout must be updated, and to do that, call `onItemHeightChange(i)` after calling `onItemStateChange()`. For example, consider a social network feed, each post optionally having an attachment. Suppose there's a post in the feed having a YouTube video attachment. The attachment is initially shown as a small thumbnail that expands into a full-sized embedded YouTube video player when a user clicks on it. If the expanded/collapsed state of such attachment isn't been managed in `VirtualScroller`, then, when the user expands the video, then scrolls down so that the post with the video is no longer visible and is unmounted as a result, then scrolls back up so that the post with the video is visible again, the video's expanded state would be lost, and it would be rendered as a small thumbnail as if the user didn't click on it. And don't forget about calling `onItemHeightChange(i)` in such cases: if `onItemHeightChange(i)` isn't called after expanding the thumbnail into a video player, then the scroll position would "jump" when such item goes off screen, because `VirtualScroller` would have based its calculations on the initially measured item height, not the "expanded" one.

* `getItemScrollPosition(i: number): number?` — Returns an item's scroll position inside the scrollable container. Returns `undefined` if any of the items before this item haven't been rendered yet.

* `setItems(newItems: any[], options: object?)` — Updates `VirtualScroller` `items`. For example, it can be used to prepend or append new items to the list. See [Dynamically Loaded Lists](#dynamically-loaded-lists) section for more details. Available options: `preserveScrollPositionOnPrependItems: boolean` — Set to `true` to enable "restore scroll position after prepending new items" feature (should be used when implementing a "Show previous items" button).

<!-- * `getItemCoordinates(i: number): object` — Returns coordinates of item with index `i` relative to the "scrollable container": `top` is the top offset of the item relative to the start of the "scrollable container", `bottom` is the top offset of the item's bottom edge relative to the start of the "scrollable container", `height` is the item's height. -->

* `updateLayout()` — (advanced) Triggers a re-layout of `VirtualScroller`. It's what's called every time on page scroll or window resize. You most likely won't ever need to call this method manually. Still, it can be called manually when the list's top position changes not as a result of scrolling the page or resizing the window. For example, if some DOM elements above the list are removed (like a closeable "info" panel) or collapsed (like an "accordion" panel), then the list's top position changes, which means that now some of the previoulsy shown items might go off screen, and the user might be seeing a blank area where items haven't been rendered yet because they were off-screen during the previous `VirtualScroller` layout. `VirtualScroller` automatically performs a layout only on page scroll or window resize; in all other cases, when layout needs to be re-run, call it manually via this instance method.
</details>

## DOM

`virtual-scroller/dom` component implements a `VirtualScroller` in a standard [Document Object Model](https://en.wikipedia.org/wiki/Document_Object_Model) environment (a web browser).

Here's an example of using `virtual-scroller/dom` component (it's basically the source code for the [DOM demo](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html)).

```js
import VirtualScroller from 'virtual-scroller/dom'

const messages = [
  {
    username: ...,
    date: ...,
    text: ...
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

// For "Single Page Apps":
// router.onPageUnload(virtualScroller.stop)
```
<details>
<summary>Show the list of DOM <code>VirtualScroller</code> arguments and options.</summary>

#####

DOM `VirtualScroller` constructor takes arguments:

* `container` — Items list container DOM `Element`.
* `items` — The items list.
* `renderItem(item)` — Renders an `item` as a DOM `Element`.
* `options` — `VirtualScroller` options.

Additional `options`:

<!-- * `onMount()` — Is called before `VirtualScroller.onMount()` is called. -->

* `onItemUnmount(itemElement)` — Is called after a `VirtualScroller` item DOM `Element` is unmounted. Can be used to add DOM `Element` ["pooling"](https://github.com/ChrisAntaki/dom-pool#what-performance-gains-can-i-expect).
</details>

#####

<details>
<summary>Show the list of DOM <code>VirtualScroller</code> instance methods.</summary>

#####

* `setItems(items, options)` — A proxy for the corresponding `VirtualScroller` method.

* `onItemHeightChange(i)` — A proxy for the corresponding `VirtualScroller` method.

* `onItemStateChange(i, itemState)` — A proxy for the corresponding `VirtualScroller` method.

<!-- * `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method. -->

* `stop()` — A proxy for the corresponding `VirtualScroller` method.
</details>

## React

`virtual-scroller/react` component implements a `VirtualScroller` in a [React](https://reactjs.org/) environment.

Here's an example of using `virtual-scroller/react` component (it's basically the source code for the [React demo](https://catamphetamine.gitlab.io/virtual-scroller)).

```js
import React from 'react'
import PropTypes from 'prop-types'
import VirtualScroller from 'virtual-scroller/react'

function Messages({ messages }) {
  return (
    <VirtualScroller
      items={messages}
      itemComponent={Message}
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

function Message({ children: message }) {
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

Message.propTypes = {
  children: message.isRequired
}
```

<details>
<summary>Show the list of React <code>&lt;VirtualScroller/&gt;</code> properties.</summary>

#####

* `items` — The items list.

* `itemComponent` — List item component. For best performance, make sure it's a `React.PureComponent` or a `React.memo()`, otherwise it'll be re-rendering as the user scrolls and new items get shown or older ones get hidden.

* `itemComponentProps: object` — (optional) The props passed to `itemComponent`.

* `as` — A component used as a container for the list items. Is `"div"` by default.

* `estimatedItemHeight: number` — (optional) The `estimatedItemHeight` option of `VirtualScroller` class.

* `bypass: boolean` — (optional) The `bypass` option of `VirtualScroller` class.

* `preserveScrollPositionOnPrependItems: boolean` — (optional) The `preserveScrollPositionOnPrependItems` option of `VirtualScroller.setItems()` method.

* `measureItemsBatchSize: number` — (optional) The `measureItemsBatchSize` option of `VirtualScroller`.

* `getColumnsCount(): number` — (optional) The `getColumnsCount()` option of `VirtualScroller`.

<!-- * `onMount()` — (optional) Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. -->

* `getItemId(item): any` — (optional) The `getItemId` option of `VirtualScroller` class. The React component also uses it as a source for a React `key` for rendering an `item`. If `getItemId()` is not supplied, then item `key`s are autogenerated from a random-generated prefix (that changes every time `items` are updated) and an `item` index. Can be used to prevent `<VirtualScroller/>` from re-rendering all visible items every time `items` property is updated.

* `onItemInitialRender(item)` — (optional) The `onItemInitialRender` option of `VirtualScroller` class.

* `shouldUpdateLayoutOnScreenResize(event)`  — (optional) The `shouldUpdateLayoutOnScreenResize` option of `VirtualScroller` class.

* `initialState: object` — (optional) The initial state for `VirtualScroller`: the `state` option of `VirtualScroller`. For example, can be used to quicky restore the list on "Back" navigation.

* `initialCustomState: object` — (advanced) (optional) The initial "custom" state for `VirtualScroller`: the `customState` option of `VirtualScroller`. It can be used to initialize the "custom" part of `VirtualScroller` state in cases when `VirtualScroller` state is used to store some "custom" list state.

* `onStateChange(newState: object, prevState: object)` — (optional) Is called whenever `VirtualScroller` `state` is updated (including setting the initial `state`). For example, can be used to keep `VirtualScroller` `state` copy in an instance variable and later in `componentWillUnmount()` persist it somewhere in global application state for quickly restoring it later on "Back" navigation:

```js
import {
  getVirtualScrollerState,
  setVirtualScrollerState
} from './globalState'

class Example extends React.Component {
  componentWillUnmount() {
    saveVirtualScrollerState(this.virtualScrollerState)
  }
  render() {
    return (
      <VirtualScroller
        items={...}
        itemComponent={...}
        state={hasUserNavigatedBack ? getVirtualScrollerState() : undefined}
        onStateChange={state => this.virtualScrollerState = state}/>
    )
  }
}
```
</details>

#####

<details>
<summary>Show the list of properties passed to <code>itemComponent</code>.</summary>

#####

* `children` — The list item (an element of the `items` array).

* `state` — (advanced) List item element state. If a list item element renders differently depending on some "state" then that state should be "managed" (stored and later restored) as the list item becomes hidden and later visible again. See `onStateChange` property description.

* `onStateChange(newItemState)` — (advanced) Can be called to save the list item element state when it changes. The need for saving and restoring list item element state arises because item elements get unmounted as they go off screen. For example, consider a social network feed where feed items (posts) can be expanded or collapsed via a "Show more"/"Show less" button. Suppose a user clicks a "Show more" button on a post resulting in that post expanding in height. Then the user scrolls down and since the post is no longer visible it gets unmounted. Since no state is preserved by default, when the user scrolls back up and the post gets mounted again, its previous state will be lost and it will render as a collapsed post instead of an expanded one, resulting in a perceived "jump" of page content by the difference in height of the post being expanded and collapsed. To prevent that, define a "state" of an item element — for example, `{ expanded: true }` — and then call `onStateChange(newState)` every time the item element state changes, and read that state from the `state` property when rendering the item element. Calling `onStateChange()` simply updates the item element `state`, and doesn't re-render the item element: it's just a proxy for `VirtualScroller.onItemStateChange(i, itemState)`.

* `onHeightChange()` — (advanced) Call this function whenever the item element height changes. In the example above, `onHeightChange()` should be called when a user clicks a "Show more"/"Show less" button because that results in a change of the item element's height, so `VirtualScroller` should re-measure it in order for its internal calculations to stay correct. This is simply a proxy for `VirtualScroller.onItemHeightChange(i)`.
</details>

#####

<details>
<summary>Show the list of React <code>&lt;VirtualScroller/&gt;</code> instance methods.</summary>

#####

* `renderItem(i)` — Calls `.forceUpdate()` on the `itemComponent` instance for the item with index `i`. Does nothing if the item isn't currently rendered. Is only supported for `itemComponent`s that are `React.Component`s. The `i` item index argument could be replaced with the item object itself, in which case `<VirtualScroller/>` will find the index of the item by itself.

<!-- * `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method. -->

* `updateLayout()` — A proxy for the corresponding `VirtualScroller` method.
</details>

## Rendering Engine

`VirtualScroller` is written in such a way that it supports any type of a rendering engine, not just DOM. For example, it could support something like React Native or `<canvas/>`: for that, someone would have to write custom versions of [`Screen.js`](https://gitlab.com/catamphetamine/virtual-scroller/-/blob/master/source/DOM/Screen.js) and [`ScrollableContainer.js`](https://gitlab.com/catamphetamine/virtual-scroller/-/blob/master/source/DOM/ScrollableContainer.js), and then instruct `VirtualScroller` to use those instead of the default ones by passing custom `engine` object when constructing a `VirtualScroller` instance:

```js
import VirtualScroller from 'virtual-scroller'

import Container from './Container'
import ScrollableContainer from './ScrollableContainer'

new VirtualScroller(getItemsContainerElement, items, {
  scrollableContainer,
  engine: {
    createItemsContainer(getItemsContainerElement) {
      return new Container(getItemsContainerElement)
    },
    createScrollableContainer(scrollableContainer, getItemsContainerElement) {
      return new ScrollableContainer(scrollableContainer, getItemsContainerElement)
    }
  },
  ...
})
```

`getItemsContainerElement()` function would simply return a list "element", whatever that could mean. The concept of an "element" is "something, that can be rendered", so it could be anything, not just a DOM Element. Any operations with "elements" are done either in `Container.js` or in `ScrollableContainer.js`: `Container.js` defines the operations that could be applied to the list "container", or its items, such as getting its height or getting an items' height, and `ScrollableContainer.js` defines the operations that could be applied to a "scrollable container", such as getting its dimensions, listening for "resize" and "scroll" events, controlling scroll position, etc.

## Dynamically Loaded Lists

All previous examples described cases with a static `items` list. When there's a need to update the `items` list dynamically, one can use `virtualScroller.setItems(newItems)` instance method. For example, when the user clicks "Show previous items" button, the `newItems` should be `previousItems.concat(currentlyShownItems)`, and when the user clicks "Show next items" button, the `newItems` should be `currentlyShownItems.concat(nextItems)`.

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

When the container width changes, all items' heights must be recalculated because some CSS [`@media()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries) rules might have been added or removed. If the list currently shows items starting from the `N`-th one, then all `N - 1` previous items have to be remeasured. But they can't be remeasured until rendered again, so `VirtualScroller` snapshots those items' heights before the resize, and then uses those snapshotted heights until the items are re-measured when they become visible again as the user scrolls up.

Also, when such snapshotted upper items get re-rendered and re-measured, the scroll position has to be corrected to avoid ["content jumping"](https://css-tricks.com/content-jumping-avoid/).

<details>
<summary>Correcting scroll position though doesn't seem to work in a particular case when using Chrome web browser on a desktop</summary>

#####

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

Also, pressing the "Home" key wouldn't scroll up past the "prerender margin", which is equal to the screen height by default. The reason is the same: applying scroll position correction while the "Home" key is pressed cancels the effect of the "Home" button.

A possible workaround for those bugs would be postponing scroll position correction until the user stops scrolling, and instead change `margin-bottom` of some "spacer" element at the top of the list (or maybe even before the list). When the user stops scrolling, the scroll position would get corrected by the value of `margin-bottom` of that "spacer" element, after which the `margin-bottom` value on that "spacer" element would be reset. But this type of a workaround would only work in a DOM environment because it requires the support of "negative" margin.

For now, I don't see it as a bug that would be worth fixing. The user could just refresh the page, or not scroll up at all because they've already seen that content.
</details>

#####

The "before resize" snapshot is stored in `VirtualScroller` state in `beforeResize` object: `itemHeights: number[]`, `verticalSpacing: number`, `columnsCount: number`.

### `<tbody/>`

Due to the [inherent limitations](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) of the `<tbody/>` HTML tag, when used as a container for the list items, a workaround involving CSS variables has to be used, and CSS variables aren't supported in Internet Explorer, so using a `<tbody/>` as a list items container won't work in Internet Explorer: in such case, `VirtualScroller` renders in "bypass" mode (render all items).

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

The sidebar is styled as `position: fixed`, but until the page styles have been applied it's gonna be a regular `<div/>` meaning that `<main/>` will be rendered below the sidebar causing it to be offscreen and so the list will only render the first item. Then, the page styles are loaded and applied and the sidebar is now `position: fixed` so `<main/>` is now rendered at the top of the page but `VirtualScroller`'s `.render()` has already been called and it won't re-render until the user scrolls or the window is resized.

This type of a bug doesn't occur in production, but it can appear in development mode when using Webpack. The workaround `VirtualScroller` implements for such cases is calling `.getBoundingClientRect()` on the list container DOM element periodically (every second) to check if the `top` coordinate has changed as a result of CSS being applied: if it has then it recalculates the shown item indexes and re-renders.
</details>

## Debug

Set `window.VirtualScrollerDebug` to `true` to output debug messages to `console`.

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

## GitHub

On March 9th, 2020, GitHub, Inc. silently [banned](https://medium.com/@catamphetamine/how-github-blocked-me-and-all-my-libraries-c32c61f061d3) my account (erasing all my repos, issues and comments) without any notice or explanation. Because of that, all source codes had to be promptly moved to GitLab. The [GitHub repo](https://github.com/catamphetamine/virtual-scroller) is now only used as a backup (you can star the repo there too), and the primary repo is now the [GitLab one](https://gitlab.com/catamphetamine/virtual-scroller). Issues can be reported in any repo.

## License

[MIT](LICENSE)