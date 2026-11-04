---
title: 'Necromancer: Migration Guide'
description: Migrate removed results statuses, cancellation reasons, and stagger validation to current Necromancer contracts.
---

Breaking changes ship in CalVer trains. The sections below describe removed contracts and their replacements.

## Animation results report two statuses

`AnimationResult` no longer carries a `'reduced'` status: a reduced animation finishes immediately, so awaiting `result` reports `{ status: 'finished' }`. Ask the mode directly when your own flow needs the answer:

```ts
// Before
const result = await handle.result;
if (result.status === 'reduced') applyStaticLayout();

// After
if (shouldReduceMotion(options.motion ?? 'system')) applyStaticLayout();
```

## Owner cancellations report their own reason

`dispose()` without a reason now resolves `{ status: 'cancelled' }` with no `reason`, instead of leaking the native cancel's `DOMException`. Only a cancellation from outside Necromancer (for example `handle.animation.cancel()`) surfaces a native reason.

```ts
// Before: a bare dispose() resolved with the WAAPI DOMException
// After
handle.dispose();
await handle.result; // { status: 'cancelled' }
```

## Stagger configuration fails before any animation starts

`animateEach()` with a non-zero `stagger` and a non-numeric `delay` now throws `NecromancerConfigError` before starting its first animation, instead of after partially starting the group. No code change is required; the same error simply arrives earlier and with no side effects.

## Dispose the previous animation explicitly

`interrupt: 'cancel'` was removed. Retain the current handle and dispose it before starting its replacement.

```ts
// Before
let current = animate(element, keyframes, { interrupt: 'cancel' });
```

```ts
// After
current?.dispose();
current = animate(element, keyframes, { duration: 180 });
```

Explicit ownership avoids cancelling unrelated Necromancer animations running on the same element.

## Set animation timing explicitly

Omitted timing fields now retain native Web Animations API behavior. Set `duration` when an animation should run over time.

```ts
// Before: Necromancer supplied 180ms
const handle = animate(element, keyframes);

// After
const handle = animate(element, keyframes, { duration: 180 });
```

An explicit `duration: 0` remains unchanged.

## Use inferred element subtypes

`animateEach()` and `captureLayout()` now preserve the element subtype supplied by their iterable. Existing casts used only to access subtype properties can be removed.

```ts
const transition = captureLayout(document.querySelectorAll<HTMLElement>('[data-id]'), {
  getKey: (element) => element.dataset.id!,
});
```

## Dispose test installations safely

`installFakeAnimations()` now supports explicit resource management. Manual `restore()` remains available.

```ts
using animations = installFakeAnimations();
```
