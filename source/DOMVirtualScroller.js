import VirtualScroller from './VirtualScroller'
import log from './log'
import { px } from './utility'

export default class DOMVirtualScroller {
  constructor(element, items, renderItem, options = {}) {
    this.container = element
    this.renderItem = renderItem
    const {
      onMount,
      onItemUnmount,
      ...restOptions
    } = options
    this.onItemUnmount = onItemUnmount
    this.tbody = this.container.tagName === 'TBODY'
    this.virtualScroller = new VirtualScroller(
      () => this.container,
      items,
      {
        ...restOptions,
        tbody: this.tbody,
        onStateChange: this.onStateChange
      }
    )
    // `onMount()` option is deprecated due to no longer being used.
    // If someone thinks there's a valid use case for it, create an issue.
    if (onMount) {
      onMount()
    }
    this.virtualScroller.listen()
  }

  onStateChange = (state, prevState) => {
    const {
      items,
      firstShownItemIndex,
      lastShownItemIndex,
      beforeItemsHeight,
      afterItemsHeight
    } = state
    log('~ On state change ~')
    log('Previous state', prevState)
    log('New state', state)
    // Set container padding top and bottom.
    // Work around `<tbody/>` not being able to have `padding`.
    // https://gitlab.com/catamphetamine/virtual-scroller/-/issues/1
    // `this.virtualScroller` hasn't been initialized yet at this stage,
    // so using `this.tbody` instead of `this.virtualScroller.tbody`.
    if (!this.tbody) {
      this.container.style.paddingTop = px(beforeItemsHeight)
      this.container.style.paddingBottom = px(afterItemsHeight)
    }
    // Perform an intelligent "diff" re-render if the `items` are the same.
    const diffRender = prevState && items === prevState.items && items.length > 0
    // Remove no longer visible items from the DOM.
    if (diffRender) {
      log('Incremental rerender')
      // Decrement instead of increment here because
      // `this.container.removeChild()` changes indexes.
      let i = prevState.lastShownItemIndex
      while (i >= prevState.firstShownItemIndex) {
        if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
          // The item is still visible.
        } else {
          log('Remove item index', i)
          // The item is no longer visible. Remove it.
          this.unmountItem(this.container.childNodes[i - prevState.firstShownItemIndex])
        }
        i--
      }
    } else {
      log('Rerender from scratch')
      while (this.container.firstChild) {
        this.unmountItem(this.container.firstChild)
      }
    }
    // Add newly visible items to the DOM.
    let shouldPrependItems = diffRender
    const prependBeforeItemElement = shouldPrependItems && this.container.firstChild
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
          log('Prepend item index', i)
          // Append `item` to `this.container` before the retained items.
          this.container.insertBefore(item, prependBeforeItemElement)
        } else {
          log('Append item index', i)
          // Append `item` to `this.container`.
          this.container.appendChild(item)
        }
      }
      i++
    }
  }

  // Public API. Should be "bound" to `this`.
  onUnmount = () => {
    console.warn('[virtual-scroller] `.onUnmount()` instance method name is deprecated, use `.stop()` instance method name instead.')
    this.stop()
  }

  // Public API. Should be "bound" to `this`.
  destroy = () => {
    console.warn('[virtual-scroller] `.destroy()` instance method name is deprecated, use `.stop()` instance method name instead.')
    this.stop()
  }

  // Public API. Should be "bound" to `this`.
  stop = () => {
    this.virtualScroller.stop()
  }

  unmountItem(itemElement) {
    this.container.removeChild(itemElement)
    if (this.onItemUnmount) {
      this.onItemUnmount(itemElement)
    }
  }

  onItemHeightChange(i) {
    this.virtualScroller.onItemHeightChange(i)
  }

  /**
   * @deprecated
   * `.updateItems()` has been renamed to `.setItems()`.
   */
  updateItems(newItems, options) {
    this.setItems(newItems, options)
  }

  setItems(newItems, options) {
    this.virtualScroller.setItems(newItems, options)
  }

  getItemCoordinates(i) {
    return this.virtualScroller.getItemCoordinates(i)
  }
}