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
const stopLog = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}, even=${isEven.value}`);
});

count.value++; // → count=1, doubled=2, even=false
count.value++; // → count=2, doubled=4, even=true

stopLog(); // dispose effect
doubled.dispose();
isEven.dispose();
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

// React only to the first time a token is set
const unsub = watch(
  authToken,
  (token) => {
    console.log('First login:', token);
    // unsub() already called automatically
  },
  { once: true },
);
```

## React

### `useSyncExternalStore` Hooks

The cleanest way to integrate with React is `useSyncExternalStore`:

```ts
// store-hooks.ts
import { useSyncExternalStore } from 'react';
import type { Store } from '@vielzeug/stateit';

/** Subscribe to the full state of a store. */
export function useStoreState<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(
    (notify) => store.subscribe(notify, { immediate: false }),
    () => store.value,
    () => store.value,
  );
}

/** Subscribe to a projected slice of a store. Re-renders only when the
 *  slice changes (shallowEqual by default). */
export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): U {
  return useSyncExternalStore(
    (notify) => store.subscribe(selector, notify),
    () => selector(store.value),
    () => selector(store.value),
  );
}
```

> Note: `watch()` defaults to `immediate: false`, meaning the subscribe callback passed to `useSyncExternalStore` only gets called on _changes_ — which is exactly what React expects.

Usage:

```tsx
import { useStoreState, useStoreSelector } from './store-hooks';

function Counter() {
  const count = useStoreSelector(counterStore, (s) => s.count);
  return <button onClick={() => counterStore.set((s) => ({ count: s.count + 1 }))}>{count}</button>;
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
  todoStore.set((s) => ({
    todos: [...s.todos, { id: Date.now(), text, done: false }],
  }));

export const toggleTodo = (id: number) =>
  todoStore.set((s) => ({
    todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  }));

export const setFilter = (filter: TodoState['filter']) => todoStore.set({ filter });

export const clearDone = () => todoStore.set((s) => ({ todos: s.todos.filter((t) => !t.done) }));
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

Since `set()` is synchronous, handle async operations externally and call `set()` when the data is ready:

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
  userStore.set({ status: 'loading' });
  try {
    const user = await fetchUser(id);
    userStore.set({ status: 'success', user });
  } catch (err) {
    userStore.set({ status: 'error', error: (err as Error).message });
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
import type { Store } from '@vielzeug/stateit';

/** Reactive ref that stays in sync with the full store state. */
export function useStoreState<T extends object>(store: Store<T>): Ref<T> {
  const state = ref(store.value) as Ref<T>;
  const unsub = store.subscribe((next) => {
    state.value = next;
  });
  onUnmounted(unsub);
  return state;
}

/** Reactive ref that stays in sync with a projected slice. */
export function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U): Ref<U> {
  const selected = ref(selector(store.value)) as Ref<U>;
  const unsub = store.subscribe(selector, (next) => {
    selected.value = next;
  });
  onUnmounted(unsub);
  return selected;
}
```

Usage in a component:

```vue
<script setup lang="ts">
import { useStoreSelector } from '@/composables/useStore';
import { counterStore } from '@/stores/counter.store';

const count = useStoreSelector(counterStore, (s) => s.count);
const increment = () => counterStore.set((s) => ({ count: s.count + 1 }));
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
import { counterStore } from '@/stores/counter.store';

export default defineComponent({
  setup() {
    const count = ref(counterStore.value.count);
    const unsub = counterStore.subscribe(
      (s) => s.count,
      (next) => {
        count.value = next;
      },
    );

    return { count, cleanup: unsub };
  },
  unmounted() {
    this.cleanup();
  },
});
```

## Svelte

### Svelte Store Adapter

Svelte's store contract requires `subscribe(run, invalidate)` returning an unsubscribe function. Bridge stateit's `watch()` to that interface:

```ts
// lib/stateit-svelte.ts
import type { Store } from '@vielzeug/stateit';
import type { Readable } from 'svelte/store';

/** Wraps a stateit Store as a Svelte readable store. */
export function readable<T extends object>(source: Store<T>): Readable<T> {
  return {
    subscribe(run) {
      run(source.value); // immediate: true equivalent
      return source.subscribe((next) => run(next));
    },
  };
}

/** Wraps a projected slice as a Svelte readable store. */
export function readableSelector<T extends object, U>(source: Store<T>, selector: (state: T) => U): Readable<U> {
  return {
    subscribe(run) {
      run(selector(source.value));
      return source.subscribe(selector, (next) => run(next));
    },
  };
}
```

Usage in a Svelte component:

```svelte
<script lang="ts">
  import { readable, readableSelector } from '$lib/stateit-svelte';
  import { counterStore } from '$lib/counter.store';

  const count = readableSelector(counterStore, (s) => s.count);
</script>

<button on:click={() => counterStore.set((s) => ({ count: s.count + 1 }))}>
  {$count}
</button>
```

## Pattern: Shared Module Store

Structure stores as plain modules — no class registration or plugin needed:

```ts
// stores/auth.store.ts
import { store, computed } from '@vielzeug/stateit';

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
};

const s = store<AuthState>({ token: null, user: null, loading: false });

// Computed signals for derived values
export const isAuthenticated = computed(() => !!s.value.token);
export const currentUser = computed(() => s.value.user);

// Public read-only view (exposes only .value and .watch)
export const authStore = s as Pick<typeof s, 'value' | 'watch'>;

// Mutations (exported as functions, not methods)
export async function login(credentials: Credentials) {
  s.set({ loading: true });
  try {
    const { token, user } = await authenticate(credentials);
    s.set({ token, user, loading: false });
  } catch {
    s.set({ loading: false });
  }
}

export function logout() {
  s.reset();
}
```

## Pattern: Batch for Complex Mutations

When a domain operation touches multiple fields of the same store at once, wrap in the top-level `batch()` so watchers see only the final state:

```ts
import { batch } from '@vielzeug/stateit';

export function applySettings(settings: UserSettings) {
  batch(() => {
    userStore.set({ theme: settings.theme });
    userStore.set({ language: settings.language });
    userStore.set({ notifications: settings.notifications });
  });
  // → one notification for all three changes together
}
```
