---
title: 'Ripple: Migration Guide'
description: Migrate removed runtime options, error classes, and entry points to current Ripple contracts.
---

Breaking changes ship in CalVer trains. The sections below describe removed contracts and their
current replacements; no stored or serialized formats change.

## Replace tap() and errorPolicy with one onError option

The `tap()` event stream (`RippleEvent`), `RippleErrorPolicy`, `observer`, and `errorPolicy` are
removed. Use the single `onError` runtime option to handle callback failures.

```ts
// Before
const ripple = createRipple({ errorPolicy: 'swallow' });
ripple.tap((event) => {
  if (event.type === 'error') console.error(event.context.kind, event.error);
});

// After
const ripple = createRipple({
  onError: (error, context) => console.error(context.kind, error),
});
```

Omitting `onError` keeps the old default: failures rethrow asynchronously. Pass a no-op to silence rethrow (the old `'swallow'`). `RippleErrorContext` gains the `'flush'` kind.

## Error classes collapsed

`RippleComputedCycleError` and `RippleInfiniteLoopError` become `RippleCycleError`; `RippleDisposedRuntimeError`, `RippleDisposedScopeError`, and `RippleDisposedResourceError` become `RippleDisposedError`. Catch `RippleError` or the two remaining subclasses; messages stay specific.

```ts
// Before
if (error instanceof RippleComputedCycleError || error instanceof RippleInfiniteLoopError) {
  console.error('Reactive cycle', error);
}

// After
if (error instanceof RippleCycleError) {
  console.error('Reactive cycle', error);
}
```

The exported hierarchy has exactly three classes: `RippleError`, `RippleCycleError`, and
`RippleDisposedError`. Runtime callback errors retain their original values; resource loader
failures appear in resource state.

## Flush-loop breaches are reported, not thrown

Exceeding the flush iteration limit no longer throws from the signal write that happened to trigger the flush. The flush is abandoned and a `RippleCycleError` is reported to `onError` with context kind `flush`; the graph stays usable.

## Disposed never-evaluated computeds throw from peek()

`peek()` on a computed disposed before its first evaluation used to return an internal sentinel typed as `T`. It now throws `RippleDisposedError`. Computed values cached before disposal still read normally.

## `subscribe()` listeners fire per registration

Previously, two `subscribe()` registrations that shared one callback function on signals written in the same
synchronous flush fired that callback once instead of once per subscription. Each registration now fires once per
flush. No call-site change is required; code that relied on the collapsed behavior (rare, and almost always a bug)
observes one additional invocation.

## `watch()` `once` option removed

`{ once: true }` duplicated what the returned handle already expresses, and its immediate-run disposal needed a temporal-dead-zone workaround inside `watch()` itself. Dispose the handle from the callback instead:

```ts
// Before
const stop = watch(count, (value) => report(value), { once: true });

// After
const stop = watch(count, (value) => {
  report(value);
  stop.dispose();
});
```

With `immediate: true` the callback runs before `watch()` returns, so a self-disposing callback would reference a handle that does not exist yet. Do the immediate work at the call site instead:

```ts
// Before
const stop = watch(count, (value) => report(value), { immediate: true, once: true });

// After
report(count.value);
const stop = watch(count, (value) => {
  report(value);
  stop.dispose();
});
```

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

## Remove the effect scheduler option

`EffectOptions.scheduler` is removed; `EffectOptions` accepts only `name`. Effects run synchronously.
Use `batch()` when multiple writes should produce one effect run; separate writes outside a batch
flush individually.

```ts
// Before
ripple.effect(() => console.log(count.value), { scheduler: 'microtask' });

// After: batch coalesces the writes instead
ripple.effect(() => console.log(count.value));
ripple.batch(() => {
  count.value = 1;
  count.value = 2;
}); // one run, sees 2
```

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
if (isReactive(value)) { /* read value.value, value.peek(), or value.subscribe() */ }
```

`isReactive()` checks a structural marker and readable contract, not trusted provenance.

---

Review the [Usage Guide](./usage) and [API Reference](./api) for current contracts.
