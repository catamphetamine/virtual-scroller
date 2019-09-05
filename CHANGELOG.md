<!-- `virtual-scroller`: in `.updateItems()` handle a case when `items.length` is the same, in which case find different items and if those items are rendered then maybe update them on screen and update their height, if the items are past rendered then maybe just discard all item heights past rendered, if the items are before rendered then maybe ignore and it will jump on scroll up which is kinda acceptable. -->

1.0.8 / 10.08.2019
==================

* Removed `onLastSeenItemIndexChange(newIndex, prevIndex)` option, use `onItemFirstRender(i)` option instead.