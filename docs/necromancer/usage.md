---
title: Necromancer — Usage Guide
description: Animate DOM elements, coordinate groups, and create FLIP transitions with @vielzeug/necromancer.
---

[[toc]]

## Basic Usage

Create an animation after its element mounts, control playback through the native `Animation`, and dispose its owner with the UI lifecycle.

```ts
import { animate } from '@vielzeug/necromancer';

const handle = animate(
  element,
  [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 180, easing: 'ease-out', fill: 'both' },
);

handle.animation.reverse();
const result = await handle.result;
handle.dispose();
```

`result` distinguishes natural completion, reduced timing, and cancellation. `disposed` reports only whether the owner was explicitly disposed.

When `duration` is omitted, Necromancer uses `180ms`; pass `duration: 0` when the caller intentionally wants an instant native animation.

## Replacing an Active Animation

Animations normally run concurrently, including multiple Necromancer animations on the same element. For state updates where only the newest animation should remain, set `interrupt: 'cancel'`.

```ts
const first = animate(element, [{ opacity: 0 }, { opacity: 1 }]);
const latest = animate(element, [{ opacity: 1 }, { opacity: 0 }], {
  interrupt: 'cancel',
});

await first.result; // { status: 'cancelled', ... }
```

Interruption disposes only still-active animations created by Necromancer for that element. It never cancels an animation that your code started directly with `element.animate()`.

## Motion Preferences

Use `motion` to select how the animation responds to the operating system preference.

```ts
const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }], {
  duration: 200,
  motion: 'system',
});

const result = await handle.result;
```

`'system'` is the default and reduces movement when `prefers-reduced-motion: reduce` matches. `'full'` preserves the requested timing, while `'reduced'` always reduces it.

Reduced motion keeps the supplied keyframes but normalizes delay, duration, and end delay to zero and iterations to one. The result is `{ status: 'reduced' }`, and `handle.animation` still represents the requested visual transition.

## Parent Cancellation

Pass a parent `AbortSignal` to release an animation when its owning work is cancelled.

```ts
const controller = new AbortController();
const handle = animate(element, [{ scale: 0.96 }, { scale: 1 }], {
  duration: 160,
  signal: controller.signal,
});

controller.abort('route changed');
const result = await handle.result;
// { status: 'cancelled', reason: 'route changed' }
```

An already-aborted signal throws its reason before an animation starts.

## Staggering a Group

Pass an iterable of elements to `animateEach()`. Duplicate elements are animated once in first-seen order.

```ts
import { animateEach } from '@vielzeug/necromancer';

const group = animateEach(
  document.querySelectorAll('.card'),
  (_card, index) => [
    { opacity: 0, transform: `translateY(${12 + index * 2}px)` },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  { duration: 220, easing: 'ease-out', stagger: 45 },
);

const results = await group.results;
group.dispose();
```

A group owns child lifecycles only. `results` preserves every child result in handle order; use `group.handles` when native playback control is required.

## Serial Application Flow

JavaScript control flow is the clearest way to express serial, conditional, or branching animations:

```ts
for (const step of steps) {
  const handle = animate(step.element, step.keyframes, {
    ...step.options,
    signal: controller.signal,
  });
  const result = await handle.result;

  if (result.status === 'cancelled') break;
}
```

One parent `AbortSignal` cancels the active step without introducing a separate timeline abstraction.

## Animating a Reorder with FLIP

Capture positions before changing layout, then animate through the returned one-shot transition.

```ts
import { captureLayout } from '@vielzeug/necromancer';

const transition = captureLayout(items);
list.prepend(items[2]!);

const group = transition.animate({ duration: 220, easing: 'ease-out' });
await group.results;
group.dispose();
```

The transition only animates changed, connected elements and can be animated once. It additively composes the individual CSS `translate` and `scale` properties, preserving authored `transform`, `translate`, and `scale`. A resized element (for example a list item whose content changed) animates from its captured size as well as its captured position.

### Replacing rendered elements

When a framework replaces list nodes rather than reorders the captured elements, give `captureLayout()` a stable key and pass the committed nodes to `animate()`. Capture before updating state, then call `animate()` only after the renderer has committed the new DOM.

```ts
const transition = captureLayout(beforeItems, {
  getKey: (element) => element.getAttribute('data-id')!,
});

renderReorderedItems();

transition.animate({
  duration: 220,
  easing: 'ease-out',
  elements: afterItems,
});
```

Keys must be unique, non-empty strings in both collections. Items with no matching predecessor are not enter animations; animate those explicitly with `animate()` or `animateEach()`.

For sortable lists, DnD exposes its pre-commit layout seam through `onBeforeReorder`; see the [DnD optimistic-reorder recipe](/dnd/examples/optimistic-reorder-with-revert.md).

## Scope

Necromancer creates and owns explicit Web Animations API work. It does not observe CSS-authored transitions or animations, inject `@keyframes`, watch DOM mutations, generate springs, interpolate SVG geometry, or provide a JavaScript tween fallback. Keep CSS as the owner of declarative component styling and use a dedicated charting or tweening tool when the animation needs capabilities beyond WAAPI keyframes.

## Framework Integration

Create handles in a client mount lifecycle and dispose them during unmount. The same composition works with reactive effect systems: start the animation in the effect and return `handle.dispose()` as its cleanup.

```tsx
import { useEffect, useRef } from 'react';
import { animate } from '@vielzeug/necromancer';

export function Notice() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    return () => handle.dispose();
  }, []);

  return <div ref={elementRef}>Saved</div>;
}
```

## Testing

jsdom does not implement `Element.animate()`, so code under test needs a fake. `@vielzeug/necromancer/testing` has no test-runner import — it works the same under Vitest, Jest, or any other runner.

```ts
import { installFakeAnimations } from '@vielzeug/necromancer/testing';
import { animate } from '@vielzeug/necromancer';

const { calls, restore } = installFakeAnimations();
const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

calls[0]?.animation.finish();
await handle.result; // { status: 'finished' }
restore();
```

Call `restore()` after each test (for example in `afterEach`) to put back whatever `Element.prototype.animate` was before. Use `createRect()` to mock `Element.getBoundingClientRect()` when testing code that calls `captureLayout()`.

## Best Practices

- Start animations only after their elements mount in the browser.
- Dispose each handle or group with its UI owner.
- Use native `Animation` objects for playback control.
- Respect the default `'system'` motion setting unless movement is essential.
- Use a parent `AbortSignal` for cancellable application flow.
- Keep `delay` numeric when combining it with non-zero `stagger`.
- Capture layout before mutation and animate each transition exactly once.
