---
title: Orbit Migration
---

[[toc]]

# Orbit Migration

## Orbit 2.0

Orbit 2.0 removes unused exports and speculative convenience wrappers, and aligns error handling with monorepo conventions.

Removed APIs:

- `float()`
- `FloatHandle`
- `floatWithAnchor()`
- `isCssAnchorSupported()`
- `compose()`
- `TypedMiddleware`
- `@vielzeug/orbit/ssr`
- `createFloatState()`
- `computePositionAsync()`
- `computePositionRaf()`
- `getRects()`
- `OrbitError.is()`

### Replace `computePositionAsync()` / `computePositionRaf()`

Use native deferral mechanisms directly.

```ts
// Before
const result = await computePositionAsync(reference, floating);
```

```ts
// After
const result = await Promise.resolve().then(() => computePosition(reference, floating));
```

For animation-frame-deferred computation:

```ts
// After
const result = await new Promise((resolve) =>
  requestAnimationFrame(() => resolve(computePosition(reference, floating))),
);
```

### Replace `OrbitError.is()` with `instanceof`

The static type guard is removed. Use `instanceof OrbitError` to narrow unknown errors.

```ts
// Before
if (OrbitError.is(err)) {
  // handle orbit error
}
```

```ts
// After
if (err instanceof OrbitError) {
  // handle orbit error
}
```

### `getRects()` removed from public exports

`getRects()` was an internal helper leaked to the public API. If you need raw rect measurements, call `getBoundingClientRect()` directly.

```ts
// Before
import { getRects } from '@vielzeug/orbit';
const { reference, floating } = getRects(ref, el);
```

```ts
// After
const reference = ref.getBoundingClientRect();
const floating = el.getBoundingClientRect();
```

### Replace `float()`

Create a positioner, then start and dispose it with your UI owner.

```ts
// Before
const handle = float(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

handle.dispose();
```

```ts
// After
const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
positioner.dispose();
```

### Replace Middleware Composition

Build middleware arrays directly. `computePosition()` no longer filters falsy values or infers middleware data types.

```ts
// Before
const middleware = compose(offset(8), enabled && flip(), shift());
```

```ts
// After
const middleware = [offset(8), ...(enabled ? [flip()] : []), shift()];
```

### Replace CSS Anchor Positioning

Use a standard client-owned positioner. Orbit no longer applies unsupported CSS anchor styles silently.

```ts
const positioner = createPositioner(trigger, panel, { placement: 'bottom' });
positioner.start();
```

### Remove SSR Alias

Orbit imports are server-safe. Invoke positioning only after client mount, when DOM elements exist.

```ts
onMounted(() => {
  const positioner = createPositioner(trigger, panel);
  positioner.start();
  onCleanup(() => positioner.dispose());
});
```

### Replace Reactive Adapter

`createReactivePositioner()` replaces `createFloatState()`.

```ts
const positioner = createReactivePositioner(trigger, tooltip);

const position = positioner.position.value;
```

Install `@vielzeug/ripple` when importing `@vielzeug/orbit/reactive`.

### Upgrade Checklist

- Replace `computePositionAsync()` with `Promise.resolve().then(() => computePosition(...))`.
- Replace `computePositionRaf()` with `requestAnimationFrame(() => computePosition(...))`.
- Replace `OrbitError.is(err)` with `err instanceof OrbitError`.
- Replace `getRects()` imports with direct `getBoundingClientRect()` calls.
- Replace every `float()` handle with a started `createPositioner()`.
- Build conditional middleware arrays explicitly.
- Remove root aliases to `/ssr`.
- Move CSS anchor behavior to a standard positioner.
- Replace `createFloatState()` with `createReactivePositioner()`.
- Install Ripple for `/reactive` usage.
- Update `@vielzeug/orbit` to version 2.
