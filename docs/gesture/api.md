---
title: Gesture — API Reference
description: API reference for two-dimensional drag and one-axis pan recognition.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createDragGesture()` | Track unrestricted two-dimensional pointer movement | Sync | Does not provide DOM movement or drop semantics |
| `createPanGesture()` | Track pointer movement projected onto one axis | Sync | Cross-axis intent ends a pending interaction |
| `createLongPress()` | Recognize a primary pointer held in place | Sync | The click that follows a fired hold is swallowed |
| `DragGesture` / `PanGesture` / `LongPress` | Control recognition lifecycle | Sync | `dispose()` does not invoke `onEnd` |
| `DragGestureOptions` | Configure free-drag recognition | Sync | `activationDistance` uses Euclidean distance |
| `PanGestureOptions` | Configure axis-locked recognition | Sync | Completion thresholds belong in `onEnd` |
| `LongPressOptions` | Configure hold recognition | Sync | `durationMs` and `slopPx` are validated at construction |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/gesture` | Drag and pan factories, handles, callback details, options, axes, points, and end reasons |

## Core Functions

### `createDragGesture()`

```ts
function createDragGesture(target: Element, options?: DragGestureOptions): DragGesture;
```

Tracks one primary pointer without restricting movement to an axis.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `Element` | Element that owns pointer admission and optional capture |
| `options` | `DragGestureOptions` | Activation, admission, capture, callback, and lifecycle configuration |

**Returns:** A lifecycle-owned `DragGesture` handle.

**Example**

```ts
import { createDragGesture } from '@vielzeug/gesture';

const drag = createDragGesture(element, {
  onMove: ({ delta }) => {
    element.style.translate = `${delta.x}px ${delta.y}px`;
  },
  onEnd: () => {
    element.style.translate = '';
  },
});
```

---

### `createPanGesture()`

```ts
function createPanGesture(target: Element, options?: PanGestureOptions): PanGesture;
```

Tracks one primary pointer after movement establishes intent on the configured axis.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `Element` | Element that owns pointer admission and optional capture |
| `options` | `PanGestureOptions` | Axis, activation, admission, capture, callback, and lifecycle configuration |

**Returns:** A lifecycle-owned `PanGesture` handle.

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

Both handles expose the same members:

| Member | Type | Contract |
| --- | --- | --- |
| `active` | `boolean` | `true` after activation and before release or cancellation |
| `cancel()` | `() => boolean` | Clears pending recognition or ends active recognition with `reason: 'cancel'`; returns whether a session existed |
| `disposalSignal` | `AbortSignal` | Aborts when the handle is disposed |
| `dispose()` | `() => void` | Aborts `disposalSignal`, clears recognition, releases capture, and detaches listeners; idempotent |
| `disposed` | `boolean` | `true` after disposal |
| `[Symbol.dispose]()` | `() => void` | Calls `dispose()` |

---

### `createLongPress()`

```ts
function createLongPress(target: Element, options?: LongPressOptions): LongPress;
```

Recognizes a primary pointer held in place: `onLongPress` fires with the originating pointerdown once the hold outlasts `durationMs`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | `Element` | Element that owns pointer admission, document tracking, and click swallowing |
| `options` | `LongPressOptions` | Hold time, slop distance, admission, callback, and lifecycle configuration |

**Returns:** A lifecycle-owned `LongPress` handle with the same members as the other gestures; `active` is `true` while a hold is pending.

**Example**

```ts
import { createLongPress } from '@vielzeug/gesture';

const hold = createLongPress(list, {
  shouldStart: (event) => event.pointerType !== 'mouse',
  onLongPress: (detail) => {
    const tile = (detail.event.target as HTMLElement).closest('.tile');
    openDetail(tile?.dataset.id);
  },
});
```

Movement beyond `slopPx` cancels back to a normal press, and window blur or a hidden document cancels a pending hold. The click that follows a fired hold is swallowed through a capture-phase listener on `target`, so releasing never commits what the hold opened; bind `target` to a stable ancestor of the pressed controls so the swallow precedes their click handlers.

## Types

### Drag types

```ts
type DragEndReason = 'cancel' | 'release';

type DragPoint = Readonly<{
  x: number;
  y: number;
}>;

type DragGestureDetail = Readonly<{
  current: DragPoint;
  delta: DragPoint;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: DragPoint;
  target: Element;
}>;

type DragGestureEndDetail = DragGestureDetail &
  Readonly<{
    reason: DragEndReason;
  }>;

type DragGestureOptions = Readonly<{
  activationDistance?: number;
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: DragGestureEndDetail) => void;
  onMove?: (detail: DragGestureDetail) => void;
  onStart?: (detail: DragGestureDetail) => void;
  pointerCapture?: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;
```

`start`, `current`, and `delta` use viewport `clientX` and `clientY` coordinates. Activation uses `Math.hypot(delta.x, delta.y)`.

### Pan types

```ts
type PanAxis = 'x' | 'y';
type PanEndReason = 'cancel' | 'release';

type PanGestureDetail = Readonly<{
  axis: PanAxis;
  current: number;
  distance: number;
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  start: number;
  target: Element;
}>;

type PanGestureEndDetail = PanGestureDetail &
  Readonly<{
    reason: PanEndReason;
  }>;

type PanGestureOptions = Readonly<{
  activationDistance?: number;
  axis?: PanAxis | (() => PanAxis);
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PanGestureEndDetail) => void;
  onMove?: (detail: PanGestureDetail) => void;
  onStart?: (detail: PanGestureDetail) => void;
  pointerCapture?: boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;
```

Pan details project `start`, `current`, and `distance` onto `axis`. The default axis is `'x'`.

### Long-press types

```ts
type LongPressDetail = Readonly<{
  event: PointerEvent;
  pointerId: number;
  pointerType: string;
  target: Element;
}>;

type LongPressOptions = Readonly<{
  durationMs?: number;
  disabled?: boolean | (() => boolean | undefined);
  onLongPress?: (detail: LongPressDetail) => void;
  shouldStart?: (event: PointerEvent) => boolean;
  slopPx?: number;
  signal?: AbortSignal;
}>;
```

`durationMs` defaults to `500` and `slopPx` to `8`. `event` is the pointerdown that started the hold, so `event.target` is the pressed element.

### Handle types

```ts
type DragGesture = {
  readonly active: boolean;
  [Symbol.dispose](): void;
  cancel(): boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
};

type PanGesture = DragGesture;
```

### Shared option behavior

| Option | Default | Contract |
| --- | --- | --- |
| `activationDistance` | `6` | Non-negative finite CSS pixels; drag uses Euclidean distance, pan waits for dominant-axis intent |
| `axis` | `'x'` | Pan only; fixed value or getter sampled when each interaction starts |
| `disabled` | `false` | Fixed value or getter; blocks starts and cancels active recognition on the next matching pointer event |
| `pointerCapture` | `true` | Best-effort capture after activation; document tracking continues when capture is disabled or fails |
| `shouldStart` | — | Admission predicate evaluated for the primary pointer before tracking starts |
| `signal` | — | Disposes the handle when the external owner aborts |
| `onStart` | — | Runs once on the activating movement |
| `onMove` | — | Runs on the activating movement and each later matching movement |
| `onEnd` | — | Runs once for active release or cancellation; pending interactions end without callbacks |

Options and callback details are readonly. Fixed callbacks and capture policy are snapshotted at construction. Function-valued `axis` and `disabled` options remain dynamic.

Gesture tracks accepted movement with capture-phase listeners on the target's current owner document. Window blur, hidden-document transition, `pointercancel`, and `lostpointercapture` cancel active recognition.

## Errors

| Error | Trigger | Notable properties |
| --- | --- | --- |
| `GestureError` | Base class for every gesture-originated error | `instanceof GestureError` catches any gesture error |
| `GestureConfigError` | Invalid option value | Extends `GestureError` |

- Invalid `activationDistance` values throw `GestureConfigError` during construction.
- Invalid fixed `axis` values throw `GestureConfigError` during construction.
- Invalid values returned by a dynamic `axis` getter throw `GestureConfigError` when a pointer interaction starts.
