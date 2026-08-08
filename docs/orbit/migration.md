---
title: Orbit 2.0 Migration
description: Migrate Orbit 1.x float helpers, middleware composition, SSR stubs, and reactive positioning to Orbit 2.
---

[[toc]]

# Orbit 2.0 Migration

## Orbit 2 Changes

Orbit 2 replaces `float()` with lifecycle-owned `createPositioner()`, removes the SSR no-op facade, and simplifies middleware to explicit arrays.

Removed APIs:

- `float()`
- `FloatHandle`
- `floatWithAnchor()`
- `isCssAnchorSupported()`
- `compose()`
- `TypedMiddleware`
- `@vielzeug/orbit/ssr`
- `createFloatState()`

## Replace `float()`

Create a positioner, then start and dispose it with your UI owner.

```ts
// Orbit 1
const handle = float(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

handle.dispose();
```

```ts
// Orbit 2
const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.start();
positioner.dispose();
```

## Replace Middleware Composition

Build middleware arrays directly. `computePosition()` no longer filters falsy values or infers middleware data types.

```ts
// Orbit 1
const middleware = compose(offset(8), enabled && flip(), shift());
```

```ts
// Orbit 2
const middleware = [offset(8), ...(enabled ? [flip()] : []), shift()];
```

## Replace CSS Anchor Positioning

Use a standard client-owned positioner. Orbit no longer applies unsupported CSS anchor styles silently.

```ts
const positioner = createPositioner(trigger, panel, { placement: 'bottom' });
positioner.start();
```

## Remove SSR Alias

Orbit imports are server-safe. Invoke positioning only after client mount, when DOM elements exist.

```ts
onMounted(() => {
  const positioner = createPositioner(trigger, panel);
  positioner.start();
  onCleanup(() => positioner.dispose());
});
```

## Replace Reactive Adapter

`createReactivePositioner()` replaces `createFloatState()`.

```ts
const positioner = createReactivePositioner(trigger, tooltip);

const position = positioner.position.value;
```

Install `@vielzeug/ripple` when importing `@vielzeug/orbit/reactive`.

## Upgrade Checklist

- Replace every `float()` handle with a started `createPositioner()`.
- Build conditional middleware arrays explicitly.
- Remove root aliases to `/ssr`.
- Move CSS anchor behavior to a standard positioner.
- Replace `createFloatState()` with `createReactivePositioner()`.
- Install Ripple for `/reactive` usage.
- Update `@vielzeug/orbit` to version 2.
