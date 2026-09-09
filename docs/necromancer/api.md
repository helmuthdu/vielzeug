---
title: Necromancer — API Reference
description: API reference for @vielzeug/necromancer animation ownership, groups, reduced motion, and FLIP transitions.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `animate()` | Animate one element | Sync | Omitted timing fields use native WAAPI behavior |
| `animateEach()` | Animate a unique element group | Sync | Non-zero `stagger` needs numeric `delay` |
| `captureLayout()` | Capture positions and create a one-shot FLIP transition | Sync | Capture before changing layout |
| `NecromancerError` | Base package error | Sync | Use `instanceof NecromancerError` to narrow unknown errors |

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

Starts a lifecycle-owned native Web Animation. Native timing options, including an omitted or zero `duration`, are preserved.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | `Element` | Element animated through its native `animate()` method. |
| `keyframes` | `Keyframes` | Native keyframe array or property-indexed keyframes. |
| `options` | `AnimateOptions` | Native timing plus motion and cancellation ownership. |

**Returns:** An `AnimationHandle` with native playback access and explicit disposal.

**Example:**

```ts
import { animate } from '@vielzeug/necromancer';

const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
handle.animation.pause();
const result = await handle.result;
handle.dispose();
```

---

### `animateEach()`

```ts
function animateEach<ElementType extends Element>(
  elements: Iterable<ElementType>,
  keyframes: Keyframes | KeyframeFactory<ElementType>,
  options?: AnimateEachOptions,
): AnimationGroup;
```

Starts animations for unique elements in first-seen order. Necromancer resolves every keyframe factory before starting the first native animation.

| Parameter | Type | Description |
| --- | --- | --- |
| `elements` | `Iterable<ElementType>` | Elements animated once in first-seen order. |
| `keyframes` | `Keyframes \| KeyframeFactory<ElementType>` | Shared keyframes or a subtype-preserving factory. |
| `options` | `AnimateEachOptions` | Animation options plus a stagger interval. |

**Returns:** An `AnimationGroup` containing child handles and ordered results.

**Example:**

```ts
import { animateEach } from '@vielzeug/necromancer';

const group = animateEach(document.querySelectorAll<HTMLElement>('.item'), [{ opacity: 0 }, { opacity: 1 }], {
  duration: 180,
  stagger: 30,
});
await group.results;
```

## Layout Functions

### `captureLayout()`

```ts
function captureLayout<ElementType extends Element>(
  elements: Iterable<ElementType>,
  options?: LayoutCaptureOptions<ElementType>,
): LayoutTransition<ElementType>;
```

Captures unique elements' positions and sizes and returns a one-shot transition. Rotation and other transforms are not captured or compensated.

| Parameter | Type | Description |
| --- | --- | --- |
| `elements` | `Iterable<ElementType>` | Elements measured before a layout change. |
| `options` | `LayoutCaptureOptions<ElementType>` | Optional stable key mapping for replacement nodes. |

**Returns:** A `LayoutTransition<ElementType>` that measures committed layout once and creates an `AnimationGroup`.

**Example:**

```ts
import { captureLayout } from '@vielzeug/necromancer';

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

Native timing fields pass through unchanged unless reduced motion normalizes timing. `signal` disposes the returned handle when aborted.

### `AnimateEachOptions`

```ts
type AnimateEachOptions = AnimateOptions & {
  readonly stagger?: number;
};
```

`stagger` is a finite, non-negative millisecond offset.

### `LayoutCaptureOptions`

```ts
interface LayoutCaptureOptions<ElementType extends Element = Element> {
  readonly getKey?: (element: ElementType) => string;
}
```

`getKey` maps a captured element and its committed replacement to the same stable, non-empty string. Duplicate or empty keys throw `NecromancerConfigError`.

### `LayoutAnimationOptions`

```ts
type LayoutAnimationOptions<ElementType extends Element = Element> = AnimateEachOptions & {
  readonly elements?: Iterable<ElementType>;
};
```

`elements` is the collection in its committed layout. Omit it to animate the same captured elements. With `getKey`, replacement elements animate from the positions of their captured predecessors. Unmatched, removed, and newly entered elements are ignored.

### `Keyframes` and `KeyframeFactory`

```ts
type Keyframes = readonly Keyframe[] | PropertyIndexedKeyframes;
type KeyframeFactory<ElementType extends Element = Element> = (
  element: ElementType,
  index: number,
  total: number,
) => Keyframes;
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

| Member | Description |
| --- | --- |
| `animation` | Owned native animation used for playback control. |
| `result` | Resolves with the first terminal outcome. |
| `disposed` | Reports explicit owner disposal. |
| `dispose(reason?)` | Cancels the animation and releases its abort listener. |
| `[Symbol.dispose]()` | Delegates to `dispose()`. |

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

| Member | Description |
| --- | --- |
| `handles` | Child handles in input order. |
| `results` | Resolves with every child outcome in handle order. |
| `disposed` | Reports explicit group disposal. |
| `dispose(reason?)` | Disposes every child. |
| `[Symbol.dispose]()` | Delegates to `dispose()`. |

### `LayoutTransition`

```ts
interface LayoutTransition<ElementType extends Element = Element> {
  animate(options?: LayoutAnimationOptions<ElementType>): AnimationGroup;
}
```

| Method | Description |
| --- | --- |
| `animate(options?)` | Measures committed elements and creates the one allowed layout animation group. |

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
function installFakeAnimations(): {
  readonly calls: readonly AnimationCall[];
  restore(): void;
  [Symbol.dispose](): void;
};
```

Replaces `Element.prototype.animate` with a deterministic lifecycle fake for the duration of a test. `calls` records every invocation in order. Call `restore()` or use an explicit resource-management `using` declaration to put the original implementation back. The fake does not implement native playback controls such as `pause()` or `reverse()`.

```ts
import { installFakeAnimations } from '@vielzeug/necromancer/testing';

using animations = installFakeAnimations();
const handle = animate(element, [{ opacity: 0 }, { opacity: 1 }]);

animations.calls[0]?.animation.finish();
await handle.result; // { status: 'finished' }
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
