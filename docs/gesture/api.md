---
title: Gesture — API Reference
description: API reference for @vielzeug/gesture pointer pan recognition.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createPanGesture()` | Track one-axis pointer movement on an element | Sync | `onStart` runs after direction intent is recognized |
| `PanGesture` | Lifecycle-owned pan handle | Sync | `dispose()` does not emit `onEnd` |
| `PanGestureOptions` | Configure axis, admission, capture, and callbacks | Sync | Completion thresholds belong in `onEnd` |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/gesture` | Pan recognizer and related types. |

## Core Functions

### `createPanGesture()`

```ts
function createPanGesture(target: Element, options?: PanGestureOptions): PanGesture;
```

Attaches a one-axis pointer pan recognizer to `target`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `Element` | Element that owns the pointer interaction. |
| `options` | `PanGestureOptions` | Axis, disabled state, admission guard, capture policy, and lifecycle callbacks. |

**Returns:** A `PanGesture` handle.

**Example**

```ts
import { createPanGesture } from '@vielzeug/gesture';

const pan = createPanGesture(element, {
  axis: 'x',
  onEnd: ({ distance, reason }) => {
    if (reason === 'release' && Math.abs(distance) >= 48) dismiss();
  },
});
```

| Member | Return | Contract |
| --- | --- | --- |
| `active` | `boolean` | `true` after direction intent is accepted and before the interaction ends. |
| `cancel()` | `boolean` | Cancels the pending or active pointer interaction. Active pans emit `onEnd` with `reason: 'cancel'`. |
| `dispose()` | `void` | Detaches listeners, releases pointer ownership, and aborts `disposalSignal`. Idempotent. |
| `disposed` | `boolean` | `true` after the first `dispose()`. |
| `disposalSignal` | `AbortSignal` | Aborts when the handle is disposed. |
| `[Symbol.dispose]()` | `void` | Calls `dispose()`. |

## Types

```ts
type PanAxis = 'x' | 'y';
type PanEndReason = 'cancel' | 'release';

type PanGestureDetail = {
  axis: PanAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: number;
  target: Element;
};

type PanGestureEndDetail = PanGestureDetail & {
  reason: PanEndReason;
};

type PanGestureOptions = {
  axis?: PanAxis | (() => PanAxis);
  disabled?: boolean | (() => boolean | undefined);
  pointerCapture?: boolean;
  onEnd?: (detail: PanGestureEndDetail) => void;
  onMove?: (detail: PanGestureDetail) => void;
  onStart?: (detail: PanGestureDetail) => void;
  shouldStart?: (event: PointerEvent) => boolean;
};

type PanGesture = {
  readonly active: boolean;
  [Symbol.dispose](): void;
  cancel(): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};
```

| Option | Type | Default | Contract |
| --- | --- | --- | --- |
| `axis` | `PanAxis \| (() => PanAxis)` | `'x'` | Axis resolved when each pointer interaction starts |
| `disabled` | `boolean \| (() => boolean \| undefined)` | `false` | Blocks new pans and cancels an active pan on the next pointer event |
| `pointerCapture` | `boolean` | `true` | Captures the pointer on `target` after axis intent is accepted |
| `shouldStart` | `(event: PointerEvent) => boolean` | — | Rejects a primary pointer start before tracking begins |
| `onStart` | `(detail: PanGestureDetail) => void` | — | Runs once when axis intent is accepted |
| `onMove` | `(detail: PanGestureDetail) => void` | — | Runs for the activating move and later moves |
| `onEnd` | `(detail: PanGestureEndDetail) => void` | — | Runs for active release or cancellation |

Gesture tracks an accepted pan with capture-phase listeners on `target.ownerDocument` regardless of the pointer-capture setting. Set `pointerCapture: false` when nested or newly revealed controls must retain native pointer-up and click targeting.

## Errors

`@vielzeug/gesture` does not export custom error classes.
