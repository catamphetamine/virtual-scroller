# VirtualScroller

An open-source implementation of Twitter's [`VirtualScroller`](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) component: a component for efficiently rendering large lists of *variable height* items. Automatically measures items as they're rendered and supports items of variable height. Also includes a [React](#react) component for those who're using React.

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

It works by measuring each list item's height as it's being rendered and then as the user scrolls it hides the items which are no longer visible and shows the now-visible items as they're scrolled to. The hidden items on top are compensated by setting `padding-top` on the container, and the hidden items on the bottom are compensated by setting `padding-bottom` on the container. The component listens to `scroll` / `resize` events and re-renders the currently visible items as the user scrolls (or if the browser window is resized).

Go to the [demo](https://catamphetamine.gitlab.io/virtual-scroller) page, open Developer Tools ("Elements" tab), find `<div id="root"/>` element, expand it, see `<div id="messages"/>` element, expand it and observe the changes to it while scrolling the page.

List items can also have inter-item spacing via `margin-top` / `margin-bottom` or `border-top` / `border-bottom`, see the [Gotchas](#gotchas) section for more details on how to do that properly.

## Install

```
npm install virtual-scroller --save
```

If you're not using a bundler then use a [standalone version from a CDN](#cdn).

## Core

The default export is the low-level `VirtualScroller` class: it implements the core logic of a `VirtualScroller` component and can be used for building a `VirtualScroller` component for any UI framework. Hence, it's not meant to be used in applications directly: instead, see the high-level components exported from [`virtual-scroller/dom`](#dom) and [`virtual-scroller/react`](#react) packages.

```js
import VirtualScroller from 'virtual-scroller'

const virtualScroller = new VirtualScroller(getContainerElement, items, options)

// Start listening to scroll events.
virtualScroller.listen()

// Stop listening to scroll events.
virtualScroller.stop()
```

* `getContainerElement()` function returns a "container" DOM Element where the list will be rendered.
* `items` is the list of items.
* `options` is the list of options.

### State

`VirtualScroller` works by updating its `state` as the user scrolls the page. The `state` provides the calculations on which items should be rendered depending on the scroll position. `VirtualScroller` itself doesn't perform any rendering: a developer must either supply `getState`/`setState` options or `onStateChange` option (or both), and those functions are gonna be the ones actually rendering the list based on the `VirtualScroller` `state`.

The main `state` properties are:

* `items: any[]` — The list of items (can be updated via [`.setItems()`](#dynamically-loaded-lists)).

* `firstShownItemIndex: number` — The index of the first item that should be rendered.

* `lastShownItemIndex: number` — The index of the last item that should be rendered.

* `beforeItemsHeight: number` — The `padding-top` which should be applied to the "container" element: it emulates all items before `firstShownItemIndex` as if they were rendered.

* `afterItemsHeight: number` — The `padding-bottom` which should be applied to the "container" element: it emulates all items after `lastShownItemIndex` as if they were rendered.

The following `state` properties are only used for saving and restoring `VirtualScroller` `state`, and normally shouldn't be accessed:

* `itemStates: object?[]` — A list of item states.

* `itemHeights: number?[]` — A list of measured item heights. If an item's height hasn't been measured yet then it's height is `undefined`.

* `verticalSpacing: number?` — Vertical item spacing. Is `undefined` until at least two rows of items have been rendered.

* `columnsCount: number?` — The count of items in a row. Is `undefined` if no `getColumnsCount()` parameter has been passed to `VirtualScroller`.

* `scrollY: number?` — The current page scroll position (page vertical scroll offset). If initial `state` is passed to `VirtualScroller`, then the page will be scrolled to `state.scrollY` on `.render()`.

### Example

Here's an example of implementing [`virtual-scroller/dom`](#dom) on top of the low-level `VirtualScroller` class _(advanced)_:

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

### Options

Available `VirtualScroller` `options`:

* `estimatedItemHeight: number` — Is used for the initial render of the list: determines how many list items are rendered initially to cover the screen height plus some extra vertical margin for future scrolling. If not set then the list first renders just the first item, measures it, and then assumes it to be the `estimatedItemHeight` from which it calculates how many items to show on the second render pass to fill the screen height plus some extra vertical margin for future scrolling. Therefore, this setting is only for the initial render minor optimization and is not required.

<!--
* `margin` — Renders items which are outside of the screen by the amount of this "margin". Is the screen height by default: seems to be the optimal value for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
-->

* `state: object` — The initial state for `VirtualScroller`. Can be used, for example, to quicky restore the list when it's re-rendered on "Back" navigation.

* `customState: object` — (advanced) The initial "custom" state for `VirtualScroller`. It can be used to initialize the "custom" part of `VirtualScroller` state in cases when `VirtualScroller` state is used to store some "custom" list state.

* `getState(): object` — (advanced) By default, `VirtualScroller` manages `state` internally by storing it in an instance variable. For more control, the `state` could be managed externally, in which case a developer should supply `getState`/`setState` options, in which case `getState` should return the externally stored `VirtualScroller` `state`. React `VirtualScroller` component implementation uses this option.

* `setState(newState: object, { willUpdateState, didUpdateState })` — (advanced) By default, `VirtualScroller` manages `state` internally by storing it in an instance variable. For more control, the `state` could be managed externally, in which case a developer should supply `getState`/`setState` options, in which case `setState` should update the externally stored `VirtualScroller` `state` (including setting the initial `state`). `setState` must also call two functions: `willUpdateState(newState, prevState)` right before the state is updated and `didUpdateState(prevState)` right after the state is updated. The list should be re-rendered as part of either `setState` or `onStateChange`. React `VirtualScroller` component implementation uses this option.

* `onStateChange(newState: object, prevState: object?)` — Is called whenever `VirtualScroller` `state` is updated (including setting the initial `state`). A developer must either supply `getState`/`setState` options or `onStateChange` option (or both). The list should be re-rendered as part of either `setState` or `onStateChange`.

* `scrollableContainer: Element` — (advanced) If the list is being rendered in a "scrollable container" (for example, if one of the parent elements of the list is styled with `max-height` and `overflow: auto`), then passing the "scrollable container" DOM Element is required for correct operation. *This feature is considered [experimental](https://github.com/catamphetamine/virtual-scroller/issues/8).* The width and height of the `scrollableContainer` shouldn't change unless window is resized.

* `bypass: boolean` — Pass `true` to turn off `VirtualScroller` behavior and just render the full list of items.

* `getItemId(item)` — (advanced) When `items` are dynamically updated via `.setItems()`, `VirtualScroller` detects an "incremental" update by comparing "new" and "old" item ["references"](https://codeburst.io/explaining-value-vs-reference-in-javascript-647a975e12a0): this way, `VirtualScroller` can understand that the "new" `items` are (mostly) the same as the "old" `items` when some items get prepended or appended to the list, in which case it doesn't re-render the whole list from scratch, but rather just renders the "new" items that got prepended or appended. Sometimes though, some of the "old" items might get updated: for example, if `items` is a list of comments, then some of those comments might get edited in-between the refreshes. In that case, the edited comment object reference should change in order to indicate that the comment's content has changed and that the comment should be re-rendered (at least that's how it has to be done in React world). At the same time, changing the edited comment object reference would break `VirtualScroller`'s "incremental" update detection, and it would re-render the whole list of comments from scratch, which is not what it should be doing in such cases. So, in cases like this, `VirtualScroller` should have some way to understand that the updated item, even if its object reference has changed, is still the same as the old one, so that it doesn't break "incremental" update detection. For that, `getItemId(item)` parameter could be passed, which `VirtualScroller` would use to compare "old" and "new" items (instead of the default "reference equality" check), and that would fix the "re-rendering the whole list from scratch" issue. It can also be used when `items` are fetched from an external API, in which case all item object references change on every such fetch.

* `onItemInitialRender(item)` — Is called for each item the first time it's rendered. Is guaranteed to be called at least one time for each item rendered, though could also be called multiple times. For an example of using such feature, consider a list of items that must be somehow preprocessed (parsed, enhanced, etc) before being rendered, and such preprocessing puts some load on the CPU (and therefore takes some time). In such case, instead of preprocessing the whole list of items upfront, a developer could preprocess the items as they're being rendered thereby eliminating any associated lag/freezing and draining less battery.

* `preserveScrollPositionOfTheBottomOfTheListOnMount: boolean` — (advanced) Set to `true` to preserve scroll position relative to the bottom of the list when it's first mounted. A possible use case: consider a forum thread only showing unread posts by default. If a user navigates to such thread, it could show "No new posts" message with a "Show previous" button above it. When the user clicks the "Show previous" button, a `<VirtualScroller/>` is mounted with a list of posts. If `preserveScrollPositionOfTheBottomOfTheListOnMount: true` is set, then, after the list of posts is shown, page scroll will be restored so that the bottom of the list remains on screen so that the user could start scrolling up to read the "previous" posts starting from the most recent ones to the oldest ones.

* `shouldUpdateLayoutOnWindowResize(event: Event): boolean`  — By default, `VirtualScroller` always performs a re-layout on window `resize` event. The `resize` event is not only triggered when a user resizes the window itself: it's also [triggered](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes) when the user switches into (and out of) fullscreen mode. By default, `VirtualScroller` performs a re-layout on all window `resize` events, except for ones that don't result in actual window width or height change, and except for cases when, for example, a video somewhere in a list is maximized into fullscreen. There still can be other "custom" cases: for example, when an application uses a custom "slideshow" component (rendered outside of the list DOM element) that goes into fullscreen when a user clicks a picture or a video in the list. For such "custom" cases `shouldUpdateLayoutOnWindowResize(event)` option / property can be specified.

* `measureItemsBatchSize: number` — (advanced) (experimental) Imagine a situation when a user doesn't gradually scroll through a huge list but instead hits an End key to scroll right to the end of such huge list: this will result in the whole list rendering at once (because an item needs to know the height of all previous items in order to render at correct scroll position) which could be CPU-intensive in some cases (for example, when using React due to its slow performance when initially rendering components on a page). To prevent freezing the UI in the process, a `measureItemsBatchSize` could be configured, that would limit the maximum count of items that're being rendered in a single pass for measuring their height: if `measureItemsBatchSize` is configured, then such items will be rendered and measured in batches. By default it's set to `100`. This is an experimental feature and could be removed in future non-major versions of this library. For example, the future React 17 will come with [Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) rendering engine that is said to resolve such freezing issues internally. In that case, introducing this option may be reconsidered.

* `getColumnsCount(container: ScrollableContainer): number` — (advanced) Provides support for ["grid"](#grid-layout) layout. The `container` argument provides a `.getWidth()` method.

`VirtualScroller` class instance provides methods:

* `listen()` — Starts `VirtualScroller` listening for scroll events. Should be called immediately after the list has been rendered on a page.

* `stop()` — Stops `VirtualScroller` listening for scroll events. Should be called when the list is about to be removed from the page. Once stopped, a `VirtualScroller` can't be restarted.

* `getState(): object` — Returns `VirtualScroller` state. Is used for React `VirtualScroller` component implementation.

<!-- * `willUpdateState(newState: object, prevState: object?)` — If custom `setState` is defined, then it must call `VirtualScroller`'s `.willUpdateState()` instance method right before updating the `state`. The `prevState` argument should be `undefined` when (and only when) setting initial `state`. -->
<!-- * `didUpdateState(prevState: object?)` — If custom `setState` is defined, then it must call `VirtualScroller`'s `.didUpdateState()` instance method right after updating the `state`. The `prevState` argument should be `undefined` when (and only when) setting initial `state`. -->

* `onItemHeightChange(i: number)` — Should be called whenever a list item's height changes: triggers a re-layout of `VirtualScroller`. This allows `VirtualScroller` to re-measure the new item's height and re-render correctly. Calling `onItemHeightChange()` manually could be replaced with detecting item height changes automatically via [Resize Observer](https://caniuse.com/#search=Resize%20Observer). For example, when a user clicks an "Expand"/"Collapse" button in a post. Calling `onItemHeightChange()` is only required when an item shrinks in height. For example, consider a post with an "Expand"/"Collapse" button: when such post is expanded the next posts in the feed might not be visible yet but if a user clicks the "Collapse" button the post is collapsed and the next posts become visible but they're not yet rendered because `VirtualScroller` didn't render them previously due to them being invisible. Calling `onItemHeightChange(i)` in such case would make `VirtualScroller` re-measure the collapsed post height and perform a re-layout.

* `onItemStateChange(i: number, itemState: object)` — Can be used to update a list item's state inside `VirtualScroller` state. For example, storing list item's state inside `VirtualScroller` state is used in React `VirtualScroller` component to preserve the state of list items that are unmounted due to being no longer visible: when they're visible again they're re-mounted and their state isn't lost. Calling `onItemStateChange()` doesn't trigger a re-layout of `VirtualScroller` because changing a list item's state doesn't necessarily mean a change of its height, so a re-layout isn't necessarily required. If a re-layout is required then call `onItemHeightChange(i)` manually. For example, consider a social network feed, each post optionally having an attachment. Suppose there's a post in the feed having a YouTube video attachment. The attachment is initially shown as a thumbnail that expands into an embedded YouTube player on click. If a user expands the video, then scrolls down so that the post with the video is unmounted, then scrolls back up so that the post with the video is re-mounted again, then the video should stay expanded (or maybe not, but you get the idea).

* `setItems(newItems: any[], options: object?)` — Updates `VirtualScroller` `items`. For example, it can be used to prepend or append new items to the list. See [Dynamically Loaded Lists](#dynamically-loaded-lists) section for more details. Available options: `preserveScrollPositionOnPrependItems: boolean` — Set to `true` to enable "restore scroll position after prepending new items" feature (should be used when implementing a "Show previous items" button).

* `getItemCoordinates(i: number): object` — Returns coordinates of item with index `i` relative to the document: `top` is the top offset of the item relative to the start of the document, `bottom` is the top offset of the item's bottom edge relative to the start of the document, `height` is the item's height.

* `updateLayout()` — (advanced) Triggers a re-layout of `VirtualScroller`. It's what's called every time on page scroll or window resize. You most likely won't ever need to call this method manually. Still, it can be called manually when the list's top position changes not as a result of scrolling the page or resizing the window. For example, if some DOM elements above the list are removed (like a closeable "info" panel) or collapsed (like an "accordion" panel) then the list's top position changes which means that now some of the previoulsy shown items might go off screen and the user might be seeing a blank area where items haven't been rendered yet because they were off-screen during the previous `VirtualScroller` layout. `VirtualScroller` automatically performs a layout only on page scroll or window resize; in all other cases, when layout needs to be re-run then call it manually via this instance method.

## DOM

This is an example of using `virtual-scroller/dom` component. It's the source code of the [DOM demo](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html).

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

DOM `VirtualScroller` constructor takes arguments:

* `container` — Items list container DOM `Element`.
* `items` — The items list.
* `renderItem(item)` — Renders an `item` as a DOM `Element`.
* `options` — `VirtualScroller` options.

Additional `options`:

<!-- * `onMount()` — Is called before `VirtualScroller.onMount()` is called. -->

* `onItemUnmount(itemElement)` — Is called after a `VirtualScroller` item DOM `Element` is unmounted. Can be used to add DOM `Element` ["pooling"](https://github.com/ChrisAntaki/dom-pool#what-performance-gains-can-i-expect).

DOM `VirtualScroller` instance provides methods:

* `setItems(items, options)` — A proxy for the corresponding `VirtualScroller` method.
* `onItemHeightChange(i)` — A proxy for the corresponding `VirtualScroller` method.
* `onItemStateChange(i, itemState)` — A proxy for the corresponding `VirtualScroller` method.
* `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method.
* `stop()` — A proxy for the corresponding `VirtualScroller` method.

## React

This is an example of using the React `virtual-scroller/react` component. It's the source code of the [React demo](https://catamphetamine.gitlab.io/virtual-scroller).

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

React `<VirtualScroller/>` component receives properties:

* `items` — The items list.
* `itemComponent` — List item component. Receives the list item as the `children` property. Can optionally receive `state` and `onSaveState()` properties for saving list item state before unmounting it and then restoring that state after the item is re-mounted (for example, this supports "Show more" buttons, "Expand YouTube video" buttons, etc). For best performance, make sure it's a `React.PureComponent` or a `React.memo()`, otherwise it'll be re-rendering as the user scrolls.
* `itemComponentProps: object` — (optional) The props passed to `itemComponent`.
* `as` — A component used as a container for the list items. Is `"div"` by default.
* `estimatedItemHeight: number` — (optional) The `estimatedItemHeight` option of `VirtualScroller` class.
* `bypass: boolean` — (optional) The `bypass` option of `VirtualScroller` class.
* `preserveScrollPositionOnPrependItems: boolean` — (optional) The `preserveScrollPositionOnPrependItems` option of `VirtualScroller.setItems()` method.
* `preserveScrollPositionOfTheBottomOfTheListOnMount: boolean` — (optional) The `preserveScrollPositionOfTheBottomOfTheListOnMount` option of `VirtualScroller`.
* `measureItemsBatchSize: number` — (optional) The `measureItemsBatchSize` option of `VirtualScroller`.
* `getColumnsCount(): number` — (optional) The `getColumnsCount()` option of `VirtualScroller`.
<!-- * `onMount()` — (optional) Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. -->
* `getItemId(item): any` — (optional) The `getItemId` option of `VirtualScroller` class. The React component also uses it as a source for a React `key` for rendering an `item`. If `getItemId()` is not supplied, then item `key`s are autogenerated from a random-generated prefix (that changes every time `items` are updated) and an `item` index. Can be used to prevent `<VirtualScroller/>` from re-rendering all visible items every time `items` property is updated.
* `onItemInitialRender(item)` — (optional) The `onItemInitialRender` option of `VirtualScroller` class.
<!-- * `shouldUpdateLayoutOnWindowResize(event)`  — (optional) The `shouldUpdateLayoutOnWindowResize` option of `VirtualScroller` class. -->
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

`itemComponent` receives properties:

* `children` — The item.
* `state` — Item's state. Can be used for storing and then restoring the state of components which are about to be shown again after being previously hidden. For example, consider a post with an "Expand YouTube Video" button. If a user clicks the button the post is expanded and its height changes. Then the user scrolls down until the post is no longer visible and so it's no longer rendered. Then the user scrolls back up and the post is visible again and so it's rendered again. If the "Expand YouTube Video" state wasn't preserved then the list items would "jump" for the expanded minus non-expanded height difference. To avoid that, some `{ videoExpanded: true }` `state` could be passed to the post component which would make it auto-expand the video on mount and so the list items wouldn't "jump". For that, `onStateChange({ videoExpanded: true })` would have to be called when the user clicks the "Expand YouTube Video" button.
* `onStateChange(itemState)` — A proxy for `VirtualScroller.onItemStateChange(i, itemState)`. Call this function to update item's `state`.
* `onHeightChange()` — A proxy for `VirtualScroller.onItemHeightChange(i)`. Call this function to re-measure the item if it shrinks in height.

React `<VirtualScroller/>` component instance provides methods:

* `renderItem(i)` — Calls `.forceUpdate()` on the `itemComponent` instance for item with index `i`. Does nothing if the item isn't rendered. Is only supported for `component`s that are `React.Component`s.
* `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method.
* `updateLayout()` — A proxy for the corresponding `VirtualScroller` method.

## Dynamically Loaded Lists

All previous examples described cases with a static `items` list. When there's a need to update the `items` list, one could use `virtualScroller.setItems(newItems)` instance method. For example, when the user clicks "Show previous items" button, the `newItems` should be set to `previousItems.concat(currentlyShownItems)`, and when the user clicks "Show next items" button, the `newItems` should be set to `currentlyShownItems.concat(nextItems)`.

When using `virtual-scroller/dom` component, a developer should call `.setItems(newItems)` instance method in order to update the items.

When using `virtual-scroller/react` React component, it calls `.setItems(newItems)` method automatically when new `items` property is passed.

The basic equality check (`===`) is used to intelligently compare `newItems` to the existing `items`. If a simple append and/or prepend operation is detected, then the list seamlessly transitions from the current state to the new state, preserving its state and scroll position. If, however, the items have been updated in such a way that it's not a simple append and/or prepend operation, then the entire list is rerendered from scratch, losing its state and resetting the scroll position. There're valid use cases for both situations.

For example, suppose a user navigates to a page where a list of `items: object[]` is shown using a `VirtualScroller`. When a user scrolls down to the last item in the list, a developer might want to query the database for the newly added items, and then show those new items to the user. In that case, the developer could send a query to the API with `afterId: number` parameter being the `id: number` of the last item in the list, and the API would then return a list of the `newItems: object[]` whose `id: number` is greater than the `afterId: number` parameter. Then, the developer would append the `newItems: object[]` to the `items: object[]`, and then call `VirtualScroller.setItems()` with the updated `items: object[]`, resulting in a "seamless" update of the list, preserving its state and scroll position.

Another example. Suppose a user navigates to a page where they can filter a huge list by a query entered in a search bar. In that case, when the user edits the query in the search bar, `VirtualScroller.setItems()` method is called with a list of filtered items, and the entire list is rerendered from scratch. In this case, it's ok to reset the `VirtualScroller` state and the scroll position.

<!--
`virtualScroller.setItems(newItems)` also receives an optional second `options` argument having shape `{ state }` where `state` can be used for updating "custom state" previously set in `getInitialState(customState)` and can be an `object` or a function `(previousState, { prependedCount, appendedCount }) => object`. If the items update is not incremental (i.e. if `newItems` doesn't contain previous `items`) then both `prependedCount` and `appendedCount` will be `undefined`.
-->

When new items are appended to the list, the page scroll position remains unchanged. Same's for prepending new items to the list: the scroll position of the page stays the same, resulting in the list "jumping" down when new items get prepended. To fix that, pass `preserveScrollPositionOnPrependItems: true` option to the `VirtualScroller`. When using `virtual-scroller/dom` component, pass that option when creating a new instance, and when using `virtual-scroller/react` React component, pass `preserveScrollPositionOnPrependItems` property.

For implementing "infinite scroll" lists, a developer could also use [`on-scroll-to`](https://gitlab.com/catamphetamine/on-scroll-to) component.

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

If any vertical `margin` is set on the list items then this may lead to the list items jumping by the value of that margin when scrolling. The reason is that when the first list item is rendered then there's no `padding-top` on the containing `<div/>` so the first item's margin ["collapses"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Mastering_margin_collapsing) with outer margins, but when the first item is no longer rendered the containing `<div/>` has `padding-top` to compensate for that which prevents list item margin from "collapsing" with outer margins. To fix that, don't set any `margin-top` on the first item of the list and don't set any `margin-bottom` on the last item of the list. An example of fixing margin for the first and the last items of the list:

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

When styling the first and the last items of the list via `:first-child` and `:last-child` one should also check that such styles don't change the item's height which means that one should not add any `border` or `padding` styles to `:first-child` and `:last-child` otherwise the list items will jump by that extra height while scrolling.

An example of a `:first-child`/`:last-child` style that will not work correctly with `VirtualScroller`:

```css
.list-item {
  border-bottom: 1px solid black;
}
.list-item:first-child {
  border-top: 1px solid black;
}
```

### `<tbody/>`

Due to the [inherent limitations](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) of the `<tbody/>` HTML tag, when used as a container for the list items, a workaround involving CSS variables has to be used, and CSS variables aren't supported in Internet Explorer, so using a `<tbody/>` as a list items container won't work in Internet Explorer: in such case, `VirtualScroller` renders in "bypass" mode (render all items).

### Search, focus management.

Due to offscreen list items not being rendered native browser features like "Find on page", moving focus through items via `Tab` key, screen reader announcement and such won't work. A workaround for "search on page" is adding a custom "🔍 Search" input field that would filter items by their content and then call `VirtualScroller.setItems()`.

### Only the first item is rendered on page load.

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

## GitHub

On March 9th, 2020, GitHub, Inc. silently [banned](https://medium.com/@catamphetamine/how-github-blocked-me-and-all-my-libraries-c32c61f061d3) my account (erasing all my repos, issues and comments) without any notice or explanation. Because of that, all source codes had to be promptly moved to GitLab. The [GitHub repo](https://github.com/catamphetamine/virtual-scroller) is now only used as a backup (you can star the repo there too), and the primary repo is now the [GitLab one](https://gitlab.com/catamphetamine/virtual-scroller). Issues can be reported in any repo.

## License

[MIT](LICENSE)