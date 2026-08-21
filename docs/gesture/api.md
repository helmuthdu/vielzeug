---
title: Gesture — API Reference
description: API reference for @vielzeug/gesture swipe recognition primitives.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createSwipeGesture()` | Build a swipe recognizer handle | Sync | Requires `mount(target)` before use |
| `SwipeGesture` | Lifecycle-owned recognizer handle | Sync | Call `dispose()` on unmount |
| `SwipeGestureOptions` | Configures swipe admission and commitment | Sync | `threshold` must be positive |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/gesture` | Swipe recognizer and related types. |

## Core Functions

### `createSwipeGesture()`

```ts
function createSwipeGesture(options: SwipeGestureOptions): SwipeGesture;
```

Creates a one-axis pointer swipe recognizer.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `SwipeGestureOptions` | Axis, threshold, callbacks, and guards. |

**Returns:** `SwipeGesture`.

```ts
import { createSwipeGesture } from '@vielzeug/gesture';

const swipe = createSwipeGesture({
  axis: 'x',
  onCommit: ({ distance }) => {
    if (distance < 0) next();
    else previous();
  },
});
```

| Member | Return | Contract |
| --- | --- | --- |
| `mount(target)` | `() => void` | Attaches pointer listeners to one target element and returns an unmount callback. |
| `cancel()` | `boolean` | Programmatically cancel an active gesture. |
| `isActive()` | `boolean` | Active pointer gesture state. |
| `dispose()` | `void` | Clears state, releases capture, and aborts `disposalSignal`. Idempotent. |
| `disposed` | `boolean` | `true` after first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when the gesture handle is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

## Types

```ts
type SwipeAxis = 'x' | 'y';
type MaybeGetter<T> = T | (() => T);
type SwipeDisabledBehavior = 'block-start' | 'cancel-active';

type SwipeGestureDetail = {
  axis: SwipeAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  progress: number;
  start: number;
  threshold: number;
};

type SwipeGestureOptions = {
  axis?: MaybeGetter<SwipeAxis>;
  captureTarget?: (event: PointerEvent) => Element | null;
  disabledBehavior?: MaybeGetter<SwipeDisabledBehavior>;
  disabled?: MaybeGetter<boolean | undefined>;
  onCancel?: (detail: SwipeGestureDetail) => void;
  onCommit?: (detail: SwipeGestureDetail) => void;
  onMove?: (detail: SwipeGestureDetail) => void;
  onRelease?: (detail: SwipeGestureDetail) => void;
  onStart?: (detail: SwipeGestureDetail) => void;
  shouldCommit?: (detail: SwipeGestureDetail) => boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  threshold?: MaybeGetter<number>;
};

type SwipeGesture = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  cancel(): boolean;
  dispose(): void;
  isActive(): boolean;
  mount(target: Element): () => void;
  [Symbol.dispose](): void;
};
```

### Disabled behavior

`disabledBehavior` controls what happens if `disabled` becomes `true` during an active swipe.

- `'block-start'` (default): blocks new swipes only.
- `'cancel-active'`: cancels the active swipe immediately and fires `onCancel`.

## Errors

`@vielzeug/gesture` does not export custom error classes in v1.
