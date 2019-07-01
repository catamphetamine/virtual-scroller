# VirtualScroller

An open-source implementation of Twitter's [`VirtualScroller`](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) component.

Also includes a [React](#react) component for those who're using React.

## Demo

DOM (no frameworks):

* [Basic](https://catamphetamine.github.io/virtual-scroller/index-dom.html)
* [Dynamically loaded](https://catamphetamine.github.io/virtual-scroller/index-dom.html?dynamic=✓)

React:

* [Basic](https://catamphetamine.github.io/virtual-scroller/)
* [Dynamically loaded](https://catamphetamine.github.io/virtual-scroller/?dynamic=✓)

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

Go to the [demo](https://catamphetamine.github.io/virtual-scroller) page, open Developer Tools ("Elements" tab), find `<div id="root"/>` element, expand it, see `<div id="messages"/>` element, expand it and observe the changes to it while scrolling the page.

List items can also have inter-item spacing via `margin-top` / `margin-bottom` or `border-top` / `border-bottom`, see the [Gotchas](#gotchas) section for more details on how to do that properly.

## Install

```
npm install virtual-scroller --save
```

If you're not using a bundler then use a [standalone version from a CDN](#cdn).

## Use

The default export is the `VirtualScroller` utility class. It implements the core logic of a `VirtualScroller` component and can be used for building a `VirtualScroller` component for any UI framework. [`virtual-scroller/dom`](#dom) and [`virtual-scroller/react`](#react) are both built upon it so this `VirtualScroller` utility class is a low-level core and is meant to be used by UI framework library authors and not by the end users — the end users should use high-level components like [`virtual-scroller/dom`](#dom) (for pure JS) and [`virtual-scroller/react`](#react) (for React).

```js
import VirtualScroller from 'virtual-scroller'

new VirtualScroller(
  getContainer,
  items,
  options
)
```

* `getContainer()` function should return the "container" DOM Element where the list items will be rendered to.
* `items` is the list of items (is only used to get items count).
* `options` is an optional argument.

Available `options`:

* `estimatedItemHeight` — Is used for the initial render of the list: determines how many list items are rendered initially to cover the screen height plus some extra vertical margin for future scrolling. If not set then the list first renders just the first item, measures it, and then assumes it to be the `estimatedItemHeight` from which it calculates how many items to show on the second render pass to fill the screen height plus some extra vertical margin for future scrolling. Therefore, this setting is only for the initial render minor optimization and is not required.
<!--
* `margin` — Renders items which are outside of the screen by the amount of this "margin". Is the screen height by default: seems to be the optimal value for "Page Up" / "Page Down" navigation and optimized mouse wheel scrolling.
-->
* `initialState` — The initial state for `VirtualScroller`. Can be used, for example, to quicky restore the list on "Back" navigation.
* `getState()` — Returns `VirtualScroller` `state`. Is used for React `VirtualScroller` component implementation.
* `setState()` — Stores `VirtualScroller` `state` (including setting the initial `state`). The `state` must reflect what's currently rendered on screen. Is used for React `VirtualScroller` component implementation.
* `onStateChange(newState, prevState)` — Is called whenever `VirtualScroller` `state` is updated (including setting the initial `state`) if `getState()` and `setState()` properties aren't defined.
* `onLastSeenItemIndexChange(newLastSeenItemIndex, previousLastSeenItemIndex)` — Can be used to track the last "seen" item index. For example, consider a list of items that must be somehow preprocessed before being rendered and such preprocessing takes some time. In this case instead of preprocessing the whole list of items upfront a developer could only preprocess the items as they're being rendered. `onLastSeenItemIndexChange()` is called initially when a `VirtualScroller` instance is created with `previousLastSeenItemIndex` being `-1` (including the cases when `initialState` is passed).
<!-- * `bypass` — Set to `true` to disable the "virtual scroller" behavior: it will (eventually) render the entire list on mount and won't hide items that go offscreen as the user scrolls. -->

`VirtualScroller` class instance provides methods:

* `onMount()` — Should be called when the `VirtualScroller` component is "mounted" (rendered) on a page.
* `onUpdate()` — Is only used when `getState()` and `setState()` are supplied: should be called after `setState()` updates the page. Is used for React `VirtualScroller` component implementation.
* `onUnmount()` — Should be called when the `VirtualScroller` component is "unmounted" (removed) from the page.
* `getState()` — Returns `VirtualScroller` state. Is used for React `VirtualScroller` component implementation.
* `onItemStateChange(i, itemState)` — Can be used to update a list item's state. Is used in React `VirtualScroller` component  for preserving the state of components which are to be hidden for later restoring their state when they're visible again. For example, consider an "Expand YouTube Video" button: the video must stay expanded as the item is "unmounted" when it's no longer visible and then re-"mounted" when it's visible again.
* `onItemHeightChange(i)` — Can be called whenever a list item's height changes. For example, when a user clicks "Expand"/"Collapse" button. This allows `VirtualScroller` to re-measure the item's height and re-render correctly (until all browsers implement [Resize Observer](https://caniuse.com/#search=Resize%20Observer)). This is only required when an item shrinks in height. For example, consider a post with an "Expand"/"Collapse" button: when such post is expanded the next posts in the feed might not be visible yet but if a user clicks the "Collapse" button the post is collapsed and the next posts become visible but they're not yet rendered because `VirtualScroller` didn't render them previously due to them being invisible. Calling `onItemHeightChange(i)` in such case would make `VirtualScroller` re-measure the collapsed post height and re-calculate the layout.
* `updateItems(newItems, options)` — Updates `VirtualScroller` `items`. For example, can be used to prepend or append new items to the list. See [Dynamically Loaded Lists](#dynamically-loaded-lists) section for more details.

`VirtualScroller` state provides properties:

* `firstShownItemIndex` — The index of the first item to render.
* `lastShownItemIndex` — The index of the last item to render.
* `beforeItemsHeight` — The `padding-top` which should be applied to the "container" element.
* `afterItemsHeight` — The `padding-bottom` which should be applied to the "container" element.
* `items` — The list of items (can be updated via [`.updateItems()`](#dynamically-loaded-lists)).
* `itemStates` — The list of item states.
* `itemHeights` — A list of measured item heights. If an item's height hasn't been measured yet then it's height is `undefined`.
* `itemSpacing` — Inter-item spacing. If it hasn't been measured yet then it's `undefined`.

### DOM

This is an example of using `virtual-scroller/dom` component. It's the source code of the [DOM demo](https://catamphetamine.github.io/virtual-scroller/index-dom.html).

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
// router.onPageUnload(virtualScroller.onUnmount)
```

`VirtualScroller` constructor takes arguments:

* `container` — Items list container DOM `Element`.
* `items` — The items list.
* `renderItem(item)` — Renders an `item` as a DOM `Element`.
* `options` — `VirtualScroller` options.

`VirtualScroller` instance provides methods:

* `updateItems(items, options)` — A proxy for the corresponding `VirtualScroller` method.
* `onItemHeightChange(i)` — A proxy for the corresponding `VirtualScroller` method.
* `onItemStateChange(i, itemState)` — A proxy for the corresponding `VirtualScroller` method.
* `onLastSeenItemIndexChange(newLastSeenItemIndex, previousLastSeenItemIndex)` — A proxy for the corresponding `VirtualScroller` method.

Additional `options`:

* `onMount` — Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. Can be used in advanced cases: for example, to restore page scroll Y position for the corresponding `VirtualScroller` `state` on "Back" navigation.

### React

This is an example of using the React `virtual-scroller/react` component. It's the source code of the [React demo](https://catamphetamine.github.io/virtual-scroller).

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

`<VirtualScroller/>` component receives properties:

* `items` — The items list.
* `itemComponent` — List item component. Receives the list item as the `children` property. Can optionally receive `state` and `onSaveState()` properties for saving list item state before unmounting it and then restoring that state after the item is re-mounted (for example, this supports "Show more" buttons, "Expand YouTube video" buttons, etc).
* `itemComponentProps` — (optional) The props passed to `itemComponent`.
* `estimatedItemHeight` — (optional) The `estimatedItemHeight` option of `VirtualScroller` class.
* `onMount` — (optional) Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. Can be used in advanced cases: for example, to restore page scroll Y position for the corresponding `VirtualScroller` `state` on "Back" navigation.
* `onLastSeenItemIndexChange(newLastSeenItemIndex, previousLastSeenItemIndex)` — (optional) The `onLastSeenItemIndexChange` option of `VirtualScroller` class.
<!-- * `bypass` — (optional) The `bypass` option of `VirtualScroller` class. -->
* `initialState` — (optional) The initial state for `VirtualScroller`. For example, can be used to quicky restore the list on "Back" navigation.
* `onStateChange(newState, prevState)` — (optional) Can be called when `VirtualScroller` `state` is updated (including setting the initial `state`). For example, can be used to keep `VirtualScroller` `state` copy in an instance variable and later in `componentWillUnmount()` persist it somewhere in global application state for quickly restoring it later on "Back" navigation:

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

* `state` — Item's state. Can be used for storing and then restoring the state of components which are about to be shown again after being previously hidden. For example, consider a post with an "Expand YouTube Video" button. If a user clicks the button the post is expanded and its height changes. Then the user scrolls down until the post is no longer visible and so it's no longer rendered. Then the user scrolls back up and the post is visible again and so it's rendered again. If the "Expand YouTube Video" state wasn't preserved then the list items would "jump" for the expanded minus non-expanded height difference. To avoid that, some `{ videoExpanded: true }` `state` could be passed to the post component which would make it auto-expand the video on mount and so the list items wouldn't "jump". For that, `onStateChange({ videoExpanded: true })` would have to be called when the user clicks the "Expand YouTube Video" button.
* `onStateChange(itemState)` — A proxy for `VirtualScroller.onItemStateChange(i, itemState)`. Call this function to update item's `state`.
* `onHeightChange()` — A proxy for `VirtualScroller.onItemHeightChange(i)`. Call this function to re-measure the item if it shrinks in height.

`<VirtualScroller/>` component instance provides methods:

* `updateItem(i)` — Calls `.forceUpdate()` on the `itemComponent` instance for item with index `i`. Does nothing if the item isn't rendered.

## Dynamically Loaded Lists

The previous examples showcase a static `items` list. For cases when new items are loaded when the user clicks "Show previous" / "Show next" buttons `virtualScroller.updateItems(newItems)` method can be used where `newItems` will be `previousItems.concat(items)` for "Show previous" button and `items.concat(nextItems)` for "Show next" button. `virtual-scroller/react` will automatically call `.updateItems(newItems)` when new `items` property is passed, and `virtual-scroller/dom` provides a manual `.updateItems(newItems)` method same as `VirtualScroller`.

<!--
`virtualScroller.updateItems(newItems)` also receives an optional second `options` argument having shape `{ state }` where `state` can be used for updating "custom state" previously set in `getInitialState(customState)` and can be an `object` or a function `(previousState, { prependedCount, appendedCount }) => object`. If the items update is not incremental (i.e. if `newItems` doesn't contain previous `items`) then both `prependedCount` and `appendedCount` will be `undefined`.
-->

Also, one can use [`on-scroll-to`](https://github.com/catamphetamine/on-scroll-to) library to render a "Load more items on scroll down" component for "infinite scroll" lists.

## Gotchas

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

### Search, focus management.

Due to offscreen list items not being rendered native browser features like "Find on page", moving focus through items via `Tab` key, screen reader announcement and such won't work. A workaround for "search on page" is adding a custom "🔍 Search" input field that would filter items by their content and then call `VirtualScroller.updateItems()`.

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

## License

[MIT](LICENSE)