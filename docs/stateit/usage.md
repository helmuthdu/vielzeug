---
title: Stateit — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/stateit — signals, effects, computed, and stores.
---

[[toc]]

::: tip New to Stateit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

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
untrack(() => count.value); // equivalent escape hatch for arbitrary reads
```

### External Store Interop

Every signal exposes a small external-store interface:

```ts
const unsubscribe = count.subscribe(() => {
  console.log('changed:', count.value);
});

count.value = 1;
unsubscribe();
```

`subscribe()` does not fire immediately on subscription. It only fires after the value changes, which matches React's `useSyncExternalStore()` contract.

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

Stateit includes a built-in loop guard (100 iterations) to protect against accidental self-triggering effect cycles.

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

### Automatic Disposal Inside Effects

When `computed()` is called inside an `effect()`, the computed signal is automatically disposed when the effect cleans up. This prevents memory leaks from derived computations that only exist within the effect scope:

```ts
effect(() => {
  // This computed is automatically disposed when the effect is disposed
  const derived = computed(() => expensiveCalc(source.value));
  doSomething(derived.value);
});
```

This behavior is an ergonomic convenience and works because `computed()` detects the active effect scope and registers itself for automatic cleanup.

### `peek`

Computed signals also support `.peek()` for non-tracked reads:

```ts
const total = computed(() => subtotal.value + tax.value);

effect(() => {
  console.log('tracked total', total.value);
});

const snapshot = total.peek();
```

### Chaining Computeds

```ts
const a = signal(2);
const b = computed(() => a.value * 3); // 6
const c = computed(() => b.value + 1); // 7

a.value = 4;
console.log(c.value); // 13
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

// Custom equality — suppress callback when result is considered equal
watch(list, (v) => renderList(v), { equals: (a, b) => a.length === b.length });
```

### Watching a Slice

Use a getter function when you want to watch a derived slice directly:

```ts
watch(() => userStore.value.name, (name, prevName) => {
  console.log('name:', prevName, '→', name);
});

// For reusable derived values, keep using computed()
const nameSignal = computed(() => userStore.value.name);
watch(nameSignal, (name, prev) => console.log('name:', prev, '→', name));
nameSignal.dispose();
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

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { signal, computed, effect, type ReadonlySignal } from '@vielzeug/stateit';

// Generic hook — works with any signal or computed
function useSignalValue<T>(source: ReadonlySignal<T>): T {
  return useSyncExternalStore(source.subscribe, () => source.value);
}

// Usage in a component
const count = signal(0);
const doubled = computed(() => count.value * 2);

function Counter() {
  const value = useSignalValue(count);
  const doubledValue = useSignalValue(doubled);

  return (
    <div>
      <p>{value} × 2 = {doubledValue}</p>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

```ts [Vue 3]
import { customRef, onScopeDispose } from 'vue';
import { signal, computed, watch, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

// Composable for read/write signals
function useSignal<T>(source: Signal<T>) {
  return customRef<T>((track, trigger) => ({
    get() {
      track();
      return source.value;
    },
    set(value) {
      source.value = value;
      trigger();
    },
  }));
}

// Composable for read-only signals and computeds
function useSignalValue<T>(source: ReadonlySignal<T>) {
  const stop = watch(source, () => {}, { immediate: true });
  onScopeDispose(() => stop.dispose());
  return customRef<T>((track) => ({
    get() {
      track();
      return source.value;
    },
    set(value) {
      void value;
    },
  }));
}
```

```svelte [Svelte]
<script lang="ts">
  import { signal, computed, toStore } from '@vielzeug/stateit';

  // toStore() adapts any signal to the Svelte store contract
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  const countStore = toStore(count);
  const doubledStore = toStore(doubled);
  // Use $countStore and $doubledStore in the template
</script>

<p>{$countStore} × 2 = {$doubledStore}</p>
<button on:click={() => count.value++}>Increment</button>
```

:::

### Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## `scope`

`scope()` creates an isolated cleanup context that is not tied to any reactive effect. Use it when you want to collect teardown callbacks and release them all at once — without needing an effect or a component lifecycle hook.

```ts
import { scope, onCleanup } from '@vielzeug/stateit';

const s = scope();

s.run(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));

  const ws = new WebSocket('wss://example.com');
  onCleanup(() => ws.close());
});

// Later — tears down all cleanups in LIFO order:
s.dispose();
```

`scope.run()` can be called multiple times to incrementally register cleanups into the same scope. The `using` declaration auto-disposes at block end:

```ts
{
  using s = scope();
  s.run(() => {
    onCleanup(() => console.log('cleaned up'));
  });
} // ← scope.dispose() called here automatically
```

**Inside craftit components**, `scope()` is available via `@vielzeug/craftit` and is useful for managing sub-scoped cleanup (e.g., an animation controller or WebSocket owned by one part of a component):

```ts
import { scope, onCleanup, effect } from '@vielzeug/craftit';

define('my-component', {
  setup() {
    const animScope = scope();
    onCleanup(() => animScope.dispose()); // tie sub-scope to component lifetime

    onMounted(() => {
      animScope.run(() => {
        const raf = requestAnimationFrame(animate);
        onCleanup(() => cancelAnimationFrame(raf));
      });
    });

    return () => html`...`;
  },
});
```

## Stores

A `Store<T>` adds structured state helpers on top of a `.value` getter. Every signal primitive (`computed`, `effect`, `watch`, `batch`, `untrack`) works on stores directly.

## Creating a Store

```ts
import { store } from '@vielzeug/stateit';

const s = store({ count: 0, user: null as User | null });
```

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

Receives the current state; return value replaces it:

```ts
s.update((current) => ({ ...current, count: current.count + 1 }));
```

`patch()` and `update()` are no-ops when the resulting state passes the `equals` check configured on the store (default: `Object.is`).

## Resetting State

```ts
// Restore to the state passed to store()
s.reset();
```

`reset()` triggers a notification if the state actually changes. The initial state
is defensively copied at construction time — external mutations to the original
object cannot corrupt `reset()`.

## Derived Slices

Use `computed()` to derive a signal from a slice of the store's state:

```ts
const countSignal = computed(() => s.value.count);
console.log(countSignal.value); // 0

// Compose with watch() to react to slice changes only
const sub = watch(countSignal, (count, prev) => {
  console.log('count changed:', prev, '→', count);
});

// Clean up when done
sub.dispose();
countSignal.dispose();
```

Pass a custom `equals` option for arrays and objects to avoid re-rendering when contents haven't changed:

```ts
const items = computed(() => s.value.items, { equals: (a, b) => a.length === b.length });
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

To auto-stop after the first change, dispose manually inside the callback:

```ts
const stop = watch(s, (curr) => {
  console.log('first change:', curr);
  stop();
});
```

### Slice Watch

Use a getter source to watch a slice — only fires when the derived value changes:

```ts
// Only fires when `count` changes — unrelated state changes are ignored
watch(() => s.value.count, (count, prev) => console.log('count changed to', count));

// With computed() for a reusable or shareable slice signal
const countSignal = computed(() => s.value.count);
watch(countSignal, (count, prev) => console.log('count changed to', count), {
  equals: (a, b) => a === b,
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

## Narrowing to Read-Only

To expose a store at API boundaries where consumers should observe but not mutate, wrap it with `readonly()`:

```ts
import { readonly, store } from '@vielzeug/stateit';
import type { ReadonlySignal } from '@vielzeug/stateit';

type CounterService = {
  state: ReadonlySignal<{ count: number }>;
  increment(): void;
  decrement(): void;
};

function createCounterService(): CounterService {
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

## `Symbol.dispose` / `using` Declarations

All `Subscription`, `ComputedSignal`, and `Scope` handles implement `[Symbol.dispose]`,
enabling the TC39 [explicit resource management](https://github.com/tc39/proposal-explicit-resource-management) syntax:

```ts
{
  using sub = effect(() => console.log(count.value));
  using doubled = computed(() => count.value * 2);
  // both are automatically disposed when the block exits
}
```

## Working with Other Vielzeug Libraries

### With Sourceit

Use Stateit signals for local UI intent and Sourceit for remote/list data orchestration.

```ts
import { signal } from '@vielzeug/stateit';
import { createRemoteSource } from '@vielzeug/sourceit';

const search = signal('');
const source = createRemoteSource({
  fetch: ({ page }) => api.items.list({ page, search: search.value }),
});

search.subscribe(() => {
  source.page(1);
  void source.refresh();
});
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

### 3. Watch Slices with Getter Sources or `computed()`

Both approaches work; choose based on reuse needs:

```ts
// ✅ getter source — simple for one-off watches
watch(() => userStore.value.count, (count) => console.log('count:', count));

// ✅ composed with computed() — better for shared/complex selections
const countSignal = computed(() => userStore.value.count);
watch(countSignal, (count) => console.log('count:', count));
countSignal.dispose();
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
fresh store in `beforeEach` and dispose any active effects in `afterEach`.

```ts
import { store, watch } from '@vielzeug/stateit';
import type { Store } from '@vielzeug/stateit';

describe('counter', () => {
  let s: Store<{ count: number }>;

  beforeEach(() => {
    s = store({ count: 0 });
  });

  it('patches count', () => {
    s.patch({ count: 1 });
    expect(s.value.count).toBe(1);
  });

  it('notifies watcher on change', () => {
    const listener = vi.fn();
    const sub = watch(s, listener);
    s.patch({ count: 5 });
    // notifications are synchronous — no await needed
    expect(listener).toHaveBeenCalledWith({ count: 5 }, { count: 0 });
    sub.dispose();
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
