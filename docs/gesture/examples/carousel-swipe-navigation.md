---
title: 'Gesture Examples — Carousel Swipe Navigation'
description: 'Use gesture swipe recognition to navigate a carousel.'
---

## Carousel Swipe Navigation

### Problem

You need horizontal swipe navigation in a carousel without coupling input recognition to rendering logic. The carousel must track the finger during the swipe (live transform), commit to next/previous on threshold cross, and snap back if the gesture releases below threshold. It must coexist with vertical scrolling on touch devices — a horizontal swipe must not hijack a vertical page scroll.

### Solution

Attach `createSwipeGesture` to the carousel track. Use `onMove` for the live transform, `onCommit` for the slide change, and `onRelease` to reset inline styles when the gesture falls short. `axis: 'x'` ensures vertical pointer movement is ignored.

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

.carousel-track.dragging {
  transition: none; /* Kill CSS easing while tracking the finger */
}

.slide {
  flex: 0 0 100%;
  user-select: none;
}
```

```ts
import { createSwipeGesture } from '@vielzeug/gesture';

const track = document.getElementById('track')!;
const slides = track.children.length;
let current = 0;

function slideWidth(): number {
  return track.firstElementChild?.getBoundingClientRect().width ?? 0;
}

function goTo(index: number): void {
  current = Math.max(0, Math.min(index, slides - 1));
  track.style.transform = `translateX(${-current * slideWidth()}px)`;
}

const swipe = createSwipeGesture({
  axis: 'x',
  threshold: () => slideWidth() * 0.18,
  onMove: ({ distance }) => {
    track.classList.add('dragging');
    track.style.transform = `translateX(${-current * slideWidth() + distance}px)`;
  },
  onRelease: () => {
    track.classList.remove('dragging');
    goTo(current); // Snap back to current slide
  },
  onCommit: ({ distance }) => {
    track.classList.remove('dragging');
    goTo(distance < 0 ? current + 1 : current - 1);
  },
});

swipe.mount(track);

document.getElementById('prev')!.addEventListener('click', () => goTo(current - 1));
document.getElementById('next')!.addEventListener('click', () => goTo(current + 1));
```

### Pitfalls

- **Set `touch-action: pan-y` on the surface.** Without it, the browser may interpret the horizontal pointer movement as a native swipe and steal the gesture. `pan-y` lets vertical scrolls pass through while you own horizontal pans.
- **Toggle a `dragging` class to kill CSS transitions during `onMove`.** A 300ms ease transform fights the per-frame `translateX` updates from `onMove` and produces visible lag.
- **Reset inline styles on both `onRelease` and `onCommit`.** A cancel path (pointercancel, multi-touch) bypasses `onRelease`; if you only reset there, the track keeps the last drag transform.
- **Use a dynamic `threshold` based on slide width.** A fixed 48px threshold feels different on a 1200px desktop carousel vs a 360px phone. 15–20% of slide width is a sane default.
- **Keep `onMove` cheap.** It fires per animation frame during the drag — avoid layout reads (`getBoundingClientRect`) inside it; cache `slideWidth()` outside or read it on pointerdown.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Swipe-to-Dismiss Notifications](./swipe-dismiss-notifications.md)
- [Refine](/refine/)
