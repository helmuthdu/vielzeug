---
title: Stateit — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/stateit — signals, effects, computed, and stores.
---

# Stateit Usage Guide

::: tip New to Stateit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Signals

A **signal** is the fundamental reactive primitive. It holds a single value and
notifies dependents when that value changes.

### Creating a Signal

```ts
const count = signal(0);
const name = signal('Alice');
const items = signal<string[]>([]);
```

### Reading and Writing

```ts
count.value; // read — tracked inside effect/computed
count.value = 42; // write — notifies all dependents
count.peek(); // read without registering a subscription
count.update((n) => n + 1); // update via function — equivalent to count.value = count.value + 1
```

### `readonly`

Narrows a `Signal<T>` to its read-only `ReadonlySignal<T>` interface at the type level. Useful for exposing a signal at API boundaries where callers should observe but not mutate:

```ts
const count = signal(0);
const readCount: ReadonlySignal<number> = readonly(count);

readCount.value; // fine — tracked read
// readCount.value = 1; // TS compile error — no write access
```

### `toValue`

Unwraps a plain value or signal transparently — useful in generic helpers:

```ts
toValue(42); // 42
toValue(signal(42)); // 42 (tracked if called inside effect)
```

## Effects

`effect()` runs a function immediately and re-runs it whenever any signal read
inside it changes. Returns a `Subscription` handle.

```ts
const count = signal(0);

const sub = effect(() => {
  console.log('count is:', count.value);
});
// → logs "count is: 0" immediately

count.value = 1; // → logs "count is: 1"
count.value = 2; // → logs "count is: 2"

sub.dispose(); // dispose — no more runs
// or: sub()          — calling directly also disposes
// or: using sub = effect(...) — TC39 using declaration
```

### Effect Cleanup

Return a cleanup function from the effect callback; it runs before the next
re-execution and when the effect is disposed:

```ts
const sub = effect(() => {
  const id = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(id); // cleanup on next run or dispose
});
```

### `onCleanup`

Register teardown from inside nested helpers without using the return value:

```ts
function useInterval(ms: number) {
  const id = setInterval(() => console.log('tick'), ms);
  onCleanup(() => clearInterval(id)); // registers cleanup in the current effect
}

const sub = effect(() => {
  useInterval(1000); // cleanup registered automatically
});
```

### Effect Options

```ts
const sub = effect(
  () => {
    // side-effectful code
  },
  {
    maxIterations: 50, // override global limit for this effect
    onError: (err) => {
      // handle errors; effect is auto-disposed on throw
      console.error('effect failed:', err);
    },
  },
);
```

> `maxIterations` guards against infinite reactive loops. The global default (`100`) can be changed with `configureStateit({ maxEffectIterations: N })`.

### `untrack`

Reads signals inside an effect without creating reactive subscriptions:

```ts
const a = signal(1);
const b = signal(2);

effect(() => {
  // only subscribed to `a`; changes to `b` will not re-run this effect
  const sum = a.value + untrack(() => b.value);
  console.log('sum:', sum);
});
```

## Computed

`computed()` creates a derived read-only signal whose value is automatically
recomputed when its dependencies change.

```ts
const count = signal(3);
const doubled = computed(() => count.value * 2);

console.log(doubled.value); // 6
count.value = 10;
console.log(doubled.value); // 20
```

Call `.dispose()` when the computed is no longer needed to detach it from its
dependencies and stop recomputation:

```ts
doubled.dispose();
// or: using doubled = computed(...) — TC39 using declaration
```

### `stale` Property

`ComputedSignal<T>` exposes a `.stale` boolean that is `true` when the cached value
is out-of-date (deps have changed but the value hasn't been re-read yet) or after it
has been disposed:

```ts
const sq = computed(() => count.value ** 2);
console.log(sq.stale); // false — just computed
count.value = 4;
console.log(sq.stale); // true — deps changed; value not yet re-read
console.log(sq.value); // 16 — triggers recompute
console.log(sq.stale); // false
```

### Lazy Computation

Pass `{ lazy: true }` to defer the initial computation until the first `.value` read:

```ts
const expensive = computed(() => heavyCalculation(), { lazy: true });
// `heavyCalculation` has NOT run yet
expensive.value; // computes now
```

### Chaining Computeds

```ts
const a = signal(2);
const b = computed(() => a.value * 3); // 6
const c = computed(() => b.value + 1); // 7

a.value = 4;
console.log(c.value); // 13
```

## `derived`

`derived(sources, fn)` creates a `ComputedSignal` from an array of source signals.
Each source's current value is passed as a positional argument to the projector
function:

```ts
import { signal, derived } from '@vielzeug/stateit';

const price = signal(10);
const quantity = signal(5);
const discount = signal(0.1);

const total = derived([price, quantity, discount], (p, q, d) => p * q * (1 - d));

console.log(total.value); // 45
price.value = 20;
console.log(total.value); // 90
```

## `writable`

`writable(get, set)` creates a bi-directional computed — reads track the getter
reactively, writes are forwarded to the custom setter. Useful for form adapters
and transformations that need to write back to the source.

```ts
const firstName = signal('Alice');
const upper = writable(
  () => firstName.value.toUpperCase(),
  (v) => {
    firstName.value = v.toLowerCase();
  },
);

console.log(upper.value); // 'ALICE'
upper.value = 'BOB';
console.log(firstName.value); // 'bob'

upper.dispose(); // stop tracking getter
```

`WritableSignal<T>` also adds an `update(fn)` method and a `stale` property, identical to `ComputedSignal<T>`:

```ts
const celsius = signal(0);
const fahrenheit = writable(
  () => (celsius.value * 9) / 5 + 32,
  (f) => {
    celsius.value = ((f - 32) * 5) / 9;
  },
);

fahrenheit.update((f) => f + 10); // increments by 10°F, forwards to celsius
fahrenheit.stale; // false after a read; true after a dep change
```

## `watch` (Signals)

`watch()` is an explicit subscription that fires only when the signal's value
changes — it does **not** run immediately like `effect()`. Returns a `Subscription`.

```ts
const count = signal(0);

const sub = watch(count, (next, prev) => {
  console.log(prev, '→', next);
});

count.value = 1; // → logs "0 → 1"
sub.dispose();
// or: sub()    — calling directly also disposes
```

### Options

```ts
// Fire once immediately on subscription
watch(count, (v) => console.log(v), { immediate: true });

// Auto-unsubscribe after the first change
watch(count, (v) => console.log('once:', v), { once: true });

// Custom equality — suppress callback when result is considered equal
watch(list, (v) => renderList(v), { equals: (a, b) => a.length === b.length });
```

### Watching a Slice

The `watch()` function has a single-source signature. To watch a derived slice,
compose it with `store.select()` or `computed()`:

```ts
// ✅ preferred — compose with store.select()
const nameSignal = userStore.select((s) => s.name);
watch(nameSignal, (name, prev) => console.log('name:', prev, '→', name));

// ✅ also fine — use computed() for any transformation
const isAdmin = computed(() => userStore.value.role === 'admin');
watch(isAdmin, (v) => console.log('isAdmin:', v));
```

## `nextValue` — Async Watch

`nextValue(source, predicate?)` returns a `Promise` that resolves the next time
the source emits a value that satisfies the optional predicate. The underlying
subscription is disposed automatically — no cleanup required.

```ts
import { signal, nextValue } from '@vielzeug/stateit';

const status = signal<'idle' | 'loading' | 'done'>('idle');

// Wait for the next emission (any change)
const next = await nextValue(status);
console.log(next); // 'loading' (or whatever was set first)

// Wait for a specific condition
const done = await nextValue(status, (v) => v === 'done');
console.log(done); // 'done'
```

## `batch` (Signals)

`batch()` defers all signal notifications until the callback returns, then
flushes once. Nested batches coalesce into the outermost.

```ts
const a = signal(0);
const b = signal(0);

let fires = 0;
effect(() => {
  a.value;
  b.value;
  fires++;
});
// fires is 1 (initial run)

batch(() => {
  a.value = 1;
  b.value = 2;
});
// fires is 2 (one flush for both)
```

If the callback throws, pending notifications are still flushed after the error;
the original error is re-thrown with the flush errors suppressed.

## Stores

A `Store<T>` **is** a `Signal<T>` — it extends `Signal` and adds structured
state helpers. Every signal primitive (`computed`, `effect`, `watch`, `batch`,
`untrack`, `readonly`, `toValue`) works on stores directly.

## Creating a Store

```ts
import { store } from '@vielzeug/stateit';

const s = store({ count: 0, user: null as User | null });
```

### With Options

```ts
import { store, shallowEqual } from '@vielzeug/stateit';

const s = store(
  { items: [] as Item[], filter: '' },
  {
    equals: shallowEqual, // default; shown explicitly for clarity
  },
);
```

`equals` controls top-level change detection — two states that pass `equals` will not fire watchers. The default is `shallowEqual`.

## Reading State

```ts
const state = s.value; // { count: 0, user: null }
const count = s.value.count; // 0
```

`.value` is a synchronous getter — no method call needed.

## Writing State

### Partial Patch

Shallow-merges the patch into the current state:

```ts
s.patch({ count: 1 });
// Equivalent to: { ...current, count: 1 }
```

### Updater Function

Receives a shallow copy of the current state; return value replaces it:

```ts
s.update((current) => ({ ...current, count: current.count + 1 }));
```

### Direct Assignment

The store's `.value` setter is also available for full-state replacement:

```ts
s.value = { count: 100, user: null };
```

Both `patch()` and `update()` are no-ops when the resulting state is equal to the current state (determined by `StoreOptions.equals`, which defaults to `shallowEqual`).

## Resetting State

```ts
// Restore to the state passed to store()
s.reset();
```

`reset()` triggers a notification if the state actually changes. The initial state
is defensively copied at construction time — external mutations to the original
object cannot corrupt `reset()`.

## Derived Slices

`store.select()` returns a lazily computed signal derived from a slice of the store's state:

```ts
const countSignal = s.select((s) => s.count);
console.log(countSignal.value); // 0

// Compose with watch() to react to slice changes only
const sub = watch(countSignal, (count, prev) => {
  console.log('count changed:', prev, '→', count);
});
```

Selectors short-circuit by default (`Object.is` equality). Pass a custom `equals` option for arrays and objects:

```ts
const items = s.select((state) => state.items, { equals: (a, b) => a.length === b.length });
```

## Watching State

### Full-State Watch

```ts
// Does not fire immediately — use { immediate: true } to opt in
const sub = watch(s, (curr, prev) => {
  console.log('state changed', curr);
});

sub.dispose(); // stop receiving updates
```

When `immediate: true`, the listener fires once synchronously on subscription with both `curr` and `prev` set to the current value:

```ts
watch(
  s,
  (curr, prev) => {
    console.log('initial or changed:', curr.count);
  },
  { immediate: true },
);
```

When `once: true`, the watcher auto-unsubscribes after the first notification:

```ts
watch(s, (curr) => console.log('first change:', curr), { once: true });
```

### Slice Watch

Compose `store.select()` with `watch()` to watch a derived slice:

```ts
// Only fires when `count` changes — unrelated state changes are ignored
const countSignal = s.select((state) => state.count);
watch(countSignal, (count, prev) => console.log('count changed to', count));

// With custom equality
const itemsSignal = s.select((state) => state.items);
watch(itemsSignal, (items) => renderList(items), {
  equals: (a, b) => a.length === b.length,
});
```

## Batching

`batch()` groups multiple writes into a single notification:

```ts
import { batch } from '@vielzeug/stateit';

const result = batch(() => {
  s.patch({ firstName: 'Alice' });
  s.patch({ lastName: 'Smith' });
  s.patch({ age: 30 });
  return 'profile updated';
});
// One notification for all three patch() calls
// result === 'profile updated'
```

Nested `batch()` calls merge into the outermost — only one notification fires when the outermost batch completes.

## Disposing / Freezing

```ts
s.freeze();
```

Freezes the store. After `freeze()`:

- `patch()`, `update()`, `reset()` silently do nothing
- `.value` is still readable
- `s.frozen` returns `true`

Use `freeze()` when you want to lock a store from further writes. It is not a replacement for disposing `effect()` / `watch()` subscriptions.

## Narrowing to Read-Only

To expose a store at API boundaries where consumers should observe but not mutate, narrow it to `ReadonlySignal<T>`:

```ts
function createCounterService() {
  const s = store({ count: 0 });

  return {
    state: readonly(s),
    increment() {
      s.update((st) => ({ count: st.count + 1 }));
    },
    decrement() {
      s.update((st) => ({ count: st.count - 1 }));
    },
  };
}

const counter = createCounterService();
counter.state.value.count; // readable
// counter.state.value = ...; // TS compile error — read-only
```

## Global Configuration

Use `configureStateit` to adjust global defaults:

```ts
import { configureStateit } from '@vielzeug/stateit';

configureStateit({ maxEffectIterations: 200 });
```

| Option                | Default | Description                                             |
| --------------------- | ------- | ------------------------------------------------------- |
| `maxEffectIterations` | `100`   | Guard against infinite reactive loops inside `effect()` |

## `Symbol.dispose` / `using` Declarations

All `Subscription` and `Disposable` handles implement `[Symbol.dispose]`,
enabling the TC39 [explicit resource management](https://github.com/tc39/proposal-explicit-resource-management) syntax:

```ts
{
  using sub = effect(() => console.log(count.value));
  using doubled = computed(() => count.value * 2);
  // both are automatically disposed when the block exits
}
```

## Best Practices

### 1. Signals for Primitive Values, Stores for Objects

```ts
// ✅ signal for a single scalar
const isOpen = signal(false);

// ✅ store for structured objects
const user = store({ id: '', name: '', role: 'guest' });

// ❌ store for a simple boolean — overcomplicated
const isOpen = store({ value: false });
```

### 2. Computed for Derived Values

```ts
// ✅ computed instead of duplicating logic in effects
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

// ❌ avoid manually syncing derived state in an effect
const fullNameState = signal('');
effect(() => {
  fullNameState.value = `${firstName.value} ${lastName.value}`;
});
```

### 3. Compose `store.select()` with `watch()` for Slice Subscriptions

```ts
// ✅ slice subscription — only fires when count changes
const countSignal = userStore.select((s) => s.count);
watch(countSignal, (count) => console.log('count:', count));

// ❌ old overload is no longer supported:
// watch(userStore, (s) => s.count, (count) => { ... });
```

### 4. Batch Multiple Updates

```ts
// ✅ one notification instead of two
batch(() => {
  x.value = 1;
  y.value = 2;
});
```

### 5. Use `.update()` to Avoid Stale Reads

```ts
// ✅ concise and avoids re-reading .value
count.update((n) => n + 1);

// also fine for stores
cart.update((s) => ({ ...s, items: [...s.items, newItem] }));
```

### 6. Dispose Effects and Computeds When No Longer Needed

```ts
const sub = effect(() => (document.title = `Count: ${count.value}`));

// when component unmounts:
sub.dispose();
```

### 7. Use `untrack` to Break Unwanted Dependencies

```ts
effect(() => {
  const id = userId.value; // tracked
  const name = untrack(() => users.value[id]); // NOT tracked — avoids re-run on users change
  render(id, name);
});
```

## Testing

Stateit stores are plain objects — no special test utilities needed. Create a
fresh store in `beforeEach` and `freeze()` it in `afterEach`.

```ts
import { store, watch, _resetContextForTesting } from '@vielzeug/stateit';
import type { Store } from '@vielzeug/stateit';

describe('counter', () => {
  let s: Store<{ count: number }>;

  beforeEach(() => {
    _resetContextForTesting(); // clear any leaked context between tests
    s = store({ count: 0 });
  });

  afterEach(() => {
    s.freeze();
  });

  it('patches count', () => {
    s.patch({ count: 1 });
    expect(s.value.count).toBe(1);
  });

  it('notifies watcher on change', () => {
    const listener = vi.fn();
    watch(s, listener);
    s.patch({ count: 5 });
    // notifications are synchronous — no await needed
    expect(listener).toHaveBeenCalledWith({ count: 5 }, { count: 0 });
  });
});
```

For isolated signal tests, create signals in the test scope — they are
garbage-collected unless an active `effect()` holds a reference:

```ts
it('computed updates reactively', () => {
  const n = signal(2);
  const sq = computed(() => n.value ** 2);
  expect(sq.value).toBe(4);
  n.value = 3;
  expect(sq.value).toBe(9);
  sq.dispose();
});
```
