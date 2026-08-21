---
title: 'Gesture Examples — Swipe-to-Dismiss Notifications'
description: 'Implement swipe-to-dismiss behavior using createPanGesture.'
---

## Swipe-to-Dismiss Notifications

### Problem

You need to dismiss transient notifications by swiping horizontally, while preserving click access to inner actions (undo, retry, view details). The notification should track the finger with a live transform, fade as it moves, and either dismiss past an application-defined threshold or spring back under it. Inner buttons must remain tappable mid-gesture — the pan must not capture pointer events away from them.

### Solution

Disable pointer capture with `pointerCapture: false` so child elements stay interactive, and reject starts on interactive descendants with `shouldStart`. Drive the transform and opacity from `onMove`, reset on `reason: 'cancel'`, and dismiss on `reason: 'release'` past threshold. Use the Web Animations API for the commit animation so the gesture handle stays decoupled from rendering.

```html
<div class="toast-stack" id="toasts" role="region" aria-label="Notifications" aria-live="polite"></div>

<template id="toast-template">
  <div class="toast" role="status">
    <span class="toast-message"></span>
    <button class="toast-action" type="button"></button>
    <button class="toast-close" type="button" aria-label="Dismiss">×</button>
  </div>
</template>
```

```css
.toast-stack {
  position: fixed;
  inset-block-end: 1rem;
  inset-inline-end: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 1000;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 18rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-900);
  color: var(--color-contrast-50);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  touch-action: pan-y; /* Allow vertical scroll, own horizontal swipe */
  user-select: none;
}

.toast-action {
  margin-inline-start: auto;
  color: var(--color-primary-300);
  background: none;
  border: none;
  cursor: pointer;
}

.toast-close {
  color: var(--color-contrast-400);
  background: none;
  border: none;
  cursor: pointer;
}
```

```ts
import { createPanGesture } from '@vielzeug/gesture';

const stack = document.getElementById('toasts')!;
const template = document.getElementById('toast-template')! as HTMLTemplateElement;

const DISMISS_THRESHOLD = 96;
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function showToast({ message, actionLabel, onAction }: ToastOptions): void {
  const toast = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  toast.querySelector('.toast-message')!.textContent = message;

  const actionBtn = toast.querySelector<HTMLButtonElement>('.toast-action')!;
  if (actionLabel && onAction) {
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', onAction);
  } else {
    actionBtn.remove();
  }

  toast.querySelector('.toast-close')!.addEventListener('click', () => dismissToast(toast, 0));

  stack.appendChild(toast);

  const pan = createPanGesture(toast, {
    axis: 'x',
    pointerCapture: false, // Inner buttons stay clickable mid-gesture
    shouldStart: (event) =>
      !event.composedPath().some((node) => node instanceof Element && node.matches(INTERACTIVE_SELECTOR)),
    onMove: ({ distance }) => {
      toast.style.transform = `translateX(${distance}px)`;
      toast.style.opacity = String(Math.max(0, 1 - Math.abs(distance) / 200));
    },
    onEnd: ({ distance, reason }) => {
      // Cancel (disabled flip, pointercancel) always springs back.
      if (reason !== 'release') {
        toast.style.transform = '';
        toast.style.opacity = '';
        return;
      }

      if (Math.abs(distance) >= DISMISS_THRESHOLD) {
        dismissToast(toast, distance);
      } else {
        // Spring back if released below threshold
        toast.style.transform = '';
        toast.style.opacity = '';
      }
    },
  });

  // Auto-dismiss after 6s
  const timer = setTimeout(() => dismissToast(toast, 0), 6000);

  function dismissToast(el: HTMLElement, distance: number): void {
    clearTimeout(timer);
    pan.dispose();

    const direction = distance < 0 ? -1 : 1;
    const anim = el.animate(
      [
        { transform: el.style.transform || 'translateX(0)', opacity: el.style.opacity || '1' },
        { transform: `translateX(${direction * 120}%)`, opacity: 0 },
      ],
      { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );

    anim.onfinish = () => el.remove();
  }
}
```

### Pitfalls

- **`pointerCapture: false` is mandatory when children must stay clickable.** With default capture, the toast element steals all pointer events for the gesture's lifetime — the "Undo" button becomes unclickable until the gesture ends. Document-level tracking still keeps the pan active outside the target; disabling capture changes event targeting, not gesture tracking.
- **Pair `pointerCapture: false` with `shouldStart`.** `shouldStart` protects controls under the initial pointer; `pointerCapture: false` additionally protects controls that appear beneath the pointer during a reveal interaction. Neither alone covers both cases.
- **Reset inline styles on `reason: 'cancel'`, not just `reason: 'release'`.** A cancel path (disabled flip, `pointercancel`, `lostpointercapture`) must spring back; if you only reset on release, the toast stays translated and faded.
- **Dispose the gesture when the toast leaves the DOM.** The handle holds listeners on a detached element; without `dispose()`, the `disposalSignal` never aborts and the listeners leak until GC.
- **Clear the auto-dismiss timer on swipe commit.** Otherwise the animation finishes and the 6s timer fires `dismissToast` again on a detached element.
- **Use `touch-action: pan-y` on the toast.** Without it, a horizontal swipe on a long toast stack can hijack the page's vertical scroll on touch devices.
- **Animate the commit with WAAPI, not inline styles.** Inline `transition` + `transform` works but blocks other transitions on the same element. WAAPI keeps the gesture handle decoupled from rendering and lets the animation be cancelled if a new gesture starts mid-flight.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Carousel Pan Navigation](./carousel-swipe-navigation.md)
- [Dnd](/dnd/)
