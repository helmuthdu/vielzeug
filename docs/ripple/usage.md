---
title: Ripple — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/ripple — signals, effects, computed, and stores.
---

[[toc]]

## Basic Usage

```ts
import { signal, computed, effect } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);

const sub = effect(() => {
  console.log('doubled:', doubled.value);
});
// → logs "doubled: 0" immediately

count.value = 5; // → logs "doubled: 10"

sub.dispose();
doubled.dispose();
```

## Signals

A **signal** is the fundamental reactive primitive. It holds a single value and
notifies dependents when that value changes.

### Creating a Signal

```ts
const count = signal(0);
const name = signal('Alice');
const items = signal<string[]>([]);
```

### Batched Signals

When a signal receives many rapid synchronous writes (e.g., scroll positions, pointer events), set `batched: true` to coalesce them into a single microtask notification:

```ts
const pointer = signal({ x: 0, y: 0 }, { batched: true });

// All three writes coalesce into one microtask notification
pointer.value = { x: 10, y: 0 };
pointer.value = { x: 20, y: 5 };
pointer.value = { x: 30, y: 10 };
// downstream effects receive only { x: 30, y: 10 }
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

Ripple includes a built-in loop guard (100 iterations by default) to protect against accidental self-triggering effect cycles.

### Effect Options

`effect()` accepts an optional `EffectOptions` object to control scheduling, debugging, and loop protection:

```ts
import { effect } from '@vielzeug/ripple';

// Named effect — name appears in StateError messages for easier debugging
const sub = effect(() => console.log('count:', count.value), { name: 'count-logger' });

// Microtask scheduler — re-runs are deferred and coalesce within the same task
effect(() => (document.title = count.value.toString()), { scheduler: 'microtask' });

// Custom scheduler function — any scheduling strategy is supported
effect(() => renderHighFrequency(pos.value), { scheduler: (run) => requestIdleCallback(run) });

// Increase the loop guard for known deep cascade graphs
effect(() => processGraph(root.value), { maxIterations: 500 });
```

| Option          | Type                                           | Default  | Description                                                |
| --------------- | ---------------------------------------------- | -------- | ---------------------------------------------------------- |
| `scheduler`     | `EffectScheduler \| (run: () => void) => void` | `'sync'` | `'sync'` \| `'microtask'`, or a custom function            |
| `name`          | `string`                                       | —        | Shown in error messages                                    |
| `maxIterations` | `number`                                       | `100`    | Loop guard threshold for this effect                       |

For debugging which deps trigger re-runs, use `debugEffect()` instead of `effect()` — see [debugEffect](#debugeffect) below.

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
watch(
  () => userStore.value.name,
  (name, prevName) => {
    console.log('name:', prevName, '→', name);
  },
);

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

## `scope`

`scope()` creates an isolated cleanup context that is not tied to any reactive effect. Use it when you want to collect teardown callbacks and release them all at once — without needing an effect or a component lifecycle hook.

Pass an optional `setup` function to register cleanups inline at construction time. This is equivalent to calling `scope.run(setup)` immediately after creation:

```ts
import { scope, onCleanup } from '@vielzeug/ripple';

// Shorthand — setup runs immediately:
const s = scope(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));

  const ws = new WebSocket('wss://example.com');
  onCleanup(() => ws.close());
});

// Later — tears down all cleanups in LIFO order:
s.dispose();
```

`scope.run()` can also be called multiple times to incrementally register cleanups into the same scope. The `using` declaration auto-disposes at block end:

```ts
{
  using s = scope();
  s.run(() => {
    onCleanup(() => console.log('cleaned up'));
  });
} // ← scope.dispose() called here automatically
```

**Inside craft components**, `scope()` is available via `@vielzeug/craft` and is useful for managing sub-scoped cleanup (e.g., an animation controller or WebSocket owned by one part of a component):

```ts
import { scope, onCleanup, effect } from '@vielzeug/craft';

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

## `asyncScope` _(deprecated)_

::: warning Deprecated
`asyncScope()` is deprecated. Use `scope()` with an explicit `run()` call instead:

```ts
const s = scope();
await s.run(async () => {
  onCleanup(() => stream.close()); // captured synchronously
  const db = await openDatabase();
});
```
:::

`asyncScope(setup)` accepts an async setup function and captures `onCleanup()` registrations from the synchronous preamble before the first `await`.

`onCleanup()` must be called **synchronously** — before the first `await`. Calls after an `await` throw `StateError('INVALID_CLEANUP')`.

## `debugEffect`

`debugEffect(fn, options?)` is identical to `effect()` but logs the reactive sources that changed before each re-run. Use it as a drop-in replacement for debugging unexpected re-renders.

```ts
import { debugEffect } from '@vielzeug/ripple/devtools';

const stop = debugEffect(() => renderUser(userId.value, name.value), { name: 'renderUser' });

// Console output on re-run:
// [ripple:trace] "renderUser" re-running — changed sources:
//   userId (v1 -> v2)
```

## Async Computed

`resource(factory, options?)` (preferred) or `asyncComputed()` tracks reactive dependencies inside an async factory and re-runs when they change. The factory receives an `AbortSignal` that fires when the factory is superseded or disposed.

The returned handle exposes three flat reactive signals:

- `.data` — latest fulfilled value (`T | undefined`)
- `.error` — last thrown value (`unknown | undefined`)
- `.isLoading` — `true` while a factory run is in-flight (starts `true`)

```ts
import { signal, effect, resource } from '@vielzeug/ripple';

const userId = signal('u1');

const user = resource(async (abortSignal) => {
  const id = userId.value; // tracked dep — must be read synchronously
  const res = await fetch(`/users/${id}`, { signal: abortSignal });
  if (!res.ok) throw new Error('Not found');
  return res.json() as Promise<User>;
});

effect(() => {
  if (user.isLoading.value) return showSpinner();
  if (user.error.value) return showError(user.error.value);
  renderUser(user.data.value);
});

userId.value = 'u2'; // aborts the in-flight fetch, re-runs factory
user.dispose();
```

::: tip deps must be read synchronously
`resource` tracks dependencies the same way `computed` does: only reads that happen **synchronously**, before the first `await`, are tracked. Reads inside `await` expressions are NOT tracked.
:::

## Store History / Time-Travel

`storeWithHistory(initial, options?)` wraps a store with snapshot-based undo/redo. Every `.patch()`, `.replace()`, `.reset()`, and `lens()` write pushes a snapshot. History navigation with `undo()` and `redo()` never re-runs logic — it replays snapshots directly.

```ts
import { storeWithHistory } from '@vielzeug/ripple';

const editor = storeWithHistory({ text: '', cursor: 0 }, { maxHistory: 100 });

editor.patch({ text: 'hello', cursor: 5 });
editor.patch({ text: 'hello world', cursor: 11 });

console.log(editor.historyLength); // 3  (initial + 2 patches)
console.log(editor.historyAt(0)); // { text: '', cursor: 0 }

editor.undo();
console.log(editor.value.text); // 'hello'

editor.redo();
console.log(editor.value.text); // 'hello world'
```

`canUndo` and `canRedo` are reactive boolean properties — read them inside `effect()` or `computed()` and they will re-run automatically when the history cursor moves:

```ts
effect(() => {
  undoButton.disabled = !editor.canUndo;
  redoButton.disabled = !editor.canRedo;
});
```

All `Store<T>` methods (`patch`, `replace`, `reset`, `lens`) work as usual on a `StoreWithHistory<T>`.

Call `dispose()` when the store is no longer needed to release the internal reactive cursor signal:

```ts
const s = storeWithHistory({ count: 0 });
// ... use s
s.dispose();
```

::: tip historyAt() after eviction
Once the buffer reaches `maxHistory`, the oldest snapshot is evicted on each new write. `historyAt(0)` always returns the oldest _remaining_ snapshot — it is not guaranteed to be the initial state once eviction has occurred.
:::

## Stores

A `Store<T>` adds structured state helpers on top of a `.value` getter. Every signal primitive (`computed`, `effect`, `watch`, `batch`, `untrack`) works on stores directly.

### Creating a Store

```ts
import { store } from '@vielzeug/ripple';

const s = store({ count: 0, user: null as User | null });
```

### Reading State

```ts
const state = s.value; // { count: 0, user: null }
const count = s.value.count; // 0
```

`.value` is a synchronous getter — no method call needed.

### Writing State

#### Partial Patch

Shallow-merges the patch into the current state:

```ts
s.patch({ count: 1 });
// Equivalent to: { ...current, count: 1 }
```

#### Updater Function

Receives a plain shallow copy of the current state; return value replaces it. The argument is a regular object — you can mutate it freely inside the callback:

```ts
s.replace((current) => ({ ...current, count: current.count + 1 }));
```

`replace()` is a no-op when `fn` returns the same object reference it received.

### Resetting State

```ts
// Restore to the state passed to store()
s.reset();
```

`reset()` triggers a notification if the state actually changes. The initial state
is defensively copied at construction time — external mutations to the original
object cannot corrupt `reset()`.

### Derived Slices

### Via `computed()`

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

### Via `store.lens()`

`store.lens(path)` returns a writable `Signal` scoped to a specific property or dot-path. Lenses are cached per path and produce immutable copies on write:

```ts
const settings = store({
  user: { name: 'Alice', address: { city: 'Berlin' } },
  theme: 'light' as 'light' | 'dark',
});

// Top-level lens
const theme = settings.lens('theme'); // Signal<'light' | 'dark'>
theme.value = 'dark';

// Nested dot-path lens
const city = settings.lens('user.address.city'); // Signal<string>
city.value = 'Hamburg';

console.log(settings.value.theme); // 'dark'
console.log(settings.value.user.address.city); // 'Hamburg'

// Watch a single field
watch(theme, (next, prev) => console.log(prev, '→', next));

// Write directly
theme.value = theme.value === 'light' ? 'dark' : 'light';
```

Lenses are cached: `settings.lens('theme')` called twice returns the same `Signal`. Disposing a lens removes it from the cache — the next call to `settings.lens('theme')` creates a fresh instance.

::: warning Path constraints
Every intermediate segment of the path must resolve to a non-null object. Writing through `settings.lens('user.address.city')` will throw `StateError('INVALID_STORE')` if `settings.value.user` or `settings.value.user.address` is `null` or not an object.

Paths are also capped at **32 segments**. Paths exceeding this limit throw `StateError('INVALID_STORE')` with a descriptive message.
:::

### Watching State

#### Full-State Watch

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

#### Slice Watch

Use a getter source to watch a slice — only fires when the derived value changes:

```ts
// Only fires when `count` changes — unrelated state changes are ignored
watch(
  () => s.value.count,
  (count, prev) => console.log('count changed to', count),
);

// With computed() for a reusable or shareable slice signal
const countSignal = computed(() => s.value.count);
watch(countSignal, (count, prev) => console.log('count changed to', count), {
  equals: (a, b) => a === b,
});
```

### Batching Store Mutations

`batch()` groups multiple writes into a single notification:

```ts
import { batch } from '@vielzeug/ripple';

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

### Narrowing to Read-Only

To expose a store at API boundaries where consumers should observe but not mutate, wrap it with `readonly()`:

```ts
import { readonly, store } from '@vielzeug/ripple';
import type { ReadonlySignal } from '@vielzeug/ripple';

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
      s.replace((st) => ({ count: st.count + 1 }));
    },
    decrement() {
      s.replace((st) => ({ count: st.count - 1 }));
    },
  };
}

const counter = createCounterService();
counter.state.value.count; // readable
// counter.state.value = ...; // TS compile error — read-only
```

## Signal Combinators

Three standalone utilities create computed signals from a reactive source. They replace the removed per-instance `.map()` / `.filter()` methods.

### `derive(source, project, options?)`

Projects a signal into a new derived signal. Equivalent to `computed(() => project(source.value))` but more ergonomic:

```ts
import { signal, derive } from '@vielzeug/ripple';

const count = signal(3);
const doubled = derive(count, (n) => n * 2); // ComputedSignal<number>
console.log(doubled.value); // 6

count.value = 5;
console.log(doubled.value); // 10

doubled.dispose();
```

### `filter(source, predicate, options?)`

Passes the value through when the predicate returns `true`, otherwise yields `undefined`:

```ts
import { signal, filter } from '@vielzeug/ripple';

const count = signal(3);
const even = filter(count, (n) => n % 2 === 0);
console.log(even.value); // undefined (3 is odd)

count.value = 4;
console.log(even.value); // 4

even.dispose();
```

Supports type-guard predicates for narrowing:

```ts
const val = signal<string | null>(null);
const str = filter(val, (v): v is string => v !== null);

val.value = 'hello';
console.log(str.value); // 'hello'
```

### `selector(source, project, predicate?, options?)`

Combines projection and filtering in a single call. Use `derive()` + `filter()` for single-concern cases; `selector()` is available when you need both:

```ts
import { signal, selector } from '@vielzeug/ripple';

const count = signal(3);

// Project only — prefer derive() for this
const doubled = selector(count, (n) => n * 2);

// Project + filter
const bigDoubles = selector(
  count,
  (n) => n * 2,
  (n) => n > 5,
);
bigDoubles.value; // 6 (3*2=6, predicate 6>5 is true — value passes through)

doubled.dispose();
bigDoubles.dispose();
```

## `Symbol.dispose` / `using` Declarations

All `Subscription`, `ComputedSignal`, and `Scope` handles implement `[Symbol.dispose]`, enabling the TC39 [explicit resource management](https://github.com/tc39/proposal-explicit-resource-management) syntax:

```ts
{
  using sub = effect(() => console.log(count.value));
  using doubled = computed(() => count.value * 2);
  // both are automatically disposed when the block exits
}
```

`AsyncSubscription` (returned by `effectAsync()`) also implements `[Symbol.asyncDispose]`, enabling `await using`:

```ts
{
  await using stop = effectAsync(async (signal) => {
    await fetchData(signal);
  });
  // stop[Symbol.asyncDispose]() is called automatically — awaits the in-flight run
}
```

## Testing

Ripple stores are plain objects — no special test utilities needed. Create a
fresh store in `beforeEach` and dispose any active effects in `afterEach`.

```ts
import { store, watch } from '@vielzeug/ripple';
import type { Store } from '@vielzeug/ripple';

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

## DevTools

Import `installDevTools` from the dedicated sub-path. This keeps DevTools code out of production bundles when unused.

```ts
import { installDevTools } from '@vielzeug/ripple/devtools';

installDevTools({
  write({ name, oldValue, newValue }) {
    console.log(`[write] ${name ?? '(unnamed)'}: ${String(oldValue)} → ${String(newValue)}`);
  },
  run({ name }) {
    performance.mark(`effect:${name ?? 'anon'}`);
  },
  dispose({ kind, name }) {
    console.log(`[dispose] ${kind} "${name ?? '(unnamed)'}"`);
  },
  compute({ name }) {
    console.log(`[compute] ${name ?? '(unnamed)'}`);
  },
  mutate({ kind, name, path }) {
    const target = path ? `${name ?? '(unnamed)'}[${path}]` : (name ?? '(unnamed)');
    console.log(`[mutate] store ${target} — ${kind}`);
  },
});

// Uninstall when no longer needed:
installDevTools(null);
```

All hook methods are optional. The hook is stored in a module-level variable (not `globalThis`); `globalThis.__RIPPLE_DEVTOOLS__` is kept in sync as a mirror for browser-extension tools.

## Framework Integration

::: code-group

```tsx [React]
import { useSyncExternalStore } from 'react';
import { signal, computed, effect, type ReadonlySignal } from '@vielzeug/ripple';

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
      <p>
        {value} × 2 = {doubledValue}
      </p>
      <button onClick={() => count.value++}>Increment</button>
    </div>
  );
}
```

```ts [Vue 3]
import { customRef, onScopeDispose } from 'vue';
import { signal, computed, watch, type ReadonlySignal, type Signal } from '@vielzeug/ripple';

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
  import { signal, computed } from '@vielzeug/ripple';
  import type { ReadonlySignal } from '@vielzeug/ripple';

  // Manual Svelte store adapter — calls run() immediately, then on each change
  function toSvelteStore<T>(source: ReadonlySignal<T>) {
    return {
      subscribe(run: (value: T) => void) {
        run(source.value); // Svelte contract: fire immediately with current value
        const sub = source.subscribe(() => run(source.value));
        return () => sub.dispose();
      },
    };
  }

  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  const countStore = toSvelteStore(count);
  const doubledStore = toSvelteStore(doubled);
  // Use $countStore and $doubledStore in the template
</script>

<p>{$countStore} × 2 = {$doubledStore}</p>
<button on:click={() => count.value++}>Increment</button>
```

:::

## Working with Other Vielzeug Libraries

### With Sourcerer

Use Ripple signals for local UI intent and Sourcerer for remote/list data orchestration.

```ts
import { signal } from '@vielzeug/ripple';
import { createRemoteSource } from '@vielzeug/sourcerer';

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
// <sg-icon name="check" size="16"></sg-icon> signal for a single scalar
const isOpen = signal(false);

// <sg-icon name="check" size="16"></sg-icon> store for structured objects
const user = store({ id: '', name: '', role: 'guest' });

// <sg-icon name="x" size="16"></sg-icon> store for a simple boolean — overcomplicated
const isOpen = store({ value: false });
```

### 2. Computed for Derived Values

```ts
// <sg-icon name="check" size="16"></sg-icon> computed instead of duplicating logic in effects
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

// <sg-icon name="x" size="16"></sg-icon> avoid manually syncing derived state in an effect
const fullNameState = signal('');
effect(() => {
  fullNameState.value = `${firstName.value} ${lastName.value}`;
});
```

### 3. Watch Slices with Getter Sources or `computed()`

Both approaches work; choose based on reuse needs:

```ts
// <sg-icon name="check" size="16"></sg-icon> getter source — simple for one-off watches
watch(
  () => userStore.value.count,
  (count) => console.log('count:', count),
);

// <sg-icon name="check" size="16"></sg-icon> composed with computed() — better for shared/complex selections
const countSignal = computed(() => userStore.value.count);
watch(countSignal, (count) => console.log('count:', count));
countSignal.dispose();
```

### 4. Batch Multiple Updates

```ts
// <sg-icon name="check" size="16"></sg-icon> one notification instead of two
batch(() => {
  x.value = 1;
  y.value = 2;
});
```

### 5. Use Direct Assignment on Signals; `.replace()` on Stores

```ts
// <sg-icon name="check" size="16"></sg-icon> signals: read-modify-write in one line
count.value = count.value + 1;

// <sg-icon name="check" size="16"></sg-icon> stores: replace via function
cart.replace((s) => ({ ...s, items: [...s.items, newItem] }));
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
