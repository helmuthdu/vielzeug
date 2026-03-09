---
title: Stateit — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/stateit — signals, effects, computed, and stores.
---

# Usage Guide

## Installation

```sh
pnpm add @vielzeug/stateit
```

## Importing

```ts
import {
  // Signals
  signal,
  computed,
  effect,
  watch,
  batch,
  untrack,
  readonly,
  toValue,
  writable,
  isSignal,
  // Stores
  store,
  isStore,
  shallowEqual,
  // Types
  type Signal,
  type ReadonlySignal,
  type ComputedSignal,
  type CleanupFn,
  type WatchOptions,
  type WatchSelectorOptions,
  type Store,
  type StoreOptions,
} from '@vielzeug/stateit';
```

---

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
count.value;          // read — tracked inside effect/computed
count.value = 42;     // write — notifies all dependents
count.peek();         // read without registering a subscription
```

### `readonly`

Wraps a signal in a proxy that prevents writes at runtime and narrows the type:

```ts
const count = signal(0);
const readCount: ReadonlySignal<number> = readonly(count);

readCount.value;        // fine
readCount.value = 1;    // throws TypeError at runtime; TS error at compile time
```

### `toValue`

Unwraps a plain value or signal transparently — useful in generic helpers:

```ts
toValue(42);           // 42
toValue(signal(42));   // 42 (tracked if called inside effect)
```

---

## Effects

`effect()` runs a function immediately and re-runs it whenever any signal read
inside it changes. Returns a dispose function.

```ts
const count = signal(0);

const stop = effect(() => {
  console.log('count is:', count.value);
});
// → logs "count is: 0" immediately

count.value = 1; // → logs "count is: 1"
count.value = 2; // → logs "count is: 2"

stop(); // dispose — no more runs
```

### Effect Cleanup

Return a cleanup function from the effect callback; it runs before the next
re-execution and when the effect is disposed:

```ts
const stop = effect(() => {
  const id = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(id); // cleanup on next run or dispose
});
```

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

---

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
```

### Chaining Computeds

```ts
const a = signal(2);
const b = computed(() => a.value * 3);  // 6
const c = computed(() => b.value + 1);  // 7

a.value = 4;
console.log(c.value); // 13
```

---

## `writable`

`writable(get, set)` creates a bi-directional computed — reads track the getter
reactively, writes are forwarded to the custom setter. Useful for form adapters
and transformations that need to write back to the source.

```ts
const firstName = signal('Alice');
const upper = writable(
  () => firstName.value.toUpperCase(),
  (v) => { firstName.value = v.toLowerCase(); },
);

console.log(upper.value); // 'ALICE'
upper.value = 'BOB';
console.log(firstName.value); // 'bob'

upper.dispose(); // stop tracking getter
```

---

## `watch` (Signals)

`watch()` is an explicit subscription that fires only when the signal's value
changes — it does **not** run immediately like `effect()`.

```ts
const count = signal(0);

const unsub = watch(count, (next, prev) => {
  console.log(prev, '→', next);
});

count.value = 1; // → logs "0 → 1"
unsub();
```

### Options

```ts
// Fire once immediately on subscription
watch(count, (v) => console.log(v), { immediate: true });

// Auto-unsubscribe after the first change
watch(count, (v) => console.log('once:', v), { once: true });
```

---

## `batch` (Signals)

`batch()` defers all signal notifications until the callback returns, then
flushes once. Nested batches coalesce into the outermost.

```ts
const a = signal(0);
const b = signal(0);

let fires = 0;
effect(() => { a.value; b.value; fires++; });
// fires is 1 (initial run)

batch(() => {
  a.value = 1;
  b.value = 2;
});
// fires is 2 (one flush for both)
```

---

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
    equals: shallowEqual,
    onError: (err) => console.error('[store] error:', err),
  },
);
```

`equals` controls top-level change detection — two states that pass `equals` will not fire watchers. The default is `shallowEqual`. `onError` receives errors thrown by watch listeners so they don't escape silently.

---

## Reading State

```ts
const state = s.value;         // { count: 0, user: null }
const count = s.value.count;   // 0
```

`.value` is a synchronous getter — no method call needed.

---

## Writing State

### Partial Patch

Shallow-merges the patch into the current state:

```ts
s.set({ count: 1 });
// Equivalent to: { ...current, count: 1 }
```

### Updater Function

Receives the current state; return value replaces it:

```ts
s.set((current) => ({ ...current, count: current.count + 1 }));
```

Both forms are no-ops when the resulting state is equal to the current state.

---

## Resetting State

```ts
// Restore to the state passed to store()
s.reset();
```

`reset()` triggers a notification if the state actually changes.

---

## Notification Timing

Watchers are notified **synchronously** — the listener runs before the next line after `set()`:

```ts
const unsub = s.watch((state) => console.log('changed:', state.count));

s.set({ count: 1 });
// 'changed: 1' has already been logged here
```

To coalesce multiple `set()` calls into a single notification, use the top-level `batch()`:

```ts
batch(() => {
  s.set({ count: 1 });
  s.set({ count: 2 });
  s.set({ count: 3 });
});
// One notification fires after the batch with the final state: { count: 3 }
```

---

## Watching State

### Full-State Watch

```ts
// Does not fire immediately — use { immediate: true } to opt in
const unsub = s.watch((curr, prev) => {
  console.log('state changed', curr);
});

unsub(); // stop receiving updates
```

When `immediate: true`, the listener fires once synchronously on subscription with both `curr` and `prev` set to the current value:

```ts
s.watch(
  (curr, prev) => {
    console.log('initial or changed:', curr.count);
  },
  { immediate: true },
);
```

When `once: true`, the watcher auto-unsubscribes after the first notification:

```ts
s.watch((curr) => console.log('first change:', curr), { once: true });
```

### Selector Watch

`watch(selector, listener)` only fires when the projected value changes — unrelated state changes are ignored:

```ts
const unsub = s.watch(
  (state) => state.count,
  (count, prev) => console.log('count changed to', count),
);
```

With custom equality:

```ts
s.watch(
  (state) => state.items,
  (items) => renderList(items),
  { equals: (a, b) => a.length === b.length },
);
```

Selector equality is checked by `WatchSelectorOptions.equals` (defaults to `Object.is`). Full-state equality is checked by `StoreOptions.equals` first — if the full state is equal, no watcher fires at all.

---

## Batching

`batch()` groups multiple `set()` calls into a single notification, even if they span multiple operations:

```ts
import { batch } from '@vielzeug/stateit';

const result = batch(() => {
  s.set({ firstName: 'Alice' });
  s.set({ lastName: 'Smith' });
  s.set({ age: 30 });
  return 'profile updated';
});
// One notification for all three set() calls
// result === 'profile updated'
```

Nested `batch()` calls merge into the outermost — only one notification fires when the outermost batch completes:

```ts
batch(() => {
  s.set({ count: 1 });
  batch(() => s.set({ count: 2 })); // merged — no extra notification
  s.set({ count: 3 });
});
// One notification with final state { count: 3 }
```

If the callback throws, the notification still fires with whatever partial state was accumulated.

---

## Disposing

```ts
s.dispose();
```

Clears all watchers and freezes the store. After `dispose()`:

- `set()`, `reset()` silently do nothing
- `watch()` returns a no-op unsubscribe; the listener is never stored
- `.value` is still readable
- `.disposed` returns `true`

Always dispose stores that are no longer needed to avoid memory leaks.

---

## Narrowing to Read-Only

To expose a store at API boundaries where consumers should observe but not mutate, narrow it to only `value` and `watch`:

```ts
function createCounterService() {
  const s = store({ count: 0 });

  return {
    state: s as Pick<typeof s, 'value' | 'watch'>,
    increment() { s.set((st) => ({ count: st.count + 1 })); },
    decrement() { s.set((st) => ({ count: st.count - 1 })); },
  };
}

const counter = createCounterService();
counter.state.value.count; // readable
counter.state.watch(/* ... */); // watchable
// counter.state.set(...) — compile error
```

---

## Testing

Stateit stores are plain objects — no special test utilities needed. Create a fresh store in `beforeEach` and `dispose()` it in `afterEach`.

```ts
import { store } from '@vielzeug/stateit';

describe('counter', () => {
  let s: Store<{ count: number }>;

  beforeEach(() => {
    s = store({ count: 0 });
  });

  afterEach(() => {
    s.dispose();
  });

  it('increments count', () => {
    s.set({ count: 1 });
    expect(s.value.count).toBe(1);
  });

  it('notifies watcher on change', () => {
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    s.set({ count: 5 });
    // notifications are synchronous — no await needed
    expect(listener).toHaveBeenCalledWith(5, 0);
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
