---
title: Necromancer — API Reference
description: API reference for @vielzeug/necromancer animation ownership, groups, reduced motion, and FLIP transitions.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `animate()` | Animate one element | Sync | Defaults to a visible `180ms` duration |
| `animateEach()` | Animate a unique element group | Sync | Non-zero `stagger` needs numeric `delay` |
| `captureLayout()` | Capture positions and create a one-shot FLIP transition | Sync | Capture before changing layout |
| `NecromancerError` | Base package error | Sync | Use `NecromancerError.is()` to narrow unknown errors |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/necromancer` | Animation functions, types, and errors |
| `@vielzeug/necromancer/testing` | jsdom test fakes for `Element.animate()` and `getBoundingClientRect()` |

## Animation Functions

### `animate()`

```ts
function animate(element: Element, keyframes: Keyframes, options?: AnimateOptions): AnimationHandle;
```

Starts a lifecycle-owned native Web Animation. Omitted `duration` defaults to `180` milliseconds; explicit native timing values, including `0`, are preserved. Playback remains native:

```ts
const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
handle.animation.pause();
const result = await handle.result;
handle.dispose();
```

### `animateEach()`

```ts
function animateEach(
  elements: Iterable<Element>,
  keyframes: Keyframes | KeyframeFactory,
  options?: AnimateEachOptions,
): AnimationGroup;
```

Starts animations for unique elements in first-seen order. Necromancer resolves every keyframe factory before starting the first native animation. Use each child handle's `animation` property for native playback control.

## Layout Functions

### `captureLayout()`

```ts
function captureLayout(elements: Iterable<Element>, options?: LayoutCaptureOptions): LayoutTransition;
```

Captures unique elements' positions and sizes and returns a one-shot transition. Rotation and other transforms are not captured or compensated. After changing layout, call `transition.animate(options)` to measure current positions and sizes and animate changed, connected elements with additive CSS `translate` (position) and `scale` (size). Pass `getKey` when a framework replaces the captured elements during its render.

```ts
const transition = captureLayout(beforeItems, {
  getKey: (element) => element.getAttribute('data-id')!,
});

renderReorderedItems();

const group = transition.animate({
  duration: 220,
  easing: 'ease-out',
  elements: afterItems,
});
```

Calling `animate()` twice on the same transition throws `NecromancerConfigError`.

## Types

### `MotionMode`

```ts
type MotionMode = 'full' | 'reduced' | 'system';
```

`'system'` is the default. Reduced motion preserves the supplied keyframes while normalizing delay, duration, and end delay to `0`, and iterations to `1`.

### `AnimationResult`

```ts
type AnimationResult =
  | { readonly status: 'finished' }
  | { readonly status: 'reduced' }
  | { readonly reason?: unknown; readonly status: 'cancelled' };
```

`cancelled` describes native cancellation and includes its native rejection reason. A reason passed to `dispose()` or an abort signal takes precedence. The independent `disposed` property becomes `true` only when the lifecycle owner is explicitly disposed.

### `AnimateOptions`

```ts
type AnimateOptions = KeyframeAnimationOptions & {
  readonly interrupt?: 'cancel';
  readonly motion?: MotionMode;
  readonly signal?: AbortSignal;
};
```

Set `interrupt: 'cancel'` for rapid state changes that should replace every still-active Necromancer-owned animation on the same element. It does not cancel animations created directly with `Element.animate()`.

### `AnimateEachOptions`

```ts
type AnimateEachOptions = AnimateOptions & {
  readonly stagger?: number;
};
```

`stagger` is a finite, non-negative millisecond offset.

### `LayoutCaptureOptions`

```ts
interface LayoutCaptureOptions {
  readonly getKey?: (element: Element) => string;
}
```

`getKey` maps a captured element and its committed replacement to the same stable, non-empty string. Duplicate or empty keys throw `NecromancerConfigError`.

### `LayoutAnimationOptions`

```ts
type LayoutAnimationOptions = AnimateEachOptions & {
  readonly elements?: Iterable<Element>;
};
```

`elements` is the collection in its committed layout. Omit it to animate the same captured elements. With `getKey`, replacement elements animate from the positions of their captured predecessors. Unmatched, removed, and newly entered elements are ignored.

### `Keyframes` and `KeyframeFactory`

```ts
type Keyframes = readonly Keyframe[] | PropertyIndexedKeyframes;
type KeyframeFactory = (element: Element, index: number, total: number) => Keyframes;
```

Accepts a `readonly` array so a reusable `as const` keyframe list can be passed without a cast.

### `AnimationHandle`

```ts
interface AnimationHandle {
  readonly animation: Animation;
  readonly result: Promise<AnimationResult>;
  readonly disposed: boolean;
  dispose(reason?: unknown): void;
  [Symbol.dispose](): void;
}
```

### `AnimationGroup`

```ts
interface AnimationGroup {
  readonly handles: readonly AnimationHandle[];
  readonly results: Promise<readonly AnimationResult[]>;
  readonly disposed: boolean;
  dispose(reason?: unknown): void;
  [Symbol.dispose](): void;
}
```

`results` preserves the terminal result of every child in handle order. Use `handles` for native playback control.

### `LayoutTransition`

```ts
interface LayoutTransition {
  animate(options?: LayoutAnimationOptions): AnimationGroup;
}
```

## Errors

| Error | Trigger |
| --- | --- |
| `NecromancerError` | Base class for package errors |
| `NecromancerConfigError` | Invalid stagger, incompatible delay, or reused layout transition |
| `NecromancerUnsupportedError` | `Element.animate()` is unavailable |

## Testing (`@vielzeug/necromancer/testing`)

jsdom (and most non-browser DOM environments) do not implement `Element.animate()`. Import these from the `/testing` sub-path, not the root entry point.

### `AnimationCall`

```ts
type AnimationCall = {
  readonly animation: FakeAnimation;
  readonly keyframes: Keyframe[] | PropertyIndexedKeyframes;
  readonly options?: KeyframeAnimationOptions;
};
```

One recorded invocation of `Element.prototype.animate` from `installFakeAnimations()`.

### `installFakeAnimations()`

```ts
function installFakeAnimations(): { calls: AnimationCall[]; restore: () => void };
```

Replaces `Element.prototype.animate` with a deterministic fake for the duration of a test. `calls` records every invocation in order; call `restore()` (for example in `afterEach`) to put the original implementation back.

```ts
import { installFakeAnimations } from '@vielzeug/necromancer/testing';

const { calls, restore } = installFakeAnimations();
const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

calls[0]?.animation.finish();
await handle.result; // { status: 'finished' }
restore();
```

### `FakeAnimation`

```ts
class FakeAnimation {
  cancelCallCount: number;
  finishCallCount: number;
  finished: Promise<void>;
  cancel(): void;
  finish(): void;
}
```

A minimal `Animation` stand-in. `cancel()` rejects `finished` with an `AbortError`; `finish()` resolves it. `cancelCallCount`/`finishCallCount` track how many times each was called, in place of a test-runner-specific spy.

### `createRect()`

```ts
function createRect(x: number, y: number, width?: number, height?: number): DOMRect;
```

Builds a `DOMRect` for mocking `Element.getBoundingClientRect()` in `captureLayout()` tests. `width`/`height` default to `20`.
