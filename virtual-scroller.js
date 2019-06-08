!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).VirtualScroller=t()}(this,function(){"use strict";function e(t){return(e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(t)}var t=Object.prototype.hasOwnProperty;function n(e,t){return e===t?0!==e||0!==t||1/e==1/t:e!=e&&t!=t}function i(){return window.pageYOffset}function s(){return window.innerHeight}function r(e){return function(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}(e)||function(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function o(){if(a()){for(var e,t=arguments.length,n=new Array(t),i=0;i<t;i++)n[i]=arguments[i];(e=console).log.apply(e,r(["[virtual-scroller]"].concat(n)))}}function a(){return"undefined"!=typeof window&&window.VirtualScrollerDebug}function h(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}var u=function(){function e(t,n,i){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.getContainerNode=t,this.getState=i,this.measuredItemsHeight=0;for(var s=0;s<i().itemHeights.length;){if(null==i().itemHeights[s]){if(void 0!==this.firstMeasuredItemIndex){this.lastMeasuredItemIndex=s-1;break}}else void 0===this.firstMeasuredItemIndex&&(this.firstMeasuredItemIndex=s),this.measuredItemsHeight+=i().itemHeights[s];s++}}var t,n,i;return t=e,(n=[{key:"_getItemHeight",value:function(e,t){var n=this.getContainerNode();if(n){var i=e-t;if(i>=0&&i<n.childNodes.length)return n.childNodes[i].getBoundingClientRect().height}}},{key:"getItemSpacing",value:function(){var e=this.getContainerNode();if(e&&e.childNodes.length>1){var t=e.childNodes[0],n=e.childNodes[1],i=t.getBoundingClientRect(),s=n.getBoundingClientRect().top-(i.top+i.height);return window.VirtualScrollerDebug&&o("Item spacing",s),s}}},{key:"update",value:function(e,t,n){void 0===this.getState().itemSpacing&&(this.getState().itemSpacing=this.getItemSpacing()),void 0!==this.firstMeasuredItemIndex&&(e>this.lastMeasuredItemIndex+1||t<this.firstMeasuredItemIndex-1)&&(this.previousAverageItemHeight=this.averageItemHeight,this.previousAverageItemHeightSamplesCount=this.lastMeasuredItemIndex-this.firstMeasuredItemIndex+1,this.measuredItemsHeight=0,this.firstMeasuredItemIndex=void 0,this.lastMeasuredItemIndex=void 0);for(var i=this.firstMeasuredItemIndex,s=this.lastMeasuredItemIndex,r=!1,o=e;o<=t;){var a=this._getItemHeight(o,n);void 0!==a&&(this.set(o,a),(void 0===i||o<i)&&(this.measuredItemsHeight+=a,r||(this.firstMeasuredItemIndex=o,r=!0)),(void 0===s||o>s)&&(void 0!==s&&(this.measuredItemsHeight+=a),this.lastMeasuredItemIndex=o)),o++}this.updateAverageItemHeight()}},{key:"updateItemHeight",value:function(e,t){var n=this.get(e),i=this._getItemHeight(e,t);void 0!==n&&void 0!==i&&(this.set(e,i),this.measuredItemsHeight+=i-n)}},{key:"updateAverageItemHeight",value:function(){this.averageItemHeightSamplesCount=this.lastMeasuredItemIndex-this.firstMeasuredItemIndex+1,this.averageItemHeight=this.measuredItemsHeight/this.averageItemHeightSamplesCount}},{key:"getAverage",value:function(){return this.previousAverageItemHeight&&this.previousAverageItemHeightSamplesCount>this.averageItemHeightSamplesCount?this.previousAverageItemHeight:this.averageItemHeight||0}},{key:"get",value:function(e){return this.getState().itemHeights[e]}},{key:"set",value:function(e,t){this.getState().itemHeights[e]=t}},{key:"onPrepend",value:function(e){void 0!==this.firstMeasuredItemIndex&&(this.firstMeasuredItemIndex+=e,this.lastMeasuredItemIndex+=e)}}])&&h(t.prototype,n),i&&h(t,i),e}();function d(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{},i=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(i=i.concat(Object.getOwnPropertySymbols(n).filter(function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),i.forEach(function(t){g(e,t,n[t])})}return e}function m(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}function g(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}return function(){function r(a,h){var m=this,l=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,r),g(this,"onScroll",function(){return m.onUpdateShownItemIndexes({reason:"scroll"})}),g(this,"onResize",function(){return m.onUpdateShownItemIndexes({reason:"resize"})}),g(this,"updateShownItemIndexes",function(e){var t,n,r,a,h,u,d=(t=m.getContainerNode(),n=t.getBoundingClientRect(),r=document.clientLeft||document.body.clientLeft||0,a=document.clientTop||document.body.clientTop||0,h=window.pageYOffset,u=window.pageXOffset,{top:n.top+h-a,left:n.left+u-r,width:n.width,height:n.height}),g=d.top,l=d.height,I=function(){var e=s();return{top:i(),bottom:i()+e,height:e}}(),c=I.top,f=I.bottom;m.latestLayoutScreenTopAfterMargin=c-m.getMargin(),m.latestLayoutScreenBottomAfterMargin=f+m.getMargin();var v=m.getItemIndexes(c-m.getMargin(),f+m.getMargin(),g,g+l),p=v.firstShownItemIndex,S=v.lastShownItemIndex,y=v.redoLayoutAfterRender,w=m.getBeforeItemsHeight(p,S),x=m.getAfterItemsHeight(p,S);m.updateWillBeHiddenItemHeightsAndState(p,S),o("~ Layout results ~"),o("First shown item index",p),o("Last shown item index",S),o("Before items height",w),o("After items height",x),o("Average item height (for previous layout)",m.itemHeights.getAverage()),y&&o("Redo layout after render"),m.onShowItems(p,S),m.setState({firstShownItemIndex:p,lastShownItemIndex:S,beforeItemsHeight:w,afterItemsHeight:x},function(){return e(y?1:0)})}),g(this,"updateShownItemIndexesRecursive",function(){m.updateShownItemIndexes(function(e){1===e?setTimeout(function(){m.isMounted?m.updateShownItemIndexesRecursive():m.onDoneUpdatingItemIndexes()}):m.onDoneUpdatingItemIndexes()})}),g(this,"restoreScroll",function(){var e=m.restoreScrollAfterPrepend,t=e.index,n=e.screenTop;m.restoreScrollAfterPrepend=void 0;var s=m.getItemElement(t).getBoundingClientRect().top-n;0!==s&&(o("Restore scroll position: scroll by",s),window.scrollTo(0,i()+s))}),g(this,"onUpdateShownItemIndexes",function(e){var t=e.reason;e.force;if(0!==m.getItemsCount()&&!m.isUpdatingItemIndexes){if(clearTimeout(m.onUserStopsScrollingTimeout),"scroll"===t){var n=void 0!==m.latestLayoutScreenTopAfterMargin&&i()<m.latestLayoutScreenTopAfterMargin&&m.getState().firstShownItemIndex>0||void 0!==m.latestLayoutScreenBottomAfterMargin&&i()+s()>m.latestLayoutScreenBottomAfterMargin&&m.getState().lastShownItemIndex<m.getItemsCount()-1;if(o(n?"The user has scrolled far enough: force re-render":"The user hasn't scrolled too much: delay re-render"),!n)return m.onUserStopsScrollingTimeout=setTimeout(m.onUserStoppedScrolling,100)}m.updateLayout(t)}}),g(this,"onUserStoppedScrolling",function(){m.isMounted&&m.updateLayout("stopped scrolling")});var I=l.getState,c=l.setState,f=l.onStateChange,v=l.estimatedItemHeight,p=l.onLastSeenItemIndexChange,S=l.state;o("~ Initialize ~"),S&&(h=S.items),this.initialItems=h,this.estimatedItemHeight=v,p&&(this.onLastSeenItemIndexChange=p,this.lastSeenItemIndex=-1),a()&&function(e){for(;e.firstChild;)e.removeChild(e.firstChild)}(a()),c?(this.getState=I,this.setState=c):(this.getState=function(){return m.state},this.setState=function(i,s){var r=m.state;m.state=d({},r,i),function(i,s){if(n(i,s))return!0;if("object"!==e(i)||null===i||"object"!==e(s)||null===s)return!1;var r=Object.keys(i),o=Object.keys(s);if(r.length!==o.length)return!1;for(var a=0;a<r.length;a++)if(!t.call(s,r[a])||!n(i[r[a]],s[r[a]]))return!1;return!0}(m.state,r)||(f&&f(m.state,r),m.isMounted&&m.onUpdate(r)),s&&s()}),S&&o("Initial state (passed)",S),this.setState(S||this.getInitialState()),this.getContainerNode=a,this.itemHeights=new u(a,h.length,this.getState),o("Items count",h.length),v&&o("Estimated item height",v)}var h,l,I;return h=r,(l=[{key:"getInitialState",value:function(e){var t,n,i=this.initialItems.length;i>0&&(t=Math.min(0,i-1),n=this.getLastShownItemIndex(t,i)),this.onShowItems(t,n);var s=d({},e,{items:this.initialItems,itemStates:new Array(i),itemHeights:new Array(i),itemSpacing:void 0,beforeItemsHeight:0,afterItemsHeight:0,firstShownItemIndex:t,lastShownItemIndex:n});return o("Initial state (created)",s),o("First shown item index",t),o("Last shown item index",n),s}},{key:"getEstimatedItemHeight",value:function(){return this.itemHeights&&this.itemHeights.getAverage()||this.estimatedItemHeight||0}},{key:"getItemSpacing",value:function(){return this.getState().itemSpacing||0}},{key:"getEstimatedItemsCount",value:function(e){return this.getEstimatedItemHeight()?Math.ceil((e+this.getItemSpacing())/(this.getEstimatedItemHeight()+this.getItemSpacing())):1}},{key:"getEstimatedItemsCountOnScreen",value:function(){return"undefined"!=typeof window?this.getEstimatedItemsCount(window.innerHeight):1}},{key:"getLastShownItemIndex",value:function(e,t){return Math.min(e+(this.getEstimatedItemsCountOnScreen()-1),t-1)}},{key:"getItemsCount",value:function(){return this.getState().items.length}},{key:"getMargin",value:function(){return window.innerHeight}},{key:"onShowItems",value:function(e,t){this.onLastSeenItemIndexChange&&t>this.lastSeenItemIndex&&(this.lastSeenItemIndex=t,this.onLastSeenItemIndexChange(this.lastSeenItemIndex))}},{key:"onMount",value:function(){var e=this.getState(),t=e.firstShownItemIndex,n=e.lastShownItemIndex;this.getItemsCount()>0&&this.updateItemHeights(t,n),this.isMounted=!0,this.onUpdateShownItemIndexes({reason:"on mount"}),window.addEventListener("scroll",this.onScroll),window.addEventListener("resize",this.onResize)}},{key:"onUnmount",value:function(){this.isMounted=!1,window.removeEventListener("scroll",this.onScroll),window.removeEventListener("resize",this.onResize),clearTimeout(this.onUserStopsScrollingTimeout)}},{key:"onUpdate",value:function(e){var t=this.getState(),n=t.items,i=t.firstShownItemIndex,s=t.lastShownItemIndex;i===e.firstShownItemIndex&&s===e.lastShownItemIndex&&n===e.items||this.updateItemHeights(i,s)}},{key:"updateItemHeights",value:function(e,t){var n=this.getState().firstShownItemIndex;void 0!==e&&this.itemHeights.update(e,t,n)}},{key:"updateItemHeight",value:function(e){var t=this.getState().firstShownItemIndex;this.itemHeights.updateItemHeight(e,t)}},{key:"onItemStateChange",value:function(e,t){a()&&(o("Item",e,"state changed"),o("Previous state\n"+JSON.stringify(this.getState().itemStates[e],null,2)),o("New state\n"+JSON.stringify(t,null,2))),this.getState().itemStates[e]=t}},{key:"onItemHeightChange",value:function(e){var t=this.getState().itemHeights,n=t[e];this.updateItemHeight(e);var i=t[e];n!==i&&(o("Item",e,"height changed from",n,"to",i),this.onUpdateShownItemIndexes({reason:"item height change"}))}},{key:"getVisibleItemIndexes",value:function(e,t,n){for(var i,s,r=0,a=!1,h=0;h<this.getItemsCount();){var u=this.itemHeights.get(h);if(void 0===u){o("Item ".concat(h," height hasn't been measured yet: render and redo layout")),void 0===i&&(i=h);var d=t-(n+r),m=this.getEstimatedItemsCount(d);s=Math.min(h+(m-1),this.getItemsCount()-1),a=!0;break}if(r+=u,void 0===i&&n+r>e&&(o("First visible item index (including margin)",h),i=h),h<this.getItemsCount()-1&&(r+=this.getItemSpacing()),n+r>t){o("Last visible item index (including margin)",h),void 0!==i&&(s=h);break}h++}return void 0!==i&&void 0===s&&o("Last item index (is fully visible)",s=this.getItemsCount()-1),this.restoreScrollAfterPrepend&&(s<this.restoreScrollAfterPrepend.index&&(s=this.restoreScrollAfterPrepend.index),a=!1),{firstShownItemIndex:i,lastShownItemIndex:s,redoLayoutAfterRender:a}}},{key:"getInvisibleItemIndexes",value:function(){return{firstShownItemIndex:0,lastShownItemIndex:0,redoLayoutAfterRender:void 0===this.itemHeights.get(0)}}},{key:"getItemIndexes",value:function(e,t,n,i){if(!(i>e&&n<t))return this.getInvisibleItemIndexes();var s=this.getVisibleItemIndexes(e,t,n);return void 0===s.firstShownItemIndex?this.getInvisibleItemIndexes():s}},{key:"getBeforeItemsHeight",value:function(e,t){for(var n=0,i=0;i<e;)n+=this.itemHeights.get(i)||this.itemHeights.getAverage(),n+=this.getItemSpacing(),i++;return n}},{key:"getAfterItemsHeight",value:function(e,t){for(var n=0,i=t+1;i<this.getItemsCount();)n+=this.getItemSpacing(),n+=this.itemHeights.get(i)||this.itemHeights.getAverage(),i++;return n}},{key:"updateWillBeHiddenItemHeightsAndState",value:function(e,t){for(var n=this.getState().firstShownItemIndex;n<=this.getState().lastShownItemIndex;)n>=e&&n<=t||this.updateItemHeight(n),n++}},{key:"onDoneUpdatingItemIndexes",value:function(){this.isUpdatingItemIndexes=!1,this.restoreScrollAfterPrepend&&this.restoreScroll()}},{key:"captureScroll",value:function(e,t,n){0!==e.length&&(void 0===n&&(n=t.indexOf(e[0])),n<0||0!==n&&(this.getState().firstShownItemIndex>0||this.restoreScrollAfterPrepend&&this.restoreScrollAfterPrepend.previousItems===e&&this.restoreScrollAfterPrepend.nextItems===t||(this.restoreScrollAfterPrepend={previousItems:e,nextItems:t,index:n,screenTop:this.getItemElement(0).getBoundingClientRect().top})))}},{key:"updateLayout",value:function(e){o("~ Update layout (".concat(e,") ~")),this.isUpdatingItemIndexes=!0,this.updateShownItemIndexesRecursive()}},{key:"updateItems",value:function(e){var t=this,n=this.getState().items,i=this.getState(),s=i.firstShownItemIndex,r=i.lastShownItemIndex,a=i.beforeItemsHeight,h=i.afterItemsHeight,m=i.itemStates,g=i.itemHeights;i.itemSpacing;o("~ Update items ~");var l=function(e,t){var n=-1,i=-1;e.length>0&&(n=t.indexOf(e[0]))>=0&&function(e,t,n){var i=0;for(;i<e.length;){if(t.length<=n+i||t[n+i]!==e[i])return!1;i++}return!0}(e,t,n)&&(i=n+e.length-1);if(n>=0&&i>=0)return{prependedItemsCount:n,appendedItemsCount:t.length-(i+1)};return{prependedItemsCount:-1,appendedItemsCount:-1}}(n,e),I=l.prependedItemsCount,c=l.appendedItemsCount;I>0||c>0?(I>0&&(o("Prepended items count",I),g=new Array(I).concat(g),this.itemHeights.onPrepend(I),m&&(m=new Array(I).concat(m)),this.captureScroll(n,e,I)),c>0&&(o("Appended items count",c),g=g.concat(new Array(c)),m&&(m=m.concat(new Array(c)))),s+=I,r+=I,a+=this.itemHeights.getAverage()*I,h+=this.itemHeights.getAverage()*c):(o("Non-incremental items update"),o("Previous items",n),o("New items",e),this.itemHeights=new u(this.getContainerNode,e.length,this.getState),g=new Array(e.length),m=new Array(e.length),0===e.length?(s=void 0,r=void 0):(s=0,r=this.getLastShownItemIndex(s,e.length)),a=0,h=0),this.setState(d({},void 0,{items:e,itemStates:m,itemHeights:g,firstShownItemIndex:s,lastShownItemIndex:r,beforeItemsHeight:a,afterItemsHeight:h}),function(){t.onUpdateShownItemIndexes({reason:"update items",force:!0})})}},{key:"getItemElement",value:function(e){return this.getContainerNode().childNodes[e]}}])&&m(h.prototype,l),I&&m(h,I),r}()});
//# sourceMappingURL=virtual-scroller.js.map
