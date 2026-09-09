---
title: Gesture Migration
description: Adopt two-dimensional drag recognition, configurable activation distance, owner signals, and hardened pointer handling.
---

# Gesture 3.0 Migration

Existing `createPanGesture()` calls continue to work without changes.

## Use shared two-dimensional dragging

`createDragGesture()` is the pointer-recognition layer for free movement. It reports readonly `{ x, y }` values for `start`, `current`, and `delta` while leaving previews, hit-testing, DOM mutation, and outcomes to consumers. Dnd touch sorting now builds on this primitive instead of maintaining a separate Touch Event state machine.

```ts
const drag = createDragGesture(element, {
  onMove: ({ delta }) => render(delta),
  onEnd: ({ reason }) => settle(reason),
});
```

## Configure recognition slop

Use `activationDistance` to control movement before direction intent is accepted:

```ts
const pan = createPanGesture(element, {
  activationDistance: 12,
  axis: 'x',
  onMove,
  onEnd,
});
```

The default remains 6 CSS pixels. Zero activates on the first pointer move with non-zero displacement; zero-motion events remain pending. Completion thresholds still belong in `onEnd` because they represent product behavior rather than recognition slop.

## Compose lifecycle ownership

`disposalSignal` remains available and aborts when the handle is disposed. The new input `signal` binds Gesture to an existing owner:

```ts
const pan = createPanGesture(element, {
  signal: owner.signal,
  onEnd,
  onMove,
});

const childSignal = AbortSignal.any([pan.disposalSignal, request.signal]);
```

Manual `dispose()` remains valid. Call `cancel()` before disposal when a still-connected surface needs the `onEnd` cancellation reset path.

## Pointer behavior

Gesture now:

- falls back to document tracking when pointer capture acquisition or release fails
- accepts pointer events from the target document's realm
- rejects secondary mouse and pen buttons
- cancels active tracking on owner-window blur or hidden-document transition
- resolves the target's owner document when each interaction begins

Options and callback details are now readonly. Fixed callbacks and pointer-capture policy are snapshotted during construction; function-valued `axis` and `disabled` options remain dynamic. No callback or result field changed.
