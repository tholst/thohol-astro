---
title: Hey DOM, where are you (currently visible)?
description: Get notified when DOM elements are scrolling in/out of viewport; Lazy Loading of Images; IntersectionObserver
pubDate: 2019-11-10
updatedDate: 
---

Is some DOM element currently visible? Is it fully visible, or only partially? Is it currently moving into view or is it leaving the screen? [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) can answer these questions (and some more generic ones)!

Below is a short intro to the basic usage of IntersectionObserver. A common use case is the lazy/delayed-loading of images (see [delayed loading example below](#delay-loading-example)).

## Support and Alternatives

-   The use of IntersectionObserver is [not supported on IE](https://caniuse.com/#feat=intersectionobserver).
-   Alternative approaches include
    -   connect to scroll event
    -   using periodic timer and calling `getBoundingClientRect()` on target (observed) element --> NOT a good option because it is "painfully slow as each call to getBoundingClientRect() forces the browser to re-layout the entire page and will introduce considerable jank to your website".

## Links

-   [W3C Spec](https://w3c.github.io/IntersectionObserver/)
-   [Google Developer Article](https://developers.google.com/web/updates/2016/04/intersectionobserver)
-   [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
-   [Polyfill](https://github.com/w3c/IntersectionObserver/tree/master/polyfill)

## Minimal Example

### HTML

```html
<div id="scrollArea">
    ...
    <div id="listItem">...</div>
    ...
</div>
```

### JavaScript (3 Steps)

#### 1. Create Observer on a given "viewport"

```js
let options = {
    root: document.querySelector("#scrollArea"),
    rootMargin: "0px 0px 0px 0px",
    threshold: 1.0
};

let observer = new IntersectionObserver(callback, options);
```

**The given `options` have the following meaning**

-   **`root`**: The element that is used as the **viewport** for checking visiblity of the target. Must be the ancestor of the target. Defaults to the browser viewport if not specified or if null.
-   **`rootMargin`**: This set of values serves to grow or shrink each side of the root element's bounding box before computing intersections. Defaults to all zeros.
-   **`threshold`**: Either a **single number** _or_ **an array of numbers** which indicate at what percentage of the target's visibility the observer's callback should be executed.
    A threshold of `1.0` means that when 100% of the target is visible within the element specified by the root option, the callback is invoked. If you only want to detect when visibility passes the 50% mark, you can use a value of `0.5`. If you want the callback to run every time visibility passes another 25%, you would specify the array `[0, 0.25, 0.5, 0.75, 1]`. The default is `0` (meaning as soon as even one pixel is visible, the callback will be run). A value of `1.0` means that the threshold isn't considered passed until every pixel is visible.

#### 2. Observe a target element

The target must be a descendant of the root element.

```js
let target = document.querySelector("#listItem"); 
observer.observe(target);
```

#### 3. Handle target observations

Whenever the target meets a threshold specified for the observer, the callback is invoked.

```js
let callback = (entries, observer) => {
    // The callback receives a list of
    // IntersectionObserverEntry objects
    // and the observer:
    entries.forEach(entry => {
        // handle intersections
        ...
    });
};
```

Each **`IntersectionObserverEntry`** (`entry` above) describes an intersection change for one observed target element. An **`entry`** object has the following properties:

-   **`entry.boundingClientRect`**
-   **`entry.intersectionRatio`**: Returns the ratio of the intersectionRect to the boundingClientRect. This will NOT neccessarily be one of the tresholds specified for the observer, but the actual ratio. Tresholds only specify that the callback should be called whenever a treshold is crossed.
-   **`entry.intersectionRect`**: Returns a DOMRectReadOnly representing the target's visible area.
-   **`entry.isIntersecting`**: A Boolean value which is true if the target element intersects with the intersection observer's root. If this is true, then, the IntersectionObserverEntry describes a transition into a state of intersection; if it's false, then you know the transition is from intersecting to not-intersecting.
-   **`entry.rootBounds`**
-   **`entry.target`**: The Element whose intersection with the root changed.
-   **`entry.time`**

## Delay Loading Example

from [W3C's Intersection Observers Explained](https://github.com/w3c/IntersectionObserver/blob/master/explainer.md)

Many sites like to avoid loading certain resources until they're near the viewport. This is easy to do with an IntersectionObserver:

```html
<!-- index.html -->
<div class="lazy-loaded">
    <template>
        ...
    </template>
</div>
```

```js
function query(selector) {
    return Array.from(document.querySelectorAll(selector));
}

var observer = new IntersectionObserver(
    // Pre-load items that are within 2 multiples of the 
    // visible viewport height.
    function(changes) {
        changes.forEach(function(change) {
            var container = change.target;
            var content = container
                .querySelector("template").content;
            container.appendChild(content);
            observer.unobserve(container);
        });
    },
    { rootMargin: "200% 0%" }
);

// Set up lazy loading
query(".lazy-loaded").forEach(function(item) {
    observer.observe(item);
});
```