import VirtualScroller from './VirtualScroller'
import log from './log'

export default class DOMVirtualScroller {
  constructor(element, items, renderItem, options = {}) {
    this.container = element
    this.renderItem = renderItem
    const { onMount, ...restOptions } = options
    this.virtualScroller = new VirtualScroller(
      () => this.container,
      items,
      {
        ...restOptions,
        onStateChange: this.onStateChange
      }
    )
    if (onMount) {
      onMount()
    }
    this.virtualScroller.onMount()
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
    this.container.style.paddingTop = beforeItemsHeight + 'px'
    this.container.style.paddingBottom = afterItemsHeight + 'px'
    // Perform an intelligent "diff" re-render if the `items` are the same.
    const diffRender = prevState && items === prevState.items && prevState.items.length > 0
    // Remove no longer visible items from the DOM.
    if (diffRender) {
      log('Incremental render')
      // Decrement instead of increment here because
      // `this.container.removeChild()` changes indexes.
      let i = prevState.lastShownItemIndex
      while (i >= prevState.firstShownItemIndex) {
        if (i >= firstShownItemIndex && i <= lastShownItemIndex) {
          // The item is still being shown.
        } else {
          log('Remove item', i)
          // The item is no longer visible so remove it from the DOM.
          const item = this.container.childNodes[i - prevState.firstShownItemIndex]
          this.container.removeChild(item)
        }
        i--
      }
    } else {
      log('Clean render')
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild)
      }
    }
    // Add newly visible items to the DOM.
    let shouldPrependItems = diffRender
    const prependBeforeItemElement = shouldPrependItems && this.container.firstChild
    let i = firstShownItemIndex
    while (i <= lastShownItemIndex) {
      if (diffRender && i >= prevState.firstShownItemIndex && i <= prevState.lastShownItemIndex) {
        // The item is already shown, so don't re-render it.
        // Next new items will be appended rather than prepended.
        if (shouldPrependItems) {
          shouldPrependItems = false
        }
      } else {
        const item = this.renderItem(items[i])
        if (shouldPrependItems) {
          log('Prepend item', i)
          // Append `item` to `this.container` before the retained items.
          this.container.insertBefore(item, prependBeforeItemElement)
        } else {
          log('Append item', i)
          // Append `item` to `this.container`.
          this.container.appendChild(item)
        }
      }
      i++
    }
  }

  onUnmount = () => {
    this.virtualScroller.onUnmount()
  }

  onItemHeightChange(i) {
    this.virtualScroller.onItemHeightChange(i)
  }

  onLastSeenItemIndexChange(newLastSeenItemIndex, previousLastSeenItemIndex) {
    this.virtualScroller.onLastSeenItemIndexChange(newLastSeenItemIndex, previousLastSeenItemIndex)
  }

  updateItems(newItems, options) {
    this.virtualScroller.updateItems(newItems, options)
  }
}