---
title: 'Gesture: API Reference'
description: API reference for drag, pan, long-press, pinch, and wheel recognition.
---

[[toc]]

## API Overview

| Symbol                                     | Purpose                                             | Execution mode | Common gotcha                                            |
| ------------------------------------------ | --------------------------------------------------- | -------------- | -------------------------------------------------------- |
| `createDragGesture()`                      | Track unrestricted two-dimensional pointer movement | Sync           | Does not provide DOM movement or drop semantics          |
| `createPanGesture()`                       | Track pointer movement projected onto one axis      | Sync           | Cross-axis intent ends a pending interaction             |
| `createLongPress()`                        | Recognize a primary pointer held in place           | Sync           | The click that follows a fired hold is swallowed         |
| `createPinchGesture()`                     | Track two-pointer scale and rotation                | Sync           | Ends when either pointer lifts                           |
| `createWheelGesture()`                     | Track wheel input with pixel-normalized deltas      | Sync           | Never prevents scrolling unless `preventDefault` opts in |
| `normalizeWheel()`                         | Convert wheel deltas to CSS pixels for any mode     | Sync           | Page-mode scaling uses the target's client box           |
| `DragGesture` / `PanGesture` / `LongPress` | Control recognition lifecycle                       | Sync           | `dispose()` does not invoke `onEnd`                      |
| `DragGestureOptions`                       | Configure free-drag recognition                     | Sync           | `activationDistance` uses Euclidean distance             |
| `PanGestureOptions`                        | Configure axis-locked recognition                   | Sync           | Completion thresholds belong in `onEnd`                  |
| `LongPressOptions`                         | Configure hold recognition                          | Sync           | `durationMs` and `slopPx` are validated at construction  |
| `PinchGestureOptions`                      | Configure pinch/rotate recognition                  | Sync           | `activationDistance` is a span change, not pointer move  |
| `WheelOptions`                             | Configure wheel recognition                         | Sync           | `preventDefault` accepts a per-event predicate           |

## Package Entry Point

| Import              | Purpose                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@vielzeug/gesture` | Drag, pan, long-press, pinch, and wheel factories, handles, callback details, options, points, and end reasons |

## Core Functions

### `createDragGesture()`

```ts
function createDragGesture(target: Element, options?: DragGestureOptions): DragGesture;
```

Tracks one primary pointer without restricting movement to an axis.

| Parameter | Type                 | Description                                                           |
| --------- | -------------------- | --------------------------------------------------------------------- |
| `target`  | `Element`            | Element that owns pointer admission and optional capture              |
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

| Parameter | Type                | Description                                                                 |
| --------- | ------------------- | --------------------------------------------------------------------------- |
| `target`  | `Element`           | Element that owns pointer admission and optional capture                    |
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

| Member               | Type            | Contract                                                                                                         |
| -------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `active`             | `boolean`       | `true` after activation and before release or cancellation                                                       |
| `cancel()`           | `() => boolean` | Clears pending recognition or ends active recognition with `reason: 'cancel'`; returns whether a session existed |
| `disposalSignal`     | `AbortSignal`   | Aborts when the handle is disposed                                                                               |
| `dispose()`          | `() => void`    | Aborts `disposalSignal`, clears recognition, releases capture, and detaches listeners; idempotent                |
| `disposed`           | `boolean`       | `true` after disposal                                                                                            |
| `[Symbol.dispose]()` | `() => void`    | Calls `dispose()`                                                                                                |

---

### `createLongPress()`

```ts
function createLongPress(target: Element, options?: LongPressOptions): LongPress;
```

Recognizes a primary pointer held in place: `onLongPress` fires with the originating pointerdown once the hold outlasts `durationMs`.

| Parameter | Type               | Description                                                                  |
| --------- | ------------------ | ---------------------------------------------------------------------------- |
| `target`  | `Element`          | Element that owns pointer admission, document tracking, and click swallowing |
| `options` | `LongPressOptions` | Hold time, slop distance, admission, callback, and lifecycle configuration   |

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

Movement beyond `slopPx`, a second touch, window blur, or a hidden document cancels a pending hold. The dynamic `disabled` predicate is checked again before the timer fires. The pointer-generated click following a fired hold is swallowed through a capture-phase listener on `target`; keyboard clicks (`detail: 0`) remain available. Bind `target` to a stable ancestor of the pressed controls so the swallow precedes their click handlers.

---

### `createPinchGesture()`

```ts
function createPinchGesture(target: Element, options?: PinchGestureOptions): PinchGesture;
```

Tracks two pointers and reports scale and rotation relative to the positions where they went down.

| Parameter | Type                  | Description                                                           |
| --------- | --------------------- | --------------------------------------------------------------------- |
| `target`  | `Element`             | Element that owns pointer admission and optional capture              |
| `options` | `PinchGestureOptions` | Activation, admission, capture, callback, and lifecycle configuration |

**Returns:** A lifecycle-owned `PinchGesture` handle with the same members as the other gestures.

**Example**

```ts
import { createPinchGesture } from '@vielzeug/gesture';

const pinch = createPinchGesture(stage, {
  onMove: ({ deltaScale, deltaRotation, deltaCentroid }) => {
    camera.zoomBy(1 + deltaScale);
    camera.rotateBy(deltaRotation);
    camera.panBy(deltaCentroid.x, deltaCentroid.y);
  },
});
```

The gesture activates once the span between the pointers changes by `activationDistance` pixels. It ends when either pointer lifts (`reason: 'release'`) or the session is cancelled; the remaining pointer never continues the gesture. A third pointer down is ignored.

---

### `createWheelGesture()`

```ts
function createWheelGesture(target: Element, options?: WheelOptions): WheelGesture;
```

Reports wheel events with deltas normalized to CSS pixels. The handle is disposal-only: it has `dispose()`, `disposed`, `disposalSignal`, and `[Symbol.dispose]()`, but no `active` or `cancel()` because wheel events are stateless.

| Parameter | Type           | Description                                                  |
| --------- | -------------- | ------------------------------------------------------------ |
| `target`  | `Element`      | Element the `wheel` listener is attached to                  |
| `options` | `WheelOptions` | Prevention, admission, callback, and lifecycle configuration |

**Returns:** A disposal-only `WheelGesture` handle.

**Example**

```ts
import { createWheelGesture } from '@vielzeug/gesture';

const wheel = createWheelGesture(stage, {
  preventDefault: true,
  onWheel: ({ deltaX, deltaY, pinch }) => {
    if (pinch) camera.zoomBy(Math.exp(-deltaY * 0.01));
    else camera.panBy(-deltaX, -deltaY);
  },
});
```

`pinch` is `true` when `ctrlKey` is set, which is how browsers report trackpad pinch-zoom. Prevention defaults to `false`; the listener is non-passive so `preventDefault` works when opted in.

---

### `normalizeWheel()`

```ts
function normalizeWheel(event: WheelEvent, target: Element): { deltaX: number; deltaY: number };
```

Converts a wheel event's deltas to CSS pixels for any `deltaMode`: pixel mode passes through, line mode multiplies by 16, and page mode multiplies by the larger of the target's client width and height (falling back to the window box). Exported for consumers that already own their wheel listener.

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
  velocity: DragPoint;
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
  shouldActivate?: (detail: DragGestureDetail) => boolean;
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
  velocity: number;
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
  shouldActivate?: (detail: PanGestureDetail) => boolean;
  shouldStart?: (event: PointerEvent) => boolean;
  signal?: AbortSignal;
}>;
```

Pan details project `start`, `current`, and `distance` onto `axis`. The default axis is `'x'`.

Velocity is signed CSS pixels per second over the trailing 90 ms. Samples include pointerdown, movement (including activation), and release. A window with fewer than two distinct sample times reports zero velocity; a pause longer than the window removes earlier movement.

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

### Pinch types

```ts
type PinchEndReason = 'cancel' | 'release';

type PinchPoint = Readonly<{
  x: number;
  y: number;
}>;

type PinchGestureDetail = Readonly<{
  centroid: PinchPoint;
  deltaCentroid: PinchPoint;
  deltaRotation: number;
  deltaScale: number;
  event: PointerEvent;
  rotation: number;
  scale: number;
  startCentroid: PinchPoint;
  target: Element;
}>;

type PinchGestureEndDetail = PinchGestureDetail &
  Readonly<{
    reason: PinchEndReason;
  }>;

type PinchGestureOptions = Readonly<{
  activationDistance?: number;
  disabled?: boolean | (() => boolean | undefined);
  onEnd?: (detail: PinchGestureEndDetail) => void;
  onMove?: (detail: PinchGestureDetail) => void;
  onStart?: (detail: PinchGestureDetail) => void;
  pointerCapture?: boolean;
  signal?: AbortSignal;
}>;
```

`scale` is the current pointer span divided by the span when the pointers went down; `rotation` is the pointer-line angle since pointerdown in radians, positive clockwise, wrapped to `(-π, π]`. `deltaScale`, `deltaRotation`, and `deltaCentroid` are the change since the previous event (the start event's baseline for the first callback), which is what incremental transforms consume. Centroid coordinates are viewport `clientX`/`clientY` space. `activationDistance` is a span change in pixels and defaults to `6`. Pinch has no `shouldStart`; the first two pointers down after creation are tracked and later pointers are ignored.

### Wheel types

```ts
type WheelDetail = Readonly<{
  deltaX: number;
  deltaY: number;
  event: WheelEvent;
  pinch: boolean;
  target: Element;
}>;

type WheelOptions = Readonly<{
  disabled?: boolean | (() => boolean | undefined);
  onWheel?: (detail: WheelDetail) => void;
  preventDefault?: boolean | ((event: WheelEvent) => boolean);
  signal?: AbortSignal;
}>;

type WheelGesture = Readonly<{
  [Symbol.dispose]: () => void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
}>;
```

`deltaX`/`deltaY` are normalized to CSS pixels (see `normalizeWheel()`); positive moves content right/down. `pinch` mirrors `ctrlKey`.

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

type PinchGesture = DragGesture;
```

### Shared option behavior

| Option               | Default | Contract                                                                                                                     |
| -------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `activationDistance` | `6`     | Non-negative finite CSS pixels; drag uses Euclidean distance, pan waits for dominant-axis intent                             |
| `axis`               | `'x'`   | Pan only; fixed value or getter sampled when each interaction starts                                                         |
| `disabled`           | `false` | Fixed value or getter; blocks starts and cancels active recognition on the next matching pointer event                       |
| `pointerCapture`     | `true`  | Best-effort capture after activation; document tracking continues when capture is disabled or fails                          |
| `shouldStart`        | N/A     | Admission predicate evaluated for the primary pointer before tracking starts                                                 |
| `shouldActivate`     | N/A     | Drag/pan predicate evaluated once after distance/axis recognition and before capture or callbacks; false rejects the session |
| `signal`             | N/A     | Disposes the handle when the external owner aborts                                                                           |
| `onStart`            | N/A     | Runs once on the activating movement                                                                                         |
| `onMove`             | N/A     | Runs on the activating movement and each later matching movement                                                             |
| `onEnd`              | N/A     | Runs once for active release or cancellation; pending interactions end without callbacks                                     |

Options and callback details are readonly. Fixed callbacks and capture policy are snapshotted at construction. Function-valued `axis` and `disabled` options remain dynamic.

Gesture tracks accepted movement with capture-phase listeners on the target's current owner document. Window blur, hidden-document transition, `pointercancel`, pointer capture loss on the gesture target, and a second touch anywhere in that document cancel recognition. A `lostpointercapture` event bubbling from a descendant does not cancel the target's gesture. Exact diagonal ties remain pending until one axis dominates; cross-axis dominance rejects the pending pan. Gesture does not arbitrate ownership between recognizers on the same axis.

## Errors

| Error                | Trigger                                       | Notable properties                                  |
| -------------------- | --------------------------------------------- | --------------------------------------------------- |
| `GestureError`       | Base class for every gesture-originated error | `instanceof GestureError` catches any gesture error |
| `GestureConfigError` | Invalid option value                          | Extends `GestureError`                              |

- Invalid `activationDistance` values throw `GestureConfigError` during construction.
- Invalid fixed `axis` values throw `GestureConfigError` during construction.
- Invalid values returned by a dynamic `axis` getter throw `GestureConfigError` when a pointer interaction starts.
