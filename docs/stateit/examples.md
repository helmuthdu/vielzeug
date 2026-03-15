---
title: Stateit — Examples
description: Framework integration examples and reactive patterns for @vielzeug/stateit.
---

# Examples

## Signals

### Counter with `computed` and `effect`

A self-contained reactive counter — no framework required:

```ts
import { signal, computed, effect, watch } from '@vielzeug/stateit';

const count = signal(0);
const doubled = computed(() => count.value * 2);
const isEven = computed(() => count.value % 2 === 0);

// effect runs immediately and re-runs on any dependency change
const sub = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}, even=${isEven.value}`);
});

count.value++; // → count=1, doubled=2, even=false
count.value++; // → count=2, doubled=4, even=true

sub.dispose();
doubled.dispose();
isEven.dispose();
```

---

### `signal.update()` — Derive Next Value in Place

```ts
import { signal } from '@vielzeug/stateit';

const count = signal(0);
count.update((n) => n + 1); // 1
count.update((n) => n * 2); // 2

const tags = signal(['ts', 'js']);
tags.update((arr) => [...arr, 'tsx']); // ['ts', 'js', 'tsx']
```

---

### Reactive Form Field with `writable`

`writable` creates a bi-directional computed useful for adapting a store field to a form input:

```ts
import { signal, writable, effect } from '@vielzeug/stateit';

const raw = signal('  Hello World  ');
const trimmed = writable(
  () => raw.value.trim(),
  (v) => {
    raw.value = v;
  },
);

effect(() => console.log('trimmed:', trimmed.value));
// → trimmed: Hello World

trimmed.value = 'Updated';
// raw.value === 'Updated', trimmed.value === 'Updated'

raw.value = '  Spaces  ';
// trimmed.value === 'Spaces'

trimmed.dispose();
```

---

### Async Loading State with Signals

Manage loading, data, and error state reactively:

```ts
import { signal, computed, batch } from '@vielzeug/stateit';

const loading = signal(false);
const data = signal<string[] | null>(null);
const error = signal<Error | null>(null);

const status = computed(() => {
  if (loading.value) return 'loading' as const;
  if (error.value) return 'error' as const;
  if (data.value) return 'success' as const;
  return 'idle' as const;
});

async function fetchItems() {
  batch(() => {
    loading.value = true;
    error.value = null;
  });
  try {
    const res = await fetch('/api/items');
    data.value = await res.json();
  } catch (e) {
    error.value = e as Error;
  } finally {
    loading.value = false;
  }
}
```

---

### One-Time Watch with `once`

Subscribe to the first change only, then auto-unsubscribe:

```ts
import { signal, watch } from '@vielzeug/stateit';

const authToken = signal<string | null>(null);

watch(
  authToken,
  (token) => {
    console.log('First login:', token);
    // subscription is already disposed automatically
  },
  { once: true },
);
```

---

### `nextValue` — Await the Next Matching Emission

```ts
import { signal, nextValue } from '@vielzeug/stateit';

const status = signal<'idle' | 'loading' | 'done'>('idle');

// Somewhere async:
async function waitForCompletion() {
  // Resolves on the next change (any value)
  const next = await nextValue(status);
  console.log('status changed to:', next);

  // Or wait for a specific condition
  const done = await nextValue(status, (v) => v === 'done');
  console.log('done!', done);
}
```

---

### `using` Declarations — Automatic Disposal

With the TC39 explicit resource management proposal (`using`), disposables are cleaned up automatically when their block exits:

```ts
import { signal, effect, computed } from '@vielzeug/stateit';

const count = signal(0);

{
  using sub = effect(() => console.log('count:', count.value));
  using doubled = computed(() => count.value * 2);

  count.value = 5; // both reactive
  // ← block exits; sub and doubled are automatically disposed
}
```

---

### Multi-Source `derived`

```ts
import { signal, derived } from '@vielzeug/stateit';

const price = signal(100);
const quantity = signal(3);
const vat = signal(0.2);

const total = derived([price, quantity, vat], (p, q, v) => +(p * q * (1 + v)).toFixed(2));

console.log(total.value); // 360
price.value = 200;
console.log(total.value); // 720
```

## Stores

### Basic Store

```ts
import { store, watch, batch } from '@vielzeug/stateit';

const cart = store({ items: [] as string[], total: 0 });

// Partial patch
cart.patch({ total: 42 });

// Updater function
cart.update((s) => ({ ...s, items: [...s.items, 'apple'] }));

// Watch a derived slice via select()
const totalSignal = cart.select((s) => s.total);
watch(totalSignal, (total) => console.log('total:', total));

// Batch
batch(() => {
  cart.patch({ total: 0 });
  cart.update((s) => ({ ...s, items: [] }));
});

cart.reset();
cart.freeze();
```

---

### Slice Watch via `store.select()`

```ts
import { store, watch } from '@vielzeug/stateit';

const user = store({ id: 1, name: 'Alice', role: 'admin' });

// Only fires when `name` changes — unrelated updates are ignored
const nameSignal = user.select((s) => s.name);
const sub = watch(nameSignal, (name, prev) => {
  console.log('name:', prev, '→', name);
});

user.patch({ role: 'editor' }); // ← does NOT fire (name unchanged)
user.patch({ name: 'Bob' }); // → "name: Alice → Bob"

sub.dispose();
```

---

### Resetting to Initial State

`reset()` restores the state passed to `store()` and protects it from external mutation:

```ts
const s = store({ count: 0, label: 'default' });
s.patch({ count: 10, label: 'modified' });
console.log(s.value); // { count: 10, label: 'modified' }

s.reset();
console.log(s.value); // { count: 0, label: 'default' }
```

## React

### `useSyncExternalStore` Hooks

The cleanest way to integrate with React is `useSyncExternalStore`:

```ts
// store-hooks.ts
import { useSyncExternalStore } from 'react';
import { watch } from '@vielzeug/stateit';
import type { ReadonlySignal, Store } from '@vielzeug/stateit';

/** Subscribe to the full state of a store. */
export function useStoreState<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(
    (notify) => {
      const sub = watch(store, notify);
      return () => sub.dispose();
    },
    () => store.value,
    () => store.value,
  );
}

/** Subscribe to a projected slice of a store. Re-renders only when the
 *  slice changes (Object.is by default). */
export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): U {
  const sliceSignal = store.select(selector);
  return useSyncExternalStore(
    (notify) => {
      const sub = watch(sliceSignal, notify);
      return () => sub.dispose();
    },
    () => sliceSignal.value,
    () => sliceSignal.value,
  );
}
```

> Note: `watch()` defaults to `immediate: false`, meaning the subscribe callback passed to `useSyncExternalStore` only gets called on _changes_ — which is exactly what React expects.

Usage:

```tsx
import { useStoreState, useStoreSelector } from './store-hooks';

function Counter() {
  const count = useStoreSelector(counterStore, (s) => s.count);
  return <button onClick={() => counterStore.update((s) => ({ count: s.count + 1 }))}>{count}</button>;
}
```

---

### Full React Todo App

```ts
// todo.store.ts
import { store } from '@vielzeug/stateit';

type Todo = { id: number; text: string; done: boolean };
type TodoState = { todos: Todo[]; filter: 'all' | 'active' | 'done' };

export const todoStore = store<TodoState>({ todos: [], filter: 'all' });

export const addTodo = (text: string) =>
  todoStore.update((s) => ({
    ...s,
    todos: [...s.todos, { id: Date.now(), text, done: false }],
  }));

export const toggleTodo = (id: number) =>
  todoStore.update((s) => ({
    ...s,
    todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  }));

export const setFilter = (filter: TodoState['filter']) => todoStore.patch({ filter });

export const clearDone = () => todoStore.update((s) => ({ ...s, todos: s.todos.filter((t) => !t.done) }));
```

```tsx
// TodoApp.tsx
import { useStoreSelector } from './store-hooks';
import { todoStore, addTodo, toggleTodo, setFilter, clearDone } from './todo.store';

function TodoApp() {
  const filter = useStoreSelector(todoStore, (s) => s.filter);
  const todos = useStoreSelector(todoStore, (s) => {
    const { todos, filter } = s;
    return todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done));
  });
  const leftCount = useStoreSelector(todoStore, (s) => s.todos.filter((t) => !t.done).length);

  return (
    <div>
      <h1>Todos ({leftCount} left)</h1>

      <AddTodoForm onAdd={addTodo} />

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
            {todo.text}
          </li>
        ))}
      </ul>

      <nav>
        {(['all', 'active', 'done'] as const).map((f) => (
          <button key={f} disabled={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </nav>

      <button onClick={clearDone}>Clear completed</button>
    </div>
  );
}
```

---

### Async Data Fetching

```ts
// user.store.ts
import { store } from '@vielzeug/stateit';

type UserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; user: User }
  | { status: 'error'; error: string };

export const userStore = store<UserState>({ status: 'idle' });

export async function loadUser(id: string) {
  userStore.patch({ status: 'loading' });
  try {
    const user = await fetchUser(id);
    userStore.value = { status: 'success', user };
  } catch (err) {
    userStore.value = { status: 'error', error: (err as Error).message };
  }
}
```

```tsx
function UserProfile({ id }: { id: string }) {
  const state = useStoreState(userStore);

  useEffect(() => {
    loadUser(id);
  }, [id]);

  if (state.status === 'loading') return <Spinner />;
  if (state.status === 'error') return <ErrorMessage message={state.error} />;
  if (state.status === 'success') return <Profile user={state.user} />;
  return null;
}
```

## Vue

### `useStoreState` / `useStoreSelector` Composables

```ts
// composables/useStore.ts
import { ref, onUnmounted, type Ref } from 'vue';
import { watch } from '@vielzeug/stateit';
import type { Store } from '@vielzeug/stateit';

/** Reactive ref that stays in sync with the full store state. */
export function useStoreState<T extends object>(store: Store<T>): Ref<T> {
  const state = ref(store.value) as Ref<T>;
  const sub = watch(store, (next) => {
    state.value = next;
  });
  onUnmounted(() => sub.dispose());
  return state;
}

/** Reactive ref that stays in sync with a projected slice. */
export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): Ref<U> {
  const sliceSignal = store.select(selector);
  const selected = ref(sliceSignal.value) as Ref<U>;
  const sub = watch(sliceSignal, (next) => {
    selected.value = next;
  });
  onUnmounted(() => sub.dispose());
  return selected;
}
```

Usage in a component:

```vue
<script setup lang="ts">
import { useStoreSelector } from '@/composables/useStore';
import { counterStore } from '@/stores/counter.store';

const count = useStoreSelector(counterStore, (s) => s.count);
const increment = () => counterStore.update((s) => ({ count: s.count + 1 }));
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

---

### Vue Options API

For Options API components, set up watchers in `created`/`mounted` and clean up in `unmounted`:

```ts
import { defineComponent, ref } from 'vue';
import { watch } from '@vielzeug/stateit';
import { counterStore } from '@/stores/counter.store';

export default defineComponent({
  setup() {
    const countSignal = counterStore.select((s) => s.count);
    const count = ref(countSignal.value);
    const sub = watch(countSignal, (next) => {
      count.value = next;
    });
    return { count, cleanup: () => sub.dispose() };
  },
  unmounted() {
    this.cleanup();
  },
});
```

## Svelte

### Svelte Store Adapter

Svelte's store contract requires `subscribe(run)` returning an unsubscribe function. Bridge stateit's `watch()` to that interface:

```ts
// lib/stateit-svelte.ts
import { watch } from '@vielzeug/stateit';
import type { Store, ReadonlySignal } from '@vielzeug/stateit';
import type { Readable } from 'svelte/store';

/** Wraps a stateit ReadonlySignal as a Svelte readable store. */
export function readable<T>(source: ReadonlySignal<T>): Readable<T> {
  return {
    subscribe(run) {
      run(source.value); // immediate: true equivalent
      const sub = watch(source, (next) => run(next));
      return () => sub.dispose();
    },
  };
}

/** Wraps a projected store slice as a Svelte readable store. */
export function readableSelector<T extends object, U>(source: Store<T>, selector: (state: T) => U): Readable<U> {
  return readable(source.select(selector));
}
```

Usage in a Svelte component:

```svelte
<script lang="ts">
  import { readableSelector } from '$lib/stateit-svelte';
  import { counterStore } from '$lib/counter.store';

  const count = readableSelector(counterStore, (s) => s.count);
</script>

<button on:click={() => counterStore.update(s => ({ count: s.count + 1 }))}>
  {$count}
</button>
```

## Pattern: Shared Module Store

Structure stores as plain modules — no class registration or plugin needed:

```ts
// stores/auth.store.ts
import { store, computed, readonly } from '@vielzeug/stateit';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
};

const s = store<AuthState>({ token: null, user: null, loading: false });

// Computed signals for derived values
export const isAuthenticated = computed(() => !!s.value.token);
export const currentUser = computed(() => s.value.user);

// Public read-only view — callers can observe but not mutate
export const authStore = readonly(s);

// Mutations (exported as functions, not methods)
export async function login(credentials: Credentials) {
  s.patch({ loading: true });
  try {
    const { token, user } = await authenticate(credentials);
    s.value = { token, user, loading: false };
  } catch {
    s.patch({ loading: false });
  }
}

export function logout() {
  s.reset();
}
```

## Pattern: Batch for Complex Mutations

When a domain operation touches multiple fields at once, wrap in `batch()` so watchers see only the final state:

```ts
import { batch } from '@vielzeug/stateit';

export function applySettings(settings: UserSettings) {
  batch(() => {
    userStore.patch({ theme: settings.theme });
    userStore.patch({ language: settings.language });
    userStore.patch({ notifications: settings.notifications });
  });
  // → one notification for all three changes together
}
```

## Pattern: `nextValue` in Async Workflows

Use `nextValue` to bridge reactive state into async code without managing subscriptions manually:

```ts
import { store, nextValue } from '@vielzeug/stateit';

const modalStore = store({ open: false, result: null as string | null });

export async function openModal(): Promise<string | null> {
  modalStore.patch({ open: true, result: null });

  // Wait until result is set (modal closed with a value)
  const result = await nextValue(
    modalStore.select((s) => s.result),
    (v) => v !== null,
  );

  modalStore.patch({ open: false });
  return result;
}
```

