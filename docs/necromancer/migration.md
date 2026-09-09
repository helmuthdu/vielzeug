---
title: Necromancer Migration
---

# Necromancer 3.0 Migration

Necromancer 3 removes implicit animation replacement and package-owned timing defaults. Animation ownership and visual timing now remain explicit at the call site.

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
