import VirtualScrollerCore from '../VirtualScroller.js'

import log, { warn } from '../utility/debug.js'
import px from '../utility/px.js'

export default class VirtualScroller {
  constructor(itemsContainerElement, items, renderItem, options = {}) {
    this.getItemsContainerElement = typeof itemsContainerElement === 'function'
      ? itemsContainerElement
      : () => itemsContainerElement

    this.renderItem = renderItem

    const {
      onMount,
      onItemUnmount,
      readyToStart,
      readyToRender,
      ...restOptions
    } = options

    // `onMount()` option is deprecated due to no longer being used.
    // If someone thinks there's a valid use case for it, create an issue.
    this._onMount = onMount

    this.onItemUnmount = onItemUnmount

    this.virtualScroller = new VirtualScrollerCore(
      this.getItemsContainerElement,
      items,
      {
        ...restOptions,
        render: this.render
      }
    )

    if (readyToRender === false) {
      // Don't automatically perform the initial render of the list.
      // This means that neither `this.render()` nor `this.start()` methods should be called.
    } else if (readyToStart === false) {
      // Don't automatically call the `.start()` method of the "core" component.
      // Still, perform the initial render of the list.
      this.render(this.virtualScroller.getInitialState())
    } else {
      // Calls the `.start()` method of the "core" component.
      // It performs the initial render of the list and starts listening to scroll events.
      this.start()
    }
  }

  render = (state, prevState) => {
    const {
      items,
      firstShownItemIndex,
      lastShownItemIndex,
      beforeItemsHeight,
      afterItemsHeight
    } = state

    const itemsContainerElement = this.getItemsContainerElement()

    // log('~ On state change ~')
    // log('Previous state', prevState)
    // log('New state', state)

    // Set items container's padding-top and padding-bottom.
    // But only do that for a non-`<tbody/>` item container
    // because, strangely, CSS `padding` doesn't work on a `<tbody/>` element.
    // https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
    //
    // `this.virtualScroller` hasn't been initialized yet at this stage,
    // so this code can't use `this.virtualScroller.isItemsContainerElementTableBody()` function yet.
    // Instead, it uses its own method of detecting the use of a `<tbody/>` container.
    //
    if (!this.virtualScroller.isItemsContainerElementTableBody()) {
      itemsContainerElement.style.paddingTop = px(beforeItemsHeight)
      itemsContainerElement.style.paddingBottom = px(afterItemsHeight)
    }

    // Perform an intelligent "diff" re-render if the `items` are the same.
    const diffRender = prevState && items === prevState.items && items.length > 0
    // Remove no longer visible items from the DOM.
    if (diffRender) {
      // Decrement instead of increment here because
      // `itemsContainerElement.removeChild()` changes indexes.
      let i = prevState.lastShownItemIndex
      while (i >= prevState.firstShownItemIndex) {
        if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
          // The item is still visible.
        } else {
          log('DOM: Remove element for item index', i)
          // The item is no longer visible. Remove it.
          this.unmountItem(itemsContainerElement.childNodes[i - prevState.firstShownItemIndex])
        }
        i--
      }
    } else {
      log('DOM: Rerender the list from scratch')
      while (itemsContainerElement.firstChild) {
        this.unmountItem(itemsContainerElement.firstChild)
      }
    }

    // Add newly visible items to the DOM.
    let shouldPrependItems = diffRender
    const prependBeforeItemElement = shouldPrependItems && itemsContainerElement.firstChild
    let i = firstShownItemIndex
    while (i <= lastShownItemIndex) {
      if (diffRender && i >= prevState.firstShownItemIndex && i <= prevState.lastShownItemIndex) {
        // The item is already being rendered.
        // Next items will be appended rather than prepended.
        if (shouldPrependItems) {
          shouldPrependItems = false
        }
      } else {
        const item = this.renderItem(items[i])
        if (shouldPrependItems) {
          log('DOM: Prepend element for item index', i)
          // Append `item` to `itemsContainerElement` before the retained items.
          itemsContainerElement.insertBefore(item, prependBeforeItemElement)
        } else {
          log('DOM: Append element for item index', i)
          // Append `item` to `itemsContainerElement`.
          itemsContainerElement.appendChild(item)
        }
      }
      i++
    }

    // Call `onMount()` function when the list has rendered for the first time.
    //
    // `onMount()` option is deprecated due to no longer being used.
    // If someone thinks there's a valid use case for it, create an issue.
    //
    if (!this._isMounted) {
      this._isMounted = true
      if (this._onMount) {
        this._onMount()
      }
    }
  }

  // Public API. Should be "bound" to `this`.
  onUnmount = () => {
    warn('`.onUnmount()` instance method name is deprecated, use `.stop()` instance method name instead.')
    this.stop()
  }

  // Public API. Should be "bound" to `this`.
  destroy = () => {
    warn('`.destroy()` instance method name is deprecated, use `.stop()` instance method name instead.')
    this.stop()
  }

  // Public API.
  // Should be "bound" to `this`.
  stop = () => {
    this.virtualScroller.stop()
  }

  // Potentially public API in some hypothetical scenario.
  // Should be "bound" to `this`.
  start = () => {
    this.virtualScroller.start()
  }

  unmountItem(itemElement) {
    this.getItemsContainerElement().removeChild(itemElement)

    if (this.onItemUnmount) {
      this.onItemUnmount(itemElement)
    }
  }

  /**
   * @deprecated
   * `.onItemHeightChange()` has been renamed to `.onItemHeightDidChange()`.
   */
  onItemHeightChange(i) {
    warn('`.onItemHeightChange(i)` method was renamed to `.onItemHeightDidChange(i)`')
    this.onItemHeightDidChange(i)
  }

  onItemHeightDidChange(i) {
    this.virtualScroller.onItemHeightDidChange(i)
  }

  setItemState(i, newState) {
    this.virtualScroller.setItemState(i, newState)
  }

  /**
   * @deprecated
   * `.updateItems()` has been renamed to `.setItems()`.
   */
  updateItems(newItems, options) {
    warn('`.updateItems()` method was renamed to `.setItems(i)`')
    this.setItems(newItems, options)
  }

  setItems(newItems, options) {
    this.virtualScroller.setItems(newItems, options)
  }

  /*
  getItemCoordinates(i) {
    return this.virtualScroller.getItemCoordinates(i)
  }
  */
}