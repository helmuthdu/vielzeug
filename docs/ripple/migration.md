---
title: 'Ripple: Migration Guide'
description: Migrate isolated runtimes and error handling to the shared runtime and scoped ownership.
---

Breaking changes ship in CalVer trains. The sections below describe removed contracts and their
current replacements; no stored or serialized formats change.

## Replace isolated runtimes with scopes

`createRipple()`, the `Ripple` interface, and `RippleOptions` are removed. Root functions now share
one module-level runtime, so values can track across scopes. Use `createScope()` to own effects,
computeds, cleanups, resources, or bridges that should be disposed together.

```ts
// Before
const ripple = createRipple();
const count = ripple.signal(0);
const doubled = ripple.computed(() => count.value * 2);
const stop = ripple.effect(() => console.log(doubled.value));
stop.dispose();
ripple.dispose();

// After
import { computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope();
const count = signal(0);
scope.run(() => {
  const doubled = computed(() => count.value * 2);
  effect(() => console.log(doubled.value));
});
scope.dispose();
```

Scopes control ownership, not dependency visibility: reactive reads track across scopes.
`Ripple.createScope(name)` also changes to the root `createScope(options)` function; pass a
`{ name }` options object instead of a string:

```ts
// Before
const ripple = createRipple();
const panel = ripple.createScope('panel');

// After
import { createScope } from '@vielzeug/ripple';

const panel = createScope({ name: 'panel' });
```

## Move error handling to scopes

`onError` is no longer a runtime option. Configure it on the scope that owns the callbacks. The
nearest handler wins; if a handler throws, its error escalates to the parent scope. With no handler,
errors rethrow asynchronously. Listener failures and flush overflow use the root error route.

```ts
// Before
const ripple = createRipple({ onError: (error, context) => report(context.kind, error) });
ripple.effect(() => render(state.value));

// After
import { createScope, effect } from '@vielzeug/ripple';

const scope = createScope({ onError: (error, context) => report(context.kind, error) });
scope.run(() => effect(() => render(state.value)));
scope.dispose();
```

## Computeds are lazy; the computed error kind is removed

Computeds no longer re-derive the moment a source is written. A write marks them stale, and they derive on the next read, at most once per flush, from up-to-date sources. That removes two old artifacts: a diamond could derive from a stale sibling, and a `batch()` re-derived a computed once per write.

Derivation errors are cached and surface through the consumer that reads them. `RippleErrorContext.kind` drops `'computed'`: an effect reading a failing computed reports `'effect'`, and a subscription reports `'listener'`.

```ts
// Before
onError: (error, context) => {
  if (context.kind === 'computed') reportDerivation(error);
};

// After: the reading effect names the failure
onError: (error, context) => {
  if (context.kind === 'effect') reportEffect(context.name, error);
};
```

Code that relied on a computed deriving with no reader (for example, a side effect inside `derive`) must move that work into `effect()`. Keep `derive` pure.

## Effect scheduling is stricter

An effect now depends on a source from the moment it reads it, not when its run ends. A write later in the same run therefore reaches it. An effect that reads and writes one signal (`count.value = count.value + 1`) is reported as a runaway flush on its first run, where it used to loop only once something else triggered a rerun. Read with `peek()` or use `update()` when the write must not be a dependency. Flushes also run a parent effect before the effects its runs created. A rerun creates scopes under the scope the effect was created in, not under whichever scope made the write.

## Effect cleanup order and disposal-time work

An effect's returned cleanup now runs before the `onCleanup()` callbacks registered during the same run, matching the newest-first order everywhere else (the returned cleanup is registered last). Effects, computeds, and `onCleanup()` callbacks created inside a cleanup belong to the owner being disposed and are torn down immediately instead of attaching to the parent.

## Disposed bridges throw RippleDisposedError

Subscribing to a disposed `fromSubscribable()` bridge throws `RippleDisposedError`, like a disposed resource, instead of a bare `RippleError`. `instanceof RippleError` checks keep working.

## Replace tap() and errorPolicy with scoped onError

The `tap()` event stream (`RippleEvent`), `RippleErrorPolicy`, `observer`, and `errorPolicy` are
removed. Use `createScope({ onError })` to handle failures from effects and cleanups in a subtree.

```ts
// Before
const ripple = createRipple({ errorPolicy: 'swallow' });
ripple.tap((event) => {
  if (event.type === 'error') console.error(event.context.kind, event.error);
});

// After
const scope = createScope({
  onError: (error, context) => console.error(context.kind, error),
});
```

Omitting `onError` keeps the default: unhandled errors rethrow asynchronously. A throwing handler
escalates to a parent scope. `RippleErrorContext` includes the `'flush'` kind.

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

`fromSubscribable()` bridges external `{ getSnapshot, subscribe }` sources into a disposable reactive readable without the source importing Ripple. Use the root function and dispose the bridge with its scope.

```ts
import { createScope, fromSubscribable } from '@vielzeug/ripple';

const scope = createScope();
const routerState = scope.run(() =>
  fromSubscribable({
    getSnapshot: () => router.getSnapshot(),
    subscribe: (cb) => router.subscribe(cb),
  }),
);

scope.dispose();
```

## Remove the effect scheduler option

`EffectOptions.scheduler` is removed; `EffectOptions` accepts only `name`. Effects run synchronously.
Use `batch()` when multiple writes should produce one effect run; separate writes outside a batch
flush individually.

```ts
// Before
ripple.effect(() => console.log(count.value), { scheduler: 'microtask' });

// After: batch coalesces the writes instead
effect(() => console.log(count.value));
batch(() => {
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
if (isSignal(value)) {
  /* ... */
}
if (isComputed(value)) {
  /* ... */
}

// After
if (isReactive(value)) {
  /* read value.value, value.peek(), or value.subscribe() */
}
```

`isReactive()` checks a structural marker and readable contract, not trusted provenance.

---

Review the [Usage Guide](./usage) and [API Reference](./api) for current contracts.
