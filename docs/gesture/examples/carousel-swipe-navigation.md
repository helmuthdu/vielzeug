---
title: 'Gesture Examples — Carousel Pan Navigation'
description: 'Use gesture pan recognition to navigate a carousel.'
---

## Carousel Pan Navigation

### Problem

You need horizontal pan navigation in a carousel without coupling input recognition to rendering logic. The carousel must track the finger during the pan (live transform), commit to next/previous when the released distance crosses an application-defined threshold, and snap back if the gesture releases below threshold. It must coexist with vertical scrolling on touch devices — a horizontal pan must not hijack a vertical page scroll.

### Solution

Attach `createPanGesture` to the carousel track. Use `onMove` for the live transform and `onEnd` for the slide change or snap-back. `axis: 'x'` ensures vertical pointer movement ends the pending interaction without invoking callbacks. The threshold lives in your `onEnd` logic, not in the gesture handle.

```html
<div class="carousel" aria-roledescription="carousel" aria-label="Featured images">
  <div class="carousel-track" id="track">
    <div class="slide" aria-roledescription="slide" aria-label="1 of 4"><img src="/img/1.jpg" alt="" /></div>
    <div class="slide" aria-roledescription="slide" aria-label="2 of 4"><img src="/img/2.jpg" alt="" /></div>
    <div class="slide" aria-roledescription="slide" aria-label="3 of 4"><img src="/img/3.jpg" alt="" /></div>
    <div class="slide" aria-roledescription="slide" aria-label="4 of 4"><img src="/img/4.jpg" alt="" /></div>
  </div>
  <button class="carousel-prev" id="prev" aria-label="Previous slide">‹</button>
  <button class="carousel-next" id="next" aria-label="Next slide">›</button>
</div>
```

```css
.carousel {
  position: relative;
  overflow: hidden;
  touch-action: pan-y; /* Allow vertical scroll, own horizontal pans */
}

.carousel-track {
  display: flex;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.carousel-track.panning {
  transition: none; /* Kill CSS easing while tracking the finger */
}

.slide {
  flex: 0 0 100%;
  user-select: none;
}
```

```ts
import { createPanGesture } from '@vielzeug/gesture';

const track = document.getElementById('track')!;
const slides = track.children.length;
let current = 0;

const slideWidth = (): number => track.firstElementChild?.getBoundingClientRect().width ?? 0;
const threshold = (): number => slideWidth() * 0.18;

const goTo = (index: number): void => {
  current = Math.max(0, Math.min(index, slides - 1));
  track.style.transform = `translateX(${-current * slideWidth()}px)`;
};

const pan = createPanGesture(track, {
  axis: 'x',
  onMove: ({ distance }) => {
    track.classList.add('panning');
    track.style.transform = `translateX(${-current * slideWidth() + distance}px)`;
  },
  onEnd: ({ distance, reason }) => {
    track.classList.remove('panning');

    // A cancel (disabled flip, pointercancel) always snaps back.
    if (reason !== 'release') {
      goTo(current);
      return;
    }

    // Application-owned threshold: 18% of slide width.
    if (Math.abs(distance) >= threshold()) {
      goTo(distance < 0 ? current + 1 : current - 1);
    } else {
      goTo(current); // Snap back to current slide
    }
  },
});

document.getElementById('prev')!.addEventListener('click', () => goTo(current - 1));
document.getElementById('next')!.addEventListener('click', () => goTo(current + 1));

// Dispose when the carousel leaves the DOM.
// pan.dispose();
```

### Pitfalls

- **Set `touch-action: pan-y` on the surface.** Without it, the browser may interpret the horizontal pointer movement as a native swipe and steal the gesture. `pan-y` lets vertical scrolls pass through while you own horizontal pans.
- **Toggle a `panning` class to kill CSS transitions during `onMove`.** A 300ms ease transform fights the per-frame `translateX` updates from `onMove` and produces visible lag.
- **Handle `reason: 'cancel'` in `onEnd`.** A cancel path (disabled flip mid-pan, `pointercancel`, `lostpointercapture`) emits `onEnd` with `reason: 'cancel'`; treat it as a reset, never a commit.
- **Own the threshold in `onEnd`.** Gesture reports distance and reason but does not decide what counts as a swipe. A fixed 48px threshold feels different on a 1200px desktop carousel vs a 360px phone. 15–20% of slide width is a sane default.
- **Keep `onMove` cheap.** It fires per animation frame during the pan — avoid layout reads (`getBoundingClientRect`) inside it; cache `slideWidth()` outside or read it on pointerdown.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Swipe-to-Dismiss Notifications](./swipe-dismiss-notifications.md)
- [Refine](/refine/)
