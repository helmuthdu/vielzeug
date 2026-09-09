---
title: Ripple Migration
---

# Ripple 3.0 Migration

Ripple 3.0 adds structural store interoperability and unifies observability under `tap()`. The focused `resource()` helper remains available for reactive request succession; use Sourcerer when collection pagination or a richer loading model is required.

## Resource state

```ts
import { resource, signal } from '@vielzeug/ripple';

const userId = signal('42');
const user = resource(() => userId.value, async (id, { signal }) => {
  const response = await fetch(`/users/${id}`, { signal });
  return response.json();
});

user.dispose();
```

Resources preserve a successful `undefined` value as `previous`. After disposal, state remains readable while `reload()` and new subscriptions throw `RippleDisposedResourceError`.

## Replace observer and onError with tap() and errorPolicy

The constructor `observer` and `onError` callbacks are replaced by a runtime `tap()` method and a deterministic `errorPolicy` option.

```ts
// Before
const ripple = createRipple({
  observer(event) { console.log(event.kind); },
  onError(error, context) { console.error(context.kind, error); },
});

// After
const ripple = createRipple({ errorPolicy: 'swallow' });

ripple.tap((event) => {
  if (event.type === 'write') console.log(event.name);
  if (event.type === 'error') console.error(event.context.kind, event.error);
});
```

`errorPolicy` controls whether computed refresh, effect, cleanup, and listener failures rethrow (`'throw'`, default) or are silenced (`'swallow'`). Error events are always emitted through `tap()`. During runtime disposal, cleanup errors and owned-node disposal events arrive before the final graph disposal event.

## Use fromSubscribable for external sources

`fromSubscribable()` bridges external `{ getSnapshot, subscribe }` sources into a disposable reactive readable without the source importing Ripple. Use the instance method for isolated graph ownership and dispose the bridge with its owner.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const routerState = ripple.fromSubscribable({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (cb) => router.subscribe(cb),
});

routerState.dispose();
ripple.dispose();
```

## Renamed types

`ReactiveEvent` is now `RippleEvent` and uses `type` instead of `kind`. Replace `ReactiveObserver` with a `tap()` handler. `ReactiveErrorContext` is now `RippleErrorContext` and includes `computed` failures. `RippleOptions` no longer accepts `observer` or `onError`; use `errorPolicy` and `tap()`.

---

# Ripple 2.0 Migration

Ripple 2.0 simplifies the public API surface: one entry point, no separate Store primitive, and no dead type guards.

## Import from the root entry point

The `./async`, `./store`, and `./watch` subpaths are removed. Import all primitives from `@vielzeug/ripple`.

```ts
// Before
import { signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';
import { resource } from '@vielzeug/ripple/async';
import { createStore } from '@vielzeug/ripple/store';

// After
import { signal, watch } from '@vielzeug/ripple';
```

## Replace createStore with signal.update

`createStore()` is removed. `Signal<T>` now has an `update()` method that covers the same replacement-based pattern.

```ts
// Before
const cart = ripple.createStore({ items: 0 });
cart.update((state) => ({ ...state, items: 3 }));
cart.set({ items: 5 });

// After
const cart = ripple.signal({ items: 0 });
cart.update((state) => ({ ...state, items: 3 }));
cart.value = { items: 5 };
```

## Remove isSignal and isComputed

`isSignal()` and `isComputed()` are removed with no replacement. Use `isReactive()` for `Readable` identity checks.

```ts
// Before
if (isSignal(value)) { /* ... */ }
if (isComputed(value)) { /* ... */ }

// After
if (isReactive(value)) { /* ... */ }
```

---

Review the [Usage Guide](./usage) and [API Reference](./api) for current contracts.
