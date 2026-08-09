---
title: Necromancer — API Reference
description: API reference for @vielzeug/necromancer animation ownership, groups, reduced motion, and FLIP transitions.
---

[[toc]]

## API Overview

| Symbol | Purpose | Common gotcha |
| --- | --- | --- |
| `animate()` | Animate one element | Call only where `Element.animate()` is available |
| `animateEach()` | Animate a unique element group | Non-zero `stagger` needs numeric `delay` |
| `captureLayout()` | Capture positions and create a one-shot FLIP transition | Capture before changing layout |
| `NecromancerError` | Base package error | Use `NecromancerError.is()` to narrow unknown errors |

## Package Entry Point

All public functions, errors, and types are exported from `@vielzeug/necromancer`.

## Animation Functions

### `animate()`

```ts
function animate(element: Element, keyframes: Keyframes, options?: AnimateOptions): AnimationHandle;
```

Starts a lifecycle-owned native Web Animation. Playback remains native:

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

Captures unique element positions and returns a one-shot transition. After changing layout, call `transition.animate(options)` to measure current positions and animate changed, connected elements with CSS `translate`. Pass `getKey` when a framework replaces the captured elements during its render.

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
  readonly motion?: MotionMode;
  readonly signal?: AbortSignal;
};
```

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
type Keyframes = Keyframe[] | PropertyIndexedKeyframes;
type KeyframeFactory = (element: Element, index: number, total: number) => Keyframes;
```

### `AnimationHandle`

```ts
interface AnimationHandle {
  readonly animation: Animation;
  readonly result: Promise<AnimationResult>;
  readonly disposalSignal: AbortSignal;
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
  readonly disposalSignal: AbortSignal;
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
