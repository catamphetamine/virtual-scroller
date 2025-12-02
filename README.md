# VirtualScroller

A universal open-source implementation of Twitter's [`VirtualScroller`](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) component: a component for efficiently rendering large lists of *variable height* items. Supports grid layout.

<!-- Automatically measures items as they're rendered and supports items of variable/dynamic height. -->

* For React users, it exports a [React](#react) component from `virtual-scroller/react`.
* For those who prefer "vanilla" DOM, it exports a [DOM](#dom) component from `virtual-scroller/dom`.
* For everyone else, it exports a ["core"](#core) component from `virtual-scroller`. The "core" component supports any type of UI "framework", or even any type of [rendering engine](#rendering-engine), not just DOM. Use it to create your own implementation for any UI "framework" or non-browser environment.

## Demo

[DOM](#dom) component

* [List](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html)
* [Paginated List](https://catamphetamine.gitlab.io/virtual-scroller/index-dom.html?pagination=✓)
* [List in a scrollable container](https://catamphetamine.gitlab.io/virtual-scroller/index-dom-scrollableContainer.html)
* [Table](https://catamphetamine.gitlab.io/virtual-scroller/index-dom-tbody.html)
* [Table in a scrollable container](https://catamphetamine.gitlab.io/virtual-scroller/index-dom-tbody-scrollableContainer.html)
* [Grid](https://catamphetamine.gitlab.io/virtual-scroller/index-dom-grid.html)
* [Paginated Grid](https://catamphetamine.gitlab.io/virtual-scroller/index-dom-grid.html?pagination=✓)

[React](#react) component

* [List](https://catamphetamine.gitlab.io/virtual-scroller/index-react.html)
* [Paginated List](https://catamphetamine.gitlab.io/virtual-scroller/index-react.html?pagination=✓)
* [List in a scrollable container](https://catamphetamine.gitlab.io/virtual-scroller/index-react-scrollableContainer.html)
* [Table](https://catamphetamine.gitlab.io/virtual-scroller/index-react-tbody.html)
* [Table in a scrollable container](https://catamphetamine.gitlab.io/virtual-scroller/index-react-tbody-scrollableContainer.html)
* [Grid](https://catamphetamine.gitlab.io/virtual-scroller/index-react-grid.html)
* [Paginated Grid](https://catamphetamine.gitlab.io/virtual-scroller/index-react-grid.html?pagination=✓)
* [List (using hook)](https://catamphetamine.gitlab.io/virtual-scroller/index-react-hook.html)
* [Paginated List (using hook)](https://catamphetamine.gitlab.io/virtual-scroller/index-react-hook.html?pagination=✓)

## Rationale

Rendering extremely long lists in HTML can be performance-intensive and could lead to slow page load times and wasting mobile device battery. For example, consider a "messenger" app that renders a list of a thousand comments. Depending on the user's device and the complexity of the message component, the full render cycle could be anywhere from 100 milliseconds to 1 second. That kind of a delay results in degradation of the percieved performance and could lead to the user not wanting to use the website or the application.

![A screen recording showing the poor responsiveness on Twitter's website before they used virtualization](https://cdn-images-1.medium.com/max/2600/1*mDPjaeBNhCAbEcbKV-IX3Q.gif)

Twitter was experiencing the same issues and in 2017 they completely redesigned their website with responsiveness and performance in mind using the latest performance-boosting techniques available at the time. Afterwards, they wrote an [article](https://medium.com/@paularmstrong/twitter-lite-and-high-performance-react-progressive-web-apps-at-scale-d28a00e780a3) where they briefly mentioned this:

> On slower devices, we noticed that it could take a long time for our main navigation bar to appear to respond to taps, often leading us to tap multiple times, thinking that perhaps the first tap didn’t register.
It turns out that mounting and unmounting large trees of components (like timelines of Tweets) is very expensive in React.
Over time, we developed a new infinite scrolling component called VirtualScroller. With this new component, we know exactly what slice of Tweets are being rendered into a timeline at any given time, avoiding the need to make expensive calculations as to where we are visually.

However, Twitter didn't share the code for their `VirtualScroller` component — unlike Facebook, Twitter doesn't share much of their code. This library is an attempt to create an open-source implementation of such `VirtualScroller` component for anyone to use in their projects.

<!-- There's also an ["RFC"](https://github.com/WICG/virtual-scroller) for a native `VirtualScroller` component where they try to formulate what is a `VirtualScroller` component and how it should behave. -->

## How it works

`VirtualScroller` works by measuring each list item's height. As soon as the total height of the list items surpasses the window height, it stops the rendering because the user won't see those other items anyway. The non-rendered items are replaced with an empty space: not-visible items at the top are replaced with `padding-top` on the list element, and not-visible items at the bottom are replaced with `padding-bottom` on the list element. Then it listens to `scroll` / `resize` events and re-renders the list when the user scrolls the page or when the browser window is resized.

To observe the whole process in real time, go to the [demo](https://catamphetamine.gitlab.io/virtual-scroller) page, open Developer Tools, switch to the "Elements" tab, find `<div id="messages"/>` element, expand it and observe how it changes while scrolling the page.

## Install

```
npm install virtual-scroller --save
```

Alternatively, one could include it on a web page [directly](#cdn) via a `<script/>` tag.

## Use

As it has been mentioned, this package exports three different components:

* For React framework — [`virtual-scroller/react`](#react)
* For "vanilla" DOM — [`virtual-scroller/dom`](#dom)
* For any other case ("core") — [`virtual-scroller`](#core)

Below is a description of each component.

## React

`virtual-scroller/react` exports a React component — `<VirtualScroller/>` — that implements a "virtual scroller" in a [React](https://reactjs.org/) environment.

The React component is based on the ["core"](#core) component, and it requires the following properties:

* `items` — an array of items.

* `itemComponent` — a React component that renders an item.

  * The `itemComponent` will receive properties:
    * `item` — The item object (an element of the `items` array). Use it to render the item.
    * `state` and `setState()` — Item component state management properties.
      * Use these instead of the standard `const [state, setState] = useState()`. The reason is that the standard `useState()` will always disappear when the item component is no longer rendered when it goes off-screen whereas this "special" state will always be preserved.
      <!-- * `state` — The item component's "state". -->
        <!-- * Curious readers may see the description of `itemStates` property of the `state` object in the ["core"](#core) component section. -->
      <!-- * `setState(newState)` — Sets the item component's "state". -->
        <!-- * Curious readers may see the description of `setItemState(item, newState)` function in the ["core"](#core) component section. -->
    * `onHeightDidChange()` — Call this function whenever the item's height changes, if it ever does. For example, if the item could be "expanded" and the user clicks that button. The reason for manually calling this function is because `<VirtualScroller/>` only bothers measuring the item's height when the items is initially rendered. After that, it just assumes that the item's height always stays the same and doesn't track it in any way. Hence, a developer is responsible for manually telling it to re-measure the item's height if it has changed for whatever reason.
      * When calling this function, do it immediately after the item's height has changed on the screen, i.e. do it in `useLayoutEffect()` hook.

  * As an optional performance optimization, it is advised to wrap the `itemComponent` with a [`React.memo()`](https://react.dev/reference/react/memo) function. It will prevent needless re-renders of the component when its props haven't changed (and they never do). The rationale is that all visible items get frequently re-rendered during scroll.

* `itemComponentProps: object` — (optional) any additional props for the `itemComponent`.

* `itemsContainerComponent` — a React component that will be used as a container for the items.
  * Must be either a simple string like `"div"` or a React component that "forwards" `ref` to the resulting `Element`.
  * Edge case: when list items are rendered as `<tr/>`s and the items container is a `<tbody/>`, the `itemsContainerComponent` must be `"tbody"`, otherwise it won't work correctly.

* `itemsContainerComponentProps: object` — (optional) any additional props for the `itemsContainerComponent`.

Code example:

#####

```js
import React from 'react'
import VirtualScroller from 'virtual-scroller/react'

function List({ items }) {
  return (
    <VirtualScroller
      items={items}
      itemComponent={ListItem}
      itemsContainerComponent="div"
    />
  )
}

function ListItem({ item }) {
  const { username, date, text } = item
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
```

<!--
import PropTypes from 'prop-types'

const item = PropTypes.shape({
  username: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  text: PropTypes.string.isRequired
})

List.propTypes = {
  items: PropTypes.arrayOf(item).isRequired
}

ListItem.propTypes = {
  item: item.isRequired
}

function App() {
  return (
    <List items=[{
      username: 'barackobama',
      date: new Date(),
      text: 'Hey hey people'
    }]/>
  )
}
-->

<details>
<summary>Available options (properties)</summary>

#####

<!-- Note: When passing any core `VirtualScroller` class options, only the initial values of those options will be applied, and any updates to those options will be ignored. That's because those options are only passed to the `VirtualScroller` base class constructor at initialization time. That means that none of those options should depend on any variable state or props. For example, if `getColumnsCount()` parameter was defined as `() => props.columnsCount`, then, if the `columnsCount` property changes, the underlying `VirtualScroller` instance won't see that change. -->

<!-- I guess that `style` property should be deprecated because it could potentially be dangerous
     due to potential conflicts with `VirtualScroller` styles. It currently isn't present anyway. -->
<!-- * `style: object` — Custom CSS style, except for `padding-top` or `padding-bottom`. -->

<!-- I guess that `className` property should be deprecated because it could potentially be dangerous
     due to potential conflicts with `VirtualScroller` styles. -->
<!-- * `className: string` — Custom CSS class name. -->

* `tbody: boolean` — When the list items container element is going to be a `<tbody/>`, it will have to use a special workaround in order for the `<VirtualScroller/>` to work correctly. To enable this special workaround, a developer could pass a `tbody: true` property. Otherwise, `<VirtualScroller/>` will only enable it when `itemsContainerComponent === "tbody"`.
  <!-- * There's no longer such option in the ["core"](#core) component because it's autodetected there. The reason why it can't always be autodetected in React is because of server-side rendering when there's no items container DOM element whose tag name could be examined to detect the use of a `<tbody/>` tag as an items container. -->
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `getColumnsCount(): number` — Returns the count of the columns.
  * This is simply a proxy for the ["core"](#core) component's `getColumnsCount` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `getInitialItemState(item): any?` — If you're using `state`/`setState()` properties, this function could be used to define the initial `state` for every item in the list. By default, the initial state of an item is `undefined`.
  * This is simply a proxy for the ["core"](#core) component's `getInitialItemState` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `initialState: object` — The initial state of the entire list, including the initial state of each item. For example, one could snapshot this state right before the list is unmounted and then pass it back in the form of the `initialState` property when the list is re-mounted, effectively preserving the list's state. This could be used, for example, to instantly restore the list and its scroll position when the user navigates "Back" to the list's page in a web browser. P.S. In that specific case of using `initialState` property for "Back" restoration, a developer might need to pass `readyToStart: false` property until the "Back" page's scroll position has been restored.
  * This is simply a proxy for the ["core"](#core) component's `state` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

<!-- * `initialCustomState: object` — (advanced) The initial "custom" state for `VirtualScroller`: the `initialCustomState` option of `VirtualScroller`. It can be used to initialize the "custom" part of `VirtualScroller` state in cases when `VirtualScroller` state is used to store some "custom" list state. -->

* `onStateChange(newState: object, previousState: object?)` — When this function is passed, it will be called every time the list's state is changed. Use it together with `initialState` property to preserve the list's state while it is unmounted.
  * This is simply a proxy for the ["core"](#core) component's `onStateChange` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

Example of using `initialState`/`onStateChange()`:

```js
function ListWithPreservedState() {
  const listState = useRef()

  const onListStateChange = useCallback(
    (state) => {
      listState.current = state
    },
    []
  )

  useEffect(() => {
    return () => {
      saveListState(listState.current)
    }
  }, [])

  return (
    <VirtualScroller
      {...}
      initialState={hasUserNavigatedBackToThisPage ? getSavedListState() : undefined}
      onStateChange={onListStateChange}
    />
  )
}
```

* `getItemId(item): number | string`
  * This is simply a proxy for the ["core"](#core) component's `getItemId` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.
  * `<VirtualScroller/>` also uses it to create a React `key` for every item's element. When `getItemId()` property is not passed, an item element's `key` will consist of the item's index in the `items` array plus a random-generated prefix that changes every time when `items` property value changes. This means that when the application frequently changes the `items` property, a developer could optimize it a little bit by supplying a custom `getItemId()` function whose result doesn't change when new `items` are supplied, preventing `<VirtualScroller/>` from needlessly re-rendering all visible items every time the `items` property is updated.

* `preserveScrollPositionOnPrependItems: boolean` — By default, when prepending new items to the list, the existing items will be pushed downwards on screen. For a user, it would look as if the scroll position has suddenly "jumped", even though technically the scroll position has stayed the same — it's just that the content itself has "jumped". But the user's perception is still that the scroll position has "jumped", as if the application was "buggy". In order to fix such inconvenience, one could pass `true` value here to automatically adjust the scroll position every time when prepending new items to the list. To the end user it would look as if the scroll position is correctly "preserved" when prepending new items to the list, i.e. the application works correctly.
  * This is simply a proxy for the ["core"](#core) component's `.setItems()` method's `preserveScrollPositionOnPrependItems` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `readyToStart: boolean` — One could initially pass `false` here in order to just initially render the `<VirtualScroller/>` with the provided `initialState` and then hold off calling the `.start()` method of the ["core"](#core) component, effectively "freezing" the `<VirtualScroller/>` until the `false` value is changed to `true`. While in "frozen" state, the `<VirtualScroller/>` will not attempt to re-render itself according to the current scroll position, postponing any such re-renders until `readyToStart` property `false` value is changed to `true`.
  * An example when this could be required is when a user navigates "Back" to the list's page in a web browser. In that case, the application may use the `initialState` property in an attempt to instantly restore the state of the entire list from a previously-saved snapshot, so that it immediately shows the same items that it was showing before the user navigated away from the list's page. But even if the application passes the previously-snapshotted `initialState`, by default the list will still re-render itself according to the current scroll position. And there wouldn't be any issue with that if the page's scroll position has already been restored to what it was before the user navigated away from the list's page. But if by the time the list is mounted, the page's scroll position hasn't been restored yet, the list will re-render itself with an "incorrect" scroll position, and it will "jump" to completely different items, very unexpectedly to the user, as if the application was "buggy". How could scroll position restoration possibly lag behind? In React it's actually very simple: `<VirtualScroller/>` re-renders itself in a `useLayoutEffect()` hook, which, by React's design, runs before any `useLayoutEffect()` hook in any of the parent components, including the top-level "router" component that handles scroll position restoration on page mount. So it becomes a ["chicken-and-egg"](https://en.wikipedia.org/wiki/Chicken_or_the_egg) problem. And `readyToStart: false` property is the only viable workaround for this dilemma: as soon as the top-level "router" component has finished restoring the scroll position, it could somehow signal that to the rest of the application, and then the application would pass `readyToStart: true` property to the `<VirtualScroller/>` component, unblocking it from re-rendering itself.

* `getScrollableContainer(): Element`
  * This is simply a proxy for the ["core"](#core) component's `getScrollableContainer` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.
  * This function will be initially called right after `<VirtualScroller/>` component is mounted. However, even though all ancestor DOM Elements already exist in the DOM tree by that time, the corresponding ancestor React Elements haven't "mounted" yet, so their `ref`s are still `null`. This means that `getScrollableContainer()` shouldn't use any `ref`s and should instead get the DOM Element of the scrollable container directly from the `document`.

Example of an incorrect `getScrollableContainer()` that won't work:

```js
function ListContainer() {
  const scrollableContainer = useRef()

  const getScrollableContainer = useCallback(() => {
    // This won't work: it will return `null` because `<ListContainer/>` hasn't "mounted" yet.
    return scrollableContainer.current
  }, [])

  return (
    <div ref={scrollableContainer} style={{ height: "400px", overflow: "scroll" }}>
      <VirtualScroller
        {...}
        getScrollableContainer={getScrollableContainer}
      />
    </div>
  )
}
```

Example of a correct `getScrollableContainer()` that would work:

```js
function ListContainer() {
  const getScrollableContainer = useCallback(() => {
    return document.getElementById("scrollable-container")
  }, [])

  return (
    <div id="scrollable-container" style={{ height: "400px", overflow: "scroll" }}>
      <VirtualScroller
        {...}
        getScrollableContainer={getScrollableContainer}
      />
    </div>
  )
}
```

* `itemsContainerComponentRef: object` — Could be used to get access to the `itemsContainerComponent` instance.
  * For example, if `itemsContainerComponent` is `"ul"` then `itemsContainerComponentRef.current` will be set to the `<ul/>` `Element`.

* `onItemInitialRender(item)` — When passed, this function will be called for each item when it's rendered for the first time. It could be used to somehow "initialize" an item, if required.
  * This is simply a proxy for the ["core"](#core) component's `onItemInitialRender` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `bypass: boolean` — Disables the "virtual" aspect of the list, effectively making it a regular "dumb" list that just renders all items.
  * This is simply a proxy for the ["core"](#core) component's `bypass` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `getEstimatedVisibleItemRowsCount(): number` — Should be specified if server-side rendering is used. Can be omitted if server-side rendering is not used.
  * This is simply a proxy for the ["core"](#core) component's `getEstimatedVisibleItemRowsCount` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `getEstimatedItemHeight(): number` — Should be specified if server-side rendering is used. Can be omitted if server-side rendering is not used.
  * This is simply a proxy for the ["core"](#core) component's `getEstimatedItemHeight` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* `getEstimatedInterItemVerticalSpacing(): number` — Should be specified if server-side rendering is used. Can be omitted if server-side rendering is not used.
  * This is simply a proxy for the ["core"](#core) component's `getEstimatedInterItemVerticalSpacing` [option](#options).
  * Only the initial value of this property is used, and any changes to it will be ignored.

* Any other ["core"](#core) component [options](#options) could be passed here.
  * Such as:
    * `measureItemsBatchSize`
  * Only the initial values of those options will be used, any any changes to those will be ignored.

<!-- * `onMount()` — Is called after `<VirtualScroller/>` component has been mounted and before `VirtualScroller.onMount()` is called. -->

<!-- * `shouldUpdateLayoutOnScreenResize(event)` — The `shouldUpdateLayoutOnScreenResize` option of `VirtualScroller` class. -->

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
<summary>Instance methods</summary>

#####

<!--
* `renderItem(i)` — Calls `.forceUpdate()` on the `itemComponent` instance for the item with index `i`. Does nothing if the item isn't currently rendered. Is only supported for `itemComponent`s that are `React.Component`s. The `i` item index argument could be replaced with the item object itself, in which case `<VirtualScroller/>` will get `i` as `items.indexOf(item)`.
-->

<!-- * `getItemCoordinates(i)` — A proxy for the corresponding `VirtualScroller` method. -->

<!-- * `getElement()` — Returns the items container `Element`. -->

* `updateLayout()` — Forces a re-calculation and re-render of the list.
  * This is simply a proxy for the ["core"](#core) component's `.updateLayout()` method.

</details>

#####

<details>
<summary>More on <code>state</code>, <code>setState</code> and <code>onHeightChange()</code></summary>

#####

If the `itemComponent` has any internal state, it should be stored in the "virtual scroller" `state` rather than in the usual React state. This is because an item component gets unmounted as soon as it goes off screen, and when it does, all its React state is lost. If the user then scrolls back, the item will be re-rendered "from scratch", without any previous state, which could cause a "jump of content" if the item was somehow "expanded" before it got unmounted.

For example, consider a social network feed where the feed items (posts) can be expanded or collapsed via a "Show more"/"Show less" button. Suppose a user clicks a "Show more" button in a post resulting in that post expanding in height. Then the user scrolls down, and since the post is no longer visible, it gets unmounted. Since no state is preserved by default, when the user scrolls back up and the post gets mounted again, its previous state will be lost and it will render in a default non-expanded state, resulting in a perceived "jump" of page content by the difference in height between the expanded and non-expanded post state.

To fix that, `itemComponent` receives the following state management properties:

* `state` — The state of the item component. It is persisted throughout the entire lifecycle of the list.

  * In the example described above, `state` might look like `{ expanded: true }`.

  * This is simply a proxy for the ["core"](#core) component's `.getState().itemStates[i]`.

* `setState(newState)` — Use this function to save the item component state whenever it changes.

  * In the example described above, `setState({ expanded: true/false })` would be called whenever a user clicks a "Show more"/"Show less" button.

  * This is simply a proxy for the ["core"](#core) component's `.setItemState(item, newState)`.

* `onHeightDidChange()` — Call this function immediately after (if ever) the item element height has changed.

  * In the example described above, `onHeightDidChange()` would be called immediately after a user has clicked a "Show more"/"Show less" button and the component has re-rendered itself. Because that sequence of events has resulted in a change of the item element's height, `VirtualScroller` should re-measure the item's height in order for its internal calculations to stay in sync.

  * This is simply a proxy for the ["core"](#core) component's `.onItemHeightDidChange(item)`.

Example of using `state`/`setState()`/`onHeightDidChange()`:

```js
function ItemComponent({
  item,
  state,
  setState,
  onHeightDidChange
}) {
  const [internalState, setInternalState] = useState(state)

  const hasMounted = useRef()

  useLayoutEffect(() => {
    if (hasMounted.current) {
      setState(internalState)
      onHeightDidChange()
    } else {
      // Skip the initial mount.
      // Only handle the changes of the `internalState`.
      hasMounted.current = true
    }
  }, [internalState])

  return (
    <section>
      <h1>
        {item.title}
      </h1>
      {internalState && internalState.expanded &&
        <p>{item.text}</p>
      }
      <button onClick={() => {
        setInternalState({
          ...internalState,
          expanded: !expanded
        })
      }}>
        {internalState && internalState.expanded ? 'Show less' : 'Show more'}
      </button>
    </section>
  )
}
```
</details>

#####

<details>
<summary>Server-Side Render</summary>

#####

By default, on server side, it will just render the first item, as if the list only had one item. This is because on server side it doesn't know how many items it should render because it doesn't know neither the item height nor the screen height.

To fix that, a developer should specify certain properties — `getEstimatedVisibleItemRowsCount(): number` and `getEstimatedItemHeight(): number` and `getEstimatedInterItemVerticalSpacing(): number` — so that it could calculate how many items it should render and how much space it should leave for scrolling. For more technical details, see the description of these parameters in the ["core"](#core) component's [options](#options).
</details>

######

<details>
<summary>Alternatively, instead of using <code>&lt;VirtualScroller/&gt;</code> component, one could use <code>useVirtualScroller()</code> hook</summary>

######

```js
import React from 'react'
import { useVirtualScroller } from 'virtual-scroller/react'

function List(props) {
  const {
    // "Core" component `state`.
    // See "State" section of the readme for more info.
    state: {
      items,
      itemStates,
      firstShownItemIndex,
      lastShownItemIndex
    },
    // CSS style object.
    style,
    // CSS class name.
    className,
    // This `ref` must be passed to the items container component.
    itemsContainerRef,
    // One could use this `virtualScroller` object to call any of its public methods.
    // Except for `virtualScroller.getState()` — use the returned `state` property instead.
    virtualScroller
  } = useVirtualScroller({
    // The properties of `useVirtualScroller()` hook are the same as
    // the properties of `<VirtualScroller/>` component.
    //
    // Additional properties:
    // * `style`
    // * `className`
    //
    // Excluded properties:
    // * `itemComponent`
    // * `itemComponentProps`
    // * `itemsContainerComponent`
    // * `itemsContainerComponentProps`
    //
    items: props.items
  })

  return (
    <div ref={itemsContainerRef} style={style} className={className}>
      {items.map((item, i) => {
        if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
          return (
            <ListItem
              key={item.id}
              item={item}
              state={itemStates && itemStates[i]}
            />
          )
        }
        return null
      })}
    </div>
  )
}

function ListItem({ item, state }) {
  const { username, date, text } = item
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
```
</details>

## DOM

`virtual-scroller/dom` exports a `VirtualScroller` class that implements a "virtual scroller" in a standard [Document Object Model](https://en.wikipedia.org/wiki/Document_Object_Model) environment such as a web browser.

The `VirtualScroller` class is based on the ["core"](#core) component, and its constructor has the following arguments:

* `itemsContainerElement` — Items container DOM `Element`. Alternatively, one could pass a `getItemsContainerElement()` function that returns a DOM `Element`.
* `items` — The list of items.
* `renderItem(item): Element` — A function that transforms an `item` into a DOM `Element`.
* `options` — (optional) See the "Available options" section below.

<!-- It `.start()`s automatically upon being created, so there's no need to call `.start()` after creating it. -->

Code example:

```js
import VirtualScroller from 'virtual-scroller/dom'

// A list of comments.
const items = [
  {
    username: 'john.smith',
    date: new Date(),
    comment: 'I woke up today'
  },
  ...
]

function renderItem(item) {
  const { username, date, comment } = item

  // Comment element.
  const element = document.createElement('article')

  // Comment author.
  const author = document.createElement('a')
  author.setAttribute('href', `/users/${username}`)
  author.textContent = `@${username}`
  element.appendChild(author)

  // Comment date.
  const time = document.createElement('time')
  time.setAttribute('datetime', date.toISOString())
  time.textContent = date.toString()
  element.appendChild(time)

  // Comment text.
  const text = document.createElement('p')
  text.textContent = comment
  element.appendChild(text)

  // Return the DOM Element.
  return element
}

// Where the list items will be rendered.
const itemsContainerElement = document.getElementById('comments')

// Create a "virtual scroller" instance.
// It automatically renders the list and starts listening to scroll events.
const virtualScroller = new VirtualScroller(
  itemsContainerElement,
  items,
  renderItem
)

// When the list will no longer be rendered, the "virtual scroller" should be stopped.
// For example, that could happen when the user navigates away from the page.
//
// virtualScroller.stop()
```
<details>
<summary>Available <code>options</code></summary>

#####

<!-- * `onMount()` — Is called before `VirtualScroller.onMount()` is called. -->

* `onItemUnmount(itemElement: Element)` — Will be called every time when the list unmounts a DOM `Element` for some item that is no longer visible. Rather than discarding such a DOM `Element`, the application could reuse it for another item. Why? Because they say that reusing existing DOM `Element`s is 2-6 times [faster](https://github.com/ChrisAntaki/dom-pool#what-performance-gains-can-i-expect) than creating new ones.

* `readyToStart: boolean` — By default, the list gets rendered and starts working immediately after `new VirtualScroller()` constructor is called. Theoretically, one could imagine how such streamlined pipeline might not be suitable for all possible edge cases, so to opt out of the immediate auto-start behavior, a developer could pass a `readyToStart: false` option when creating a `VirtualScroller` instance. In that case, the `VirtualScroller` instance will perform just the initial render (with the initial `state`), after which it will "freeze" itself until the developer manually calls `.start()` instance method, at which point the list will be unblocked from re-rendering itself in response to user's actions, such as scrolling the page.

* `readyToRender: boolean` — The `readyToStart: false` option described above "freezes" the list for any updates but it still performs the initial render of it. If even the initial render of the list should be postponed, pass `readyToRender: false` option, and it will not only prevent the automatic "start" of the `VirtualScroller` at creation time, but it will also prevent the automatic initial render of it until the developer manually calls `.start()` instance method.

* Any other [options](#options) are simply passed through to the ["core"](#core) component.
</details>

#####

<details>
<summary>Instance methods</summary>

#####

The following instance methods are just proxies for the corresponding methods of the ["core"](#core) component:

* `start()`
* `stop()`
* `setItems(items, options)`
* `setItemState(item, itemState)`
* `onItemHeightDidChange(item)`

<!-- * `getItemCoordinates(item)` -->
</details>

## Core

The default export is a "core" `VirtualScroller` class: it implements the core logic of a "virtual scroller" component and can be used to build a "virtual scroller" for any UI framework or even any [rendering engine](#rendering-engine) other than DOM. This core class is not meant to be used in applications directly. Instead, prefer using one of the high-level components provided by this library: [`virtual-scroller/react`](#react) or [`virtual-scroller/dom`](#dom). Or implement your own: see `source/test` folder for an example of using the core component to build an "imaginary" renderer implementation.

### State

The core `VirtualScroller` component works as a "state machine", i.e. at any given moment in time, anything that is rendered on screen is precisely expressed by the `state`, and vice versa. I'll call it a "contract".

So every time the user scrolls, the "virtual scroller" core component recalculates the currently-visible item indexes and updates the `state`, which triggers a re-render.

The "re-render" part is completely outsourced to a given higher-level "implementation", such as [`virtual-scroller/dom`](#dom), which passes a `render(state)` function as a parameter to the core component. And, since the "re-render" must not break the "contract", it must render everything immediately and in-full in that function.

Sometimes though, by design, re-rendering could only be done "asynchronously" (i.e. after a short delay), such as in React and [`virtual-scroller/react`](#react). In that case, in order to not break the "contract", the `state` update will have to be put on hold by the same exact delay. `virtual-scroller/react` achieves that by passing custom `setState()` and `getState()` functions as parameters to the core component, instead of passing a `render()` function parameter. The custom `setState()` and `getState()` functions temporarily "hide" the `state` changes until those changes have been rendered by React.

<details>
<summary><code>state</code> properties</summary>

#####

The main `state` properties are:

* `items: any[]` — The list of items (can be updated via [`.setItems()`](#updating-items)).

* `firstShownItemIndex: number` — The index of the first item that should be rendered.

* `lastShownItemIndex: number` — The index of the last item that should be rendered.

* `beforeItemsHeight: number` — The `padding-top` which should be applied to the "container" element: it emulates all items before `firstShownItemIndex` as if they were rendered.

* `afterItemsHeight: number` — The `padding-bottom` which should be applied to the "container" element: it emulates all items after `lastShownItemIndex` as if they were rendered.

The following `state` properties are only used for saving and restoring `VirtualScroller` `state`, and normally shouldn't be accessed:

* `itemStates: any[]` — The "states" of all items. If an item's appearance is not "static" and could change, then every aspect of the item's appearance that could change should be represented in the item's "state", and that "state" must be preserved somewhere. That's because of the nature of how `VirtualScroller` works: no-longer-visible items get un-rendered, and when they later become visible again, they should precisely restore their latest-rendered appearance by re-rendering from a previously preserved "state".

  * The item "state" could be preserved anywhere in the application, or the developer could use `VirtualScroller`'s built-in item "state" storage. To preserve an item's state in the built-in storage, call `.setItemState(item, itemState)` instance method (described below) immediately after an item's state has changed.

    * An example would be an item representing a social media comment, with a "Show more"/"Show less" button that shows or hides the full text of the comment. Immediately after the full text of a comment has been shown or hidden, it should call `.setItemState(item, { showMore: true/false })` instance method along with `.onItemHeightDidChange(item)` instance method (described below), so that next time when the item is rendered, it could restore its appearance from `virtualScroller.getState().itemStates[i]`.

    * For another similar example, consider a social network feed, where each post optionally has an attachment. Suppose there's a post in the feed having a YouTube video attachment. The attachment is initially shown as a small thumbnail that expands into a full-sized embedded YouTube video player when a user clicks on it. If the expanded/collapsed state of such attachment wasn't preserved, then the following "glitch" would be observed: the user expands the video, then scrolls down so that the post with the video is no longer visible, the post gets unmounted due to going off screen, then the user scrolls back up so that the post with the video is visible again, the post gets mounted again, but the video is not expanded and instead a small thumbnail is shown because there's no previous "state" to restore from.

      * In this example, besides preserving the item state itself, one should also call `.onItemHeightDidChange(item)` instance method (described below) right after the YouTube video has been expanded/collapsed.

* `itemHeights: number[]` — The measured heights of all items. If an item's height hasn't been measured yet then it's `undefined`.

  * By default, items are only measured once: when they're initially rendered. If an item's height changes afterwards, then `.onItemHeightDidChange(item)` instance method must be called right after it happens (described later in the document), otherwise `VirtualScroller`'s calculations will be off. For example, if an item is a social media comment, and there's a "Show more"/"Show less" button that shows the full text of the comment, then it must call `.onItemHeightDidChange(item)` immediately after the comment text has been expanded or collapsed.

    * Besides the requirement of calling `.onItemHeightDidChange(item)`, every change in an item's height must also be reflected in the actual data: the change in height must be either a result of the item's internal properties changing or it could be a result of changing the item's "state". The reason is that when an item gets hidden, it's no longer rendered, so when it becomes visible again, it should precisely restore its last-rendered appearance based on the item's properties and any persisted "state".

* `verticalSpacing: number?` — Vertical item spacing. Is `undefined` until it has been measured. Is only measured once, when at least two rows of items have been rendered.

* `columnsCount: number?` — The count of items in a row. Is `undefined` if no `getColumnsCount()` parameter has been passed to `VirtualScroller`, or if the columns count is `1`.

* `scrollableContainerWidth: number?` — The width of the scrollable container. For DOM implementations, that's gonna be either the browser window width or some scrollable parent element width. Is `undefined` until it has been measured after the `VirtualScroller` has been `start()`-ed.
</details>

#####

Code example:

```js
import VirtualScroller from 'virtual-scroller'

const items = [
  { name: 'Apple' },
  { name: 'Banana' },
  ...
]

const getContainerElement = () => document.getElementById('fruits-list')

const virtualScroller = new VirtualScroller(getContainerElement, items, {
  // Re-renders the list based on the `state`.
  render(state) {
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

`VirtualScroller` class constructor arguments:

* `getContainerElement()` — returns the container "element" for the list item "elements".
* `items` — an array of items.
* `options` — (optional)
  * `render(state, prevState)` — "re-renders" the list according to the new `state`.
    * The `render()` function can only be specified when it immediately re-renders the list. Sometimes, an immediate re-render is not possible. For example, in React framework, re-render is done "asynchronously", i.e. with a short delay. In such case, instead of specifying a `render` parameter when creating a `virtualScroller` instance, one should omit it and then call an instance method — `virtualScroller.useState({ getState, setState/updateState })` — where `getState` function returns the currently-rendered state and `setState/updateState` function is responsible for triggerring an eventual "re-render" of the list according to the new `state`.

#### Options

<details>
<summary>Available <code>options</code></summary>

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

* `getEstimatedVisibleItemRowsCount(): number` and/or `getEstimatedItemHeight(): number` and/or `getEstimatedInterItemVerticalSpacing(): number` — These functions are only used during the initial render of the list, i.e. when `VirtualScroller` doesn't know anything about the item dimensions.
  * `getEstimatedVisibleItemRowsCount()` is used to guess how many rows of items should be rendered in order to cover the screen area. Sidenote: It will actually render more items than that, with a "prerender margin" on top and bottom, just to account for future scrolling.
  * `getEstimatedItemHeight()` is used to guess the average item height before any of the items have been rendered yet. This average item height is then used to calculate the size of the scrollbar, i.e. how much the user can scroll. It can also be used to calculate the count of visible rows of items if the screen size is known and `getEstimatedVisibleItemRowsCount()` function is not specified.
  * `getEstimatedInterItemVerticalSpacing()` is used to guess the vertical spacing between the items. It is used to calculate the size of the scrollbar, i.e. how much the user can scroll.
  * After the initial render has finished, the list will measure the heights of the rendered items and will use those values to calculate the average item height, the vertical spacing between the items and the count of visible rows of items, and with these new values it will re-render itself.
  * This means that on client side, `getEstimatedVisibleItemRowsCount()` and `getEstimatedItemHeight()` and `getEstimatedInterItemVerticalSpacing()` don't really matter because the list will immediately re-render itself with the correct measured values anyway, and the user will not even observe the results of the initial render because a follow-up render happens immediately.
  * On server side though, `getEstimatedVisibleItemRowsCount()` and `getEstimatedItemHeight()` and `getEstimatedInterItemVerticalSpacing()` completely determine the output of a "server-side render".
  * When these parameters aren't specified, the list will render just the first item during the initial render.

#### "Advanced" (rarely-used) options

* `bypass: boolean` — Pass `true` to disable the "virtualization" behavior and just render the entire list of items.

* `getInitialItemState(item): any?` — Creates the initial state for an item. It can be used to populate the default initial states for list items. By default, an item's state is `undefined`.

* `initialScrollPosition: number` — If passed, the page will be scrolled to this `scrollY` position.

* `onScrollPositionChange(scrollY: number)` — Is called whenever a user scrolls the page.

<!-- * `customState: object` — (advanced) A developer might want to store some "custom" (additional) state along with the `VirtualScroller` state, for whatever reason. To do that, pass the initial value of such "custom" state as the `customState` option when creating a `VirtualScroller` instance.  -->

* `getItemId(item): number | string` — (advanced) When `items` are dynamically updated via `.setItems()`, `VirtualScroller` detects an "incremental" update by comparing "new" and "old" item ["references"](https://codeburst.io/explaining-value-vs-reference-in-javascript-647a975e12a0): this way, `VirtualScroller` can understand that the "new" `items` are (mostly) the same as the "old" `items` when some items get prepended or appended to the list, in which case it doesn't re-render the whole list from scratch, but rather just renders the "new" items that got prepended or appended. Sometimes though, some of the "old" items might get updated: for example, if `items` is a list of comments, then some of those comments might get edited in-between the refreshes. In that case, the edited comment object reference should change in order to indicate that the comment's content has changed and that the comment should be re-rendered (at least that's how it has to be done in React world). At the same time, changing the edited comment object reference would break `VirtualScroller`'s "incremental" update detection, and it would re-render the whole list of comments from scratch, which is not what it should be doing in such cases. So, in cases like this, `VirtualScroller` should have some way to understand that the updated item, even if its object reference has changed, is still the same as the old one, so that it doesn't break "incremental" update detection. For that, `getItemId(item)` parameter could be passed, which `VirtualScroller` would use to compare "old" and "new" items (instead of the default "reference equality" check), and that would fix the "re-rendering the whole list from scratch" issue. It can also be used when `items` are fetched from an external API, in which case all item object references change on every such fetch.

* `onItemInitialRender(item)` — (advanced) Will be called for each `item` when it's about to be rendered for the first time. This function could be used to somehow "initialize" an item before it gets rendered for the first time. For example, consider a list of items that must be somehow "preprocessed" (parsed, enhanced, etc) before being rendered, and such "preprocessing" puts some load on the CPU (and therefore takes some time). In such case, instead of "preprocessing" the whole list of items up front, the application could "preprocess" only the items that're actually visible, preventing the unnecessary work and reducing the "time to first render".
  * The function is guaranteed to be called at least once for each item that ever gets rendered.
  * In more complex and non-trivial cases it could be called multiple times for a given item, so it should be written in such a way that calling it multiple times wouldn't do anything. For example, it could set a boolean flag on an item and then check that flag on each subsequent invocation.

    * One example of the function being called multiple times would be when run in an "asynchronous" rendering framework like React. In such frameworks, "rendering" and "painting" are two separate actions separated in time, so one doesn't necessarily cause the other. For example, React could render a component multiple times before it actually gets painted on screen. In that example, the function would be called for a given item on each render until it finally gets painted on screen.
    * Another example would be calling `VirtualScroller.setItems()` function with a "non-incremental" `items` update. An `items` update would be "non-incremental", for example, if some items got removed from the list, or some new items got inserted in the middle of the list, or the order of the items changed. In case of a "non-incremental" `items` update, `VirtualScroller` resets then previous state and basically "forgets" everything about the previous items, including the fact that the function has already been called for some of the items.

<!-- * `shouldUpdateLayoutOnScreenResize(event: Event): boolean`  — By default, `VirtualScroller` always performs a re-layout on window `resize` event. The `resize` event is not only triggered when a user resizes the window itself: it's also [triggered](https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen#Notes) when the user switches into (and out of) fullscreen mode. By default, `VirtualScroller` performs a re-layout on all window `resize` events, except for ones that don't result in actual window width or height change, and except for cases when, for example, a video somewhere in a list is maximized into fullscreen. There still can be other "custom" cases: for example, when an application uses a custom "slideshow" component (rendered outside of the list DOM element) that goes into fullscreen when a user clicks a picture or a video in the list. For such "custom" cases `shouldUpdateLayoutOnScreenResize(event)` option / property can be specified. -->

* `measureItemsBatchSize: number` — (advanced) (experimental) Imagine a situation when a user doesn't gradually scroll through a huge list but instead hits an End key to scroll right to the end of such huge list: this will result in the whole list rendering at once, because an item needs to know the height of all previous items in order to render at correct scroll position, which could be CPU-intensive in some cases — for example, when using React due to its slow performance when initially rendering components on a page. To prevent freezing the UI in the process, a `measureItemsBatchSize` could be configured, that would limit the maximum count of items that're being rendered in a single pass for measuring their height: if `measureItemsBatchSize` is configured, then such items will be rendered and measured in batches. By default it's set to `100`. This is an experimental feature and could be removed in future non-major versions of this library. For example, the future React 17 will come with [Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) rendering engine that is said to resolve such freezing issues internally. In that case, introducing this option may be reconsidered.

<!-- * (alternative description) `getEstimatedItemHeight(): number` — By default, `<VirtualScroller/>` uses an average measured item height as an estimate for the height of any item that hasn't been rendered yet. This way, it is able to guess what will be the total height of the items below the current scroll position, which is required in order to display a correct scrollbar. However, if the application thinks that it has a better idea of what the average item height is gonna be, it could force `<VirtualScroller/>` to use that value instead of the average measured one. -->

* `prerenderMarginRatio` — (currently unused) The list component renders not only the items that're currently visible but also the items that lie within some additional vertical distance (called "prerender margin") on top and bottom to account for future scrolling. This way, it doesn't have to recalculate the layout on each scroll event and is only forced to recalculate the layout if the user scrolls past the "prerender margin". Therefore, "prerender margin" is an optimization that "throttles" layout recalculation. By default, the "prerender margin" is equal to scrollable container height: this seems to be the most optimal value to account for "Page Up" / "Page Down" scrolling. This parameter is currently not customizable because the default value of `1` seems to work fine in all possible use cases.
</details>

#####

<details>
<summary>Instance methods</summary>

#####

* `start()` — Performs an initial render of the `VirtualScroller` and starts listening to scroll events.

* `stop()` — Stops listening to scroll events. Call this method when the list is about to be removed from the page. To re-start the `VirtualScroller`, call `.start()` method again.

* `getState(): object` — Returns `VirtualScroller` state.

* `setItems(newItems: any[], options: object?)` — Updates `VirtualScroller` `items`. For example, it can be used to prepend or append new items to the list. See [Updating Items](#updating-items) section for more details. Available options:
  * `preserveScrollPositionOnPrependItems: boolean` — Set to `true` to enable "restore scroll position after prepending new items" feature (should be used when implementing a "Show previous items" button).

#### Custom (External) State Management

A developer might prefer to use custom (external) state management rather than the default one. That might be the case when a certain high-order `VirtualScroller` implementation comes with a specific state management paradigm, like in React. In such case, `VirtualScroller` provides the following instance methods:

* `onRender()` — When using custom (external) state management, `.onRender()` function must be called every time right after the list has been "rendered" (including the initial render). The list should always "render" only with the "latest" state where the "latest" state is defined as the argument of the latest `setState()` call. Otherwise, the component may not work correctly.

* `getInitialState(): object` — Returns the initial `VirtualScroller` state for the cases when a developer configures `VirtualScroller` for custom (external) state management.

* `useState({ getState, setState, updateState? })` — Enables custom (external) state management.

  * `getState(): object` — Returns the externally managed `VirtualScroller` `state`.

  * `setState(newState: object)` — Sets the externally managed `VirtualScroller` `state`. Must call `.onRender()` right after the updated `state` gets "rendered". A higher-order `VirtualScroller` implementation could either "render" the list immediately in its `setState()` function, in which case it would be better to use the default state management instead and pass a custom `render()` function, or the `setState()` function could "schedule" an "asynchronous" "re-render", like the React implementation does, in which case such `setState()` function would be called an ["asynchronous"](https://reactjs.org/docs/state-and-lifecycle.html#state-updates-may-be-asynchronous) one, meaning that state updates aren't "rendered" immediately and are instead queued and then "rendered" in a single compound state update for better performance.

  * `updateState(stateUpdate: object)` — (optional) `setState()` parameter could be replaced with `updateState()` parameter. The only difference between the two is that `updateState()` gets called with just the portion of the state that is being updated while `setState()` gets called with the whole updated state object, so it's just a matter of preference.

For a usage example, see `./source/react/VirtualScroller.js`. The steps are:

* Create a `VirtualScroller` instance.

* Get the initial state value via `virtualScroller.getInitialState()`.

* Initialize the externally managed state with the initial state value.

* Define `getState()` and `updateState()` functions for reading or updating the externally managed state.

* Call `virtualScroller.useState({ getState, updateState })`.

* "Render" the list and call `virtualScroller.start()`.

When using custom (external) state management, contrary to the default (internal) state management approach, the `render()` function parameter can't be passed to the `VirtualScroller` constructor. The reason is that `VirtualScroller` wouldn't know when exactly should it call such `render()` function because by design it can only be called right after the state has been updated, and `VirtualScroller` doesn't know when exactly does the state get updated, because state updates are done via an "external" `updateState()` function that could as well apply state updates "asynchronously" (after a short delay), like in React, rather than "synchronously" (immediately). That's why the `updateState()` function must re-render the list by itself, at any time it finds appropriate, and right after the list has been re-rendered, it must call `virtualScroller.onRender()`.

#### "Advanced" (rarely used) instance methods

* `onItemHeightDidChange(item)` — (advanced) If an item's height could've changed, this function should be called immediately after the item's height has potentially changed. The function re-measures the item's height (the item must still be rendered) and re-calculates `VirtualScroller` layout. An example for using this function would be having an "Expand"/"Collapse" button in a list item.

  * There's also a convention that every change in an item's height must come as a result of changing the item's "state". See the descripton of `itemStates` and `itemHeights` properties of the `VirtualScroller` [state](#state) for more details.

  * Implementation-wise, calling `onItemHeightDidChange(item)` manually could be replaced with detecting item height changes automatically via [Resize Observer](https://caniuse.com/#search=Resize%20Observer) in some future version.

* `setItemState(item, itemState: any?)` — (advanced) Preserves a list item's "state" inside `VirtualScroller`'s built-in item "state" storage. See the descripton of `itemStates` property of the `VirtualScroller` [state](#state) for more details.

  * A developer could use it to preserve an item's "state" if it could change. The reason is that offscreen items get unmounted and any unsaved state is lost in the process. If an item's state is correctly preserved, the item's latest-rendered appearance could be restored from that state when the item gets mounted again due to becoming visible again.

  * Calling `setItemState()` doesn't trigger a re-layout of `VirtualScroller` because changing a list item's state doesn't necessarily mean a change of its height, so a re-layout might not be required. If an item's height did change as a result of changing its state, then `VirtualScroller` layout must be updated, and to do that, one should call `onItemHeightDidChange(item)` right after the change in the item's state has been reflected on screen.

* `getItemScrollPosition(item): number?` — (advanced) Returns an item's scroll position inside the scrollable container. Returns `undefined` if any of the items before this item haven't been rendered yet.

<!-- * `getItemCoordinates(item): object` — Returns coordinates of item with index `i` relative to the "scrollable container": `top` is the top offset of the item relative to the start of the "scrollable container", `bottom` is the top offset of the item's bottom edge relative to the start of the "scrollable container", `height` is the item's height. -->

* `updateLayout()` — (advanced) Triggers a re-layout of `VirtualScroller`. It's what's called every time on page scroll or window resize. You most likely won't ever need to call this method manually. Still, one could imagine a hypothetical case when a developer might want to call this method. For example, when the list's top position changes not as a result of scrolling the page or resizing the window, but rather because of some unrelated "dynamic" changes of the page's content. For example, if some DOM elements above the list are removed (like a closeable "info" notification element) or collapsed (like an "accordion" panel), then the list's top position changes, which means that now some of the previoulsy shown items might go off screen, revealing an unrendered blank area to the user. The area would be blank because the "shift" of the list's vertical position happened not as a result of the user scrolling the page or resizing the window, and, therefore, it won't be registered by the `VirtualScroller` component. To fix that, a developer might want to trigger a re-layout manually.
</details>

#####

<details>
<summary>Example: implement <code>virtual-scroller/dom</code> component using the "core" <code>VirtualScroller</code> component
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

## Updating Items

If the list represents a social media feed, it has to be updated periodically as new posts get published.

A user looking at the feed in real time always "knows" which posts are new and which ones are old. Analogous, the "virtual scroller" also has to have a way of "knowing" which posts are new and which ones are old, so that it could correctly "carry over" its measurements and calculations from the old `items` to the new `items` without any ["content jumping"](https://css-tricks.com/content-jumping-avoid/) glitches.

The most obvious way of telling old items from new ones would be direct comparison using `===` operator.

```js
function isOldItem(item) {
  return prevItems.some(_ => _ === item)
}
```

And it would work in case of appending or prepending items:

```js
async function updateFeed() {
  const lastItem = items[items.length - 1]
  const nextItems = await fetch(`https://social.com/feed?after=${lastItem.id}`)
  items = items.concat(nextItems)
  virtualScroller.setItems(items)
}
```

But it wouldn't work in a more simple case of just re-creating all items every time:

```js
async function updateFeed() {
  items = await fetch('https://social.com/feed')
  virtualScroller.setItems(items)
}
```

In such case, a developer should pass a `getItemId(item)` parameter to the "virtual scroller". This way, the "virtual scroller" will be able to tell new items from old ones, even if their "object reference" has changed.

With this, when new items are appended to the list, the page scroll position will remain unchanged and there'll be no ["content jumping"](https://css-tricks.com/content-jumping-avoid/). Same goes for prepending new items to the list: when new items are prepended to the list, the page scroll position will remain unchanged. But in the latter case, the prepended items will also push the previously-existing ones downwards, and to the user it would look as if the scroll position has "jumped", even though technically it hasn't. To fix that, pass `preserveScrollPositionOnPrependItems: true` option to the "virtual scroller", and it will automatically adjust the scroll position right after prepending new items so that to the user it looks as if the scroll position is correctly "preserved".

<!-- For implementing "infinite scroll" lists, a developer could also use [`on-scroll-to`](https://gitlab.com/catamphetamine/on-scroll-to) component. -->

<!--
<details>
<summary>Find out what are "incremental" and "non-incremental" items updates, and why "incremental" updates are better.</summary>

#####

When using `virtual-scroller/dom` component, a developer should call `.setItems(newItems)` instance method in order to update items.

When using `virtual-scroller/react` React component, it calls `.setItems(newItems)` method automatically when new `items` property is passed.

The basic equality check (`===`) is used to intelligently compare `newItems` to the existing `items`. If `getItemId()` parameter is passed, then items are compared by their ids rather than by themselves. If a simple append and/or prepend operation is detected, then the update is an "incremental" one, and the list seamlessly transitions from the current state to the new state, preserving its state and scroll position. If, however, the items have been updated in such a way that it's not a simple append and/or prepend operation, then such update is a "non-incremental" one, and the entire list is rerendered from scratch, losing its state and resetting the scroll position. There're valid use cases for both situations.

For example, suppose a user navigates to a page where a list of `items: object[]` is shown using a `VirtualScroller`. When a user scrolls down to the last item in the list, a developer might want to query the database for the newly added items, and then show those new items to the user. In that case, the developer could send a query to the API with `afterId: number` parameter being the `id: number` of the last item in the list, and the API would then return a list of the `newItems: object[]` whose `id: number` is greater than the `afterId: number` parameter. Then, the developer would append the `newItems: object[]` to the `items: object[]`, and then call `VirtualScroller.setItems()` with the updated `items: object[]`, resulting in a "seamless" update of the list, preserving its state and scroll position.

Another example. Suppose a user navigates to a page where they can filter a huge list by a query entered in a search bar. In that case, when the user edits the query in the search bar, `VirtualScroller.setItems()` method is called with a list of filtered items, and the entire list is rerendered from scratch. In this case, it's ok to reset the `VirtualScroller` state and the scroll position.

When new items are appended to the list, the page scroll position remains unchanged. Same's for prepending new items to the list: the scroll position of the page stays the same, resulting in the list "jumping" down when new items get prepended. To fix that, pass `preserveScrollPositionOnPrependItems: true` option to the `VirtualScroller`. When using `virtual-scroller/dom` component, pass that option when creating a new instance, and when using `virtual-scroller/react` React component, pass `preserveScrollPositionOnPrependItems` property.

For implementing "infinite scroll" lists, a developer could also use [`on-scroll-to`](https://gitlab.com/catamphetamine/on-scroll-to) component.
</details>
-->

## Grid Layout

To display items using a "grid" layout — i.e. with multiple columns in each row — supply a `getColumnsCount()` parameter to the "virtual scroller".

For example, to only show a three-column layout if the screen is wider than `1280px`:

```js
function getColumnsCount(scrollableContainer) {
  // The `scrollableContainer` argument provides a `.getWidth()` method.
  // In the most common case, `scrollableContainer` is the web browser window.
  if (scrollableContainer.getWidth() > 1280) {
    return 3
  }
  return 1
}
```

```css
.list {
  display: flex;
  flex-wrap: wrap;
}

.list-item {
  flex-basis: 33.333333%;
  box-sizing: border-box;
}

@media screen and (max-width: 1280px) {
  .list-item {
    flex-basis: 100%;
  }
}
```

## Tips & Tricks

### Adding Spacing Between List Items

To add some vertical spacing between the list items, one could add `margin-top` / `margin-bottom` or `border-top` / `border-bottom` on the list item elements. Before doing so, read the couple of sections below to avoid issues with "margin collapse" or unintended side-effects of `:first-child` / `:last-child` CSS selectors.

### Using `margin` on List Items Correctly

CSS has a pretty weird and unintuitive feature called ["margin collapse"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Mastering_margin_collapsing): if two adjacent sibling elements both have a margin, or if the first/last child and its parent both have a margin, then those two margins will be combined either as `margin1 + margin2` or `Math.max(margin1, margin2)`, depending on the circumstances, and the latter is the essense of the issue.

For example, if a first child element has `margin-top` and no `padding-top` or `border-top`, and the parent has `margin-top`, then the margins of the child and the parent will be combined as `Math.max(margin1, margin2)`.

And if a first child element has `margin-top` and also `padding-top` or `border-top`, and the parent has `margin-top`, then the margins of the child and the parent will be combined as `margin1 + margin2`.

Weird and unexpected. And it's not limited to just having or not having `padding` or `border` — the exact rules are much more [convoluted](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Box_Model/Mastering_margin_collapsing).

So why does this become an issue with the "virtual scroller"? It's because "virtual scroller" will add or remove `padding-top` and `padding-bottom` to the list element (which is the "parent"), changing the formula of how the list's `margin` is combined with the list items' `margin`.

The result will be ["content jumping"](https://css-tricks.com/content-jumping-avoid/) when scrolling to or past the top or the bottom of the list.

To avoid such issues, when setting `margin` on list items, do any of the following:
* Set `padding-top` and `padding-bottom` on the list element
* Set `border-top` and `border-bottom` on the list element
* Set `margin-top` and `margin-bottom` on list items
  * Reset `margin-top` on the first item of the list
  * Reset `margin-bottom` on the last item of the list

Here's an example of how to set `margin` on list items correctly:

```css
/* Adds a `20px` vertical spacing above and below the list. */
.list {
  margin-top: 20px;
  margin-bottom: 20px;
}
/* Adds a `10px` vertical spacing between list items. */
.list-item {
  margin-top: 10px;
  margin-bottom: 10px;
}
/* Fixes "margin collapse" issue for the first item. */
.list-item:first-child {
  margin-top: 0;
}
/* Fixes "margin collapse" issue for the last item. */
.list-item:last-child {
  margin-bottom: 0;
}
```

### Using `:first-child` or `:last-child` CSS Selectors

When using `:first-child` or `:last-child` CSS selectors to add style to the first or last item in the list, one should check that such added style doesn't affect the item's `height`, i.e. one should not add any `border` or `padding` in a `:first-child` or `:last-child` CSS selector, otherwise the list items will "jump" by the amount of added `height` during scrolling.

Here's an example of a `:first-child`/`:last-child` style that will not work correctly with `VirtualScroller`:

```css
/* Adds a 1px black border around each item in the list. Will not work correctly with `VirtualScroller`. */
.list-item {
  border-bottom: 1px solid black;
}
.list-item:first-child {
  border-top: 1px solid black;
}
```

### "Find on page" / Keyboard Focus Management / Text-To-Speech

Because "virtual scroller" only renders the items that're currently visible on screen, native web-browser features such as "Find on page" across the list items, shifting focus from one item to another using a `Tab` key, reading out loud the entire list contents using a "screen reader" — all those features simply can't work.

"Find on page" though is perhaps the simplest one of them to be able to work around: one could add a custom "🔍 Search" input field somewhere at the top of the list where a user would be able to input a search query and then the application would manually filter the items array and update the list to show only the matched ones.

### Image Dimensions

`VirtualScroller` measures item heights as soon as the items have rendered for the first time, and later uses those measurements to determine exactly which items should currently be visible when the user scrolls. This means that dynamic-height elements like `<img/>`s should have their dimensions fixed from the very start. For example, when rendering a simple `<img src="..."/>` element without specifying `width` and `height`, initially it renders itself with zero width and zero height, and only after the image file header has been downloaded and parsed does it resize itself to the actual size of the image. This would result in `VirtualScroller` initially measuring the image inside the list item as zero-width and zero-height, which will later cause a "jump of content" during scrolling because the item's height wasn't measured correctly. To avoid this bug, any `<img/>`s that're rendered inside `VirtualScroller` items must define their dimensions from the start, for example, using any of the following ways:

* Set explicit `width` and `height` in `<img/>` attributes or via CSS.

* Set `width: 100%` on the `<img/>` element and lock the [aspect ratio](https://www.w3schools.com/howto/howto_css_aspect_ratio.asp) by doing the following:
  * Wrap the `<img/>` element in a parent `<div/>` which has `position: relative` and `padding-bottom: ${100/aspectRatio}%`.
  * Set `position: absolute` on the `<img/>` element.

### How It Handles Window Resize

`VirtualScroller` automatically handles window resize. Here's a short technical description of how it does that internally for those who're curious. Anyone else should just skip this section.

When the items container width changes — for example, as a result of a window resize — any previously-measured item heights have to be reset because they're no longer relevant:

* If item elements include multi-line text content, the count of text lines might've changed because there's more or less width available now.

* Some CSS [`@media()`](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries) rules might have been added or removed, affecting the items layout.

If a resize happens when the list is showing items starting from the `N`-th one, all of the `N - 1` previous items' heights have to be remeasured too. Not right now though, because those items are currently not visible. They will be remeasured only if the user scrolls up to them. Until then, `VirtualScroller` will keep using the previously-measured item heights which, although no longer relevant, can't simply be thrown away without replacing them with the new measurements. So if the user will be scrolling up, those "stale" item heights will be gradually replaced with newly-measured ones, and the scroll position will be automatically corrected to avoid ["content jumping"](https://css-tricks.com/content-jumping-avoid/) during scrolling.

The "stale" item heights mentioned above are stored in `VirtualScroller` state under `beforeResize` key:

* `itemHeights: number[]`
* `verticalSpacing: number`
* `columnsCount: number`

<!--
(I briefly revisited this seciton and it seems like this edge case is no longer reproduced in Chrome. Hence, commented out this edge case description)

This automatic scroll position correction works fine in all cases except for the single one that I've discovered.

<details>
<summary>See an example of a single edge case when the automatic scroll position correction doesn't seem to work.</summary>

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
-->

### Using `<tbody/>` in Internet Explorer

Due to the [inherent limitations](https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1) of the `<tbody/>` HTML tag, when a `<tbody/>` is used as a container for the list items, the `VirtualScroller` ["core"](#core) component has to use a workaround that is based on CSS variables, and CSS variables aren't supported in Internet Explorer. Because of that, using a `<tbody/>` as a list items container won't work in Internet Explorer. In that case, `VirtualScroller` will render itself in "bypass" mode, i.e. it will just render all items from the start, without any "virtualization".

### "Item index N height changed unexpectedly" warning on page load in development mode

`VirtualScroller` assumes there'd be no "unexpected" (unannounced) changes in items' heights. If an item's height changes for whatever reason, a developer must announce it immediately by calling `.onItemHeightDidChange(item)` instance method.

There might still be cases outside of a developer's control when items' heights do change "unexpectedly". One such case is when running an application in "development" mode in a bundler such as Webpack, and the CSS styles or custom fonts haven't loaded yet, resulting in different item height measurements "before" and "after" the page has fully loaded. Note that this is not a bug of `VirtualScroller`. It's just an inconvenience introduced by a bundler such as Webpack, and only in "development" mode, i.e. it won't happen in production.

<details>

<summary>To filter out such "false" warnings, one could temporarily override <code>console.warn</code> function in development mode.</summary>

######

```js
const PAGE_LOAD_TIMEOUT = 1000

let consoleWarnHasBeenInstrumented = false

export default function suppressVirtualScrollerDevModePageLoadWarnings() {
  if (consoleWarnHasBeenInstrumented) {
    return
  }
  // `virtual-scroller` might produce false warnings about items changing their height unexpectedly.
  // https://gitlab.com/catamphetamine/virtual-scroller/#item-index-n-height-changed-unexpectedly-warning-on-page-load-in-dev-mode
  // That might be the case because Webpack hasn't yet loaded the styles by the time `virtual-scroller`
  // performs its initial items measurement.
  // To clear the console from such false warnings, a "page load timeout" is introduced in development mode.
  if (process.env.NODE_ENV !== 'production') {
    consoleWarnHasBeenInstrumented = true
    const originalConsoleWarn = console.warn
    const startedAt = Date.now()
    let muteVirtualScrollerUnexpectedHeightChangeWarnings = true
    console.warn = (...args) => {
      if (muteVirtualScrollerUnexpectedHeightChangeWarnings) {
        if (Date.now() - startedAt < PAGE_LOAD_TIMEOUT) {
          if (args[0] === '[virtual-scroller]' && args[1] === 'Item index' && args[3] === 'height changed unexpectedly: it was') {
            // Mute the warning.
            console.log('(muted `virtual-scroller` warning because the page hasn\'t loaded yet)')
            return
          }
        } else {
          muteVirtualScrollerUnexpectedHeightChangeWarnings = false
        }
      }
      return originalConsoleWarn(...args)
    }
  }
}
```
</details>

### Only the first item is rendered on page load in development mode

<details>
<summary>See the description of this very rare dev mode bug.</summary>

#####

`VirtualScroller` calculates the shown item indexes when the list gets initially rendered. But if the page styles are applied after the list is initially rendered — for example, if styles are applied "asynchronously" via javascript, like Webpack does it in development mode with its dynamic `style-loader` — then the list might not render correctly and will only show the first item. The reason for that is because calling `.getBoundingClientRect()` on the list items container DOM element returns an "incorrect" `top` position at the time of the initial render because the styles haven't been applied yet, and so `VirtualScroller` thinks that it's not even visible on screen.

For example, consider a page:

```html
<div class="page">
  <nav class="sidebar">...</nav>
  <main>...</main>
</div>
```

```css
.sidebar {
  position: fixed;
  width: 25%;
}

main {
  margin-left: 25%;
}
```

The sidebar is styled as `position: fixed`, but until the page styles have been applied, the sidebar is gonna be rendered like a regular `<div/>`, meaning that the `<main/>` element will initially be rendered below the entire sidebar block, causing the `<main/>` element to think that it's not even visible on screen, and so the list will only render the first item. Then, when page styles have been loaded and applied, the sidebar becomes `position: fixed`, and it no longer pushes the `<main/>` element downwards, making the `<main/>` element start at the top of the page, but `VirtualScroller` has already been initially rendered and it won't re-render itself until it has a reason to do so — that is when the user scrolls or the window is resized.

This type of a bug won't occur in production, but it could appear in development mode when using Webpack. `VirtualScroller` works around this development-mode bug by periodically calling `.getBoundingClientRect()` on the list items container DOM element (every second) to check if the `top` coordinate of the list has changed unexpectedly as a result of applying CSS styles, and if it has then it recalculates the currently-visible item indexes and re-renders the list.
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

To include this library directly via a `<script/>` tag on a page, one can use any npm CDN service, e.g. [unpkg.com](https://unpkg.com) or [jsdelivr.com](https://jsdelivr.com)

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

* Use [Resize Observer](https://caniuse.com/#search=Resize%20Observer) instead of calling `.onItemHeightDidChange(item)` manually.

* Currently React `<VirtualScroller/>` passes `onHeightDidChange()` property and provides `.renderItem(i)` instance method. Both these features could be replaced with doing it internally in `VirtualScroller`'s `.setItems(newItems)` method: it could detect the items that have changed (`prevItems[i] !== newItems[i]`) and recalculate heights for such items, while the changed `item` properties would also cause the relevant React elements to be rerendered.
-->

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