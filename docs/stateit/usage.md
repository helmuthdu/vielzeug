# Stateit Usage Guide

Complete guide to installing and using Stateit in your projects.

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/stateit
```

```sh [npm]
npm install @vielzeug/stateit
```

```sh [yarn]
yarn add @vielzeug/stateit
```

:::

## Import

```ts
import { createStore } from '@vielzeug/stateit';

// Optional: Import types and utilities
import type { Store, StoreOptions, Subscriber, Selector, EqualityFn } from '@vielzeug/stateit';
import { shallowEqual, shallowMerge } from '@vielzeug/stateit';

// Testing utilities
import { createTestStore, withMock } from '@vielzeug/stateit';
```

## Basic Usage

### Creating a Store

```ts
import { createStore } from '@vielzeug/stateit';

// Simple store
const counterStore = createStore({ count: 0 });

// With options
const userStore = createStore(
  { name: 'Alice', age: 30 },
  {
    name: 'userStore',
    equals: customEqualityFn,
  },
);
```

### Reading State

```ts
// Get current state snapshot
const state = counterStore.get();
console.log(state.count); // 0

// Select a specific value without subscribing
const count = counterStore.select((state) => state.count);
console.log(count); // 0

// Select nested property
const userStore = createStore({
  user: { name: 'Alice', profile: { age: 30 } },
});
const userName = userStore.select((state) => state.user.name);
console.log(userName); // 'Alice'

// Select computed value
const doubleCount = counterStore.select((state) => state.count * 2);
console.log(doubleCount); // 0

// Select multiple fields
const userInfo = userStore.select((state) => ({
  name: state.user.name,
  age: state.user.profile.age,
}));
console.log(userInfo); // { name: 'Alice', age: 30 }

// Get store name (if configured)
const name = counterStore.getName(); // 'userStore' or undefined
```

::: tip 💡 select() vs get()
Use `select()` for type-safe property access with selectors. Use `get()` to retrieve the entire state object.
:::

### Updating State

```ts
// Replace entire state
counterStore.replace({ count: 5 });

// Partial update (shallow merge)
counterStore.set({ count: 1 });

// Update with function (sync)
await counterStore.update((state) => ({
  ...state,
  count: state.count + 1,
}));

// Update with function (async)
await counterStore.update(async (state) => {
  const data = await fetchData();
  return { ...state, data };
});

// Reset to initial state
counterStore.reset();
```

## Subscriptions

### Full State Subscription

Subscribe to all state changes:

```ts
const unsubscribe = counterStore.subscribe((state, prevState) => {
  console.log('State changed:', state);
  console.log('Previous state:', prevState);
});

// Unsubscribe when done
unsubscribe();
```

::: tip 💡 Immediate Invocation
Subscribers are called immediately with the current state when you subscribe.
:::

### Selective Subscription

Subscribe to a specific slice of state:

```ts
// Subscribe to a single field
const unsubscribe = counterStore.subscribe(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// Subscribe to computed value
counterStore.subscribe(
  (state) => state.count * 2,
  (doubleCount) => {
    console.log('Double count:', doubleCount);
  },
);

// Subscribe to nested value
const userStore = createStore({
  user: { name: 'Alice', profile: { age: 30 } },
});

userStore.subscribe(
  (state) => state.user.profile.age,
  (age) => {
    console.log('Age changed:', age);
  },
);
```

### Custom Equality

Control when subscribers are notified:

```ts
const itemsStore = createStore({ items: [] });

// Only notify if array length changes
itemsStore.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items count changed:', items.length);
  },
  {
    equality: (a, b) => a.length === b.length,
  },
);

// Custom deep equality
import { isEqual } from 'lodash-es';

itemsStore.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items deeply changed:', items);
  },
  {
    equality: isEqual,
  },
);
```

### Observers

Low-level API for observing all changes without filtering:

```ts
const unobserve = counterStore.observe((state, prevState) => {
  console.log('Raw state change detected');
  // Called for every state change
  // NOT called immediately on subscription
});

unobserve();
```

::: warning ⚠️ Observer vs Subscribe

- `observe()` is NOT called immediately upon subscription
- `subscribe()` IS called immediately with current state
- Use `subscribe()` for most use cases
  :::

## Store Options

### Named Stores

Useful for debugging and logging:

```ts
const store = createStore({ count: 0 }, { name: 'counterStore' });

console.log(store.getName()); // 'counterStore'
```

### Custom Equality

Override the default shallow equality check:

```ts
type State = { count: number; name: string };

const store = createStore<State>(
  { count: 0, name: 'test' },
  {
    equals: (a, b) => {
      // Only trigger updates if count changed
      return a.count === b.count;
    },
  },
);

// This won't trigger subscribers (count didn't change)
store.replace({ count: 0, name: 'changed' });
```

## Scoped Stores

### Child Stores

Create independent child stores:

```ts
const parentStore = createStore({ count: 0, name: 'parent' });

// Create child with parent state
const childStore = parentStore.createChild();

// Create child with overrides
const draftStore = parentStore.createChild({ count: 10 });

// Child changes don't affect parent
childStore.set({ count: 5 });
console.log(childStore.get().count); // 5
console.log(parentStore.get().count); // 0

// Parent changes don't affect child
parentStore.set({ count: 10 });
console.log(childStore.get().count); // 5
```

### Scoped Execution

Run code in isolated scope:

```ts
const store = createStore({ count: 0 });

await store.runInScope(
  async (scopedStore) => {
    // Work with isolated state
    scopedStore.set({ count: 999 });
    console.log(scopedStore.get().count); // 999

    await doSomethingAsync();
  },
  { isTemporary: true },
);

// Parent unchanged
console.log(store.get().count); // 0
```

## Advanced Patterns

### Async State Updates

Handle loading states:

```ts
type DataState = {
  data: any | null;
  loading: boolean;
  error: Error | null;
};

const dataStore = createStore<DataState>({
  data: null,
  loading: false,
  error: null,
});

async function fetchData() {
  dataStore.set({ loading: true, error: null });

  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    dataStore.set({ data, loading: false });
  } catch (error) {
    dataStore.set({
      error: error as Error,
      loading: false,
    });
  }
}
```

### Computed Values

Create derived values:

```ts
const cartStore = createStore({
  items: [
    { id: 1, price: 10, quantity: 2 },
    { id: 2, price: 20, quantity: 1 },
  ],
});

// Subscribe to computed total
cartStore.subscribe(
  (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  (total) => {
    console.log('Cart total:', total);
  },
);
```

### Middleware Pattern

Add cross-cutting concerns:

```ts
function withLogging<T extends object>(store: Store<T>) {
  store.observe((state, prev) => {
    console.log('State updated:', {
      from: prev,
      to: state,
      timestamp: new Date().toISOString(),
    });
  });
  return store;
}

function withPersistence<T extends object>(store: Store<T>, key: string) {
  // Load from localStorage
  const saved = localStorage.getItem(key);
  if (saved) {
    store.replace(JSON.parse(saved));
  }

  // Save on changes
  store.observe((state) => {
    localStorage.setItem(key, JSON.stringify(state));
  });

  return store;
}

// Usage
const store = withLogging(withPersistence(createStore({ count: 0 }), 'counter-state'));
```

### Multiple Store Composition

Coordinate multiple stores:

```ts
const authStore = createStore({ user: null, token: null });
const cartStore = createStore({ items: [] });
const uiStore = createStore({ theme: 'light', sidebarOpen: false });

// Clear cart when user logs out
authStore.subscribe((auth) => {
  if (!auth.user) {
    cartStore.set({ items: [] });
  }
});

// Update theme in DOM
uiStore.subscribe(
  (state) => state.theme,
  (theme) => {
    document.body.className = theme;
  },
);
```

## Utility Functions

### shallowEqual

Compare two values for shallow equality:

```ts
import { shallowEqual } from '@vielzeug/stateit';

shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
shallowEqual({ a: 1 }, { a: 2 }); // false
shallowEqual([1, 2, 3], [1, 2, 3]); // true
```

### shallowMerge

Perform shallow merge of objects:

```ts
import { shallowMerge } from '@vielzeug/stateit';

const state = { a: 1, b: 2 };
const result = shallowMerge(state, { b: 3, c: 4 });
// { a: 1, b: 3, c: 4 }
```

## Type Safety

### State Type Inference

TypeScript automatically infers state types:

```ts
const store = createStore({
  count: 0,
  name: 'test',
  items: [] as string[],
});

// Type inferred: { count: number; name: string; items: string[] }
const state = store.get();

// Type-safe selectors
store.subscribe(
  (state) => state.count, // Type: number
  (count) => {
    // count is typed as number
  },
);
```

### Explicit Type Annotations

Provide explicit types when needed:

```ts
type UserState = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

const userStore = createStore<UserState>({
  id: '',
  name: '',
  email: '',
  role: 'user',
});

// Compile-time error for invalid updates
userStore.set({ invalid: true }); // ❌ Type error
userStore.set({ role: 'invalid' }); // ❌ Type error
userStore.set({ name: 'Alice' }); // ✅ Valid
```

## Best Practices

### ✅ Do

- Use descriptive store names for debugging
- Subscribe to specific fields to avoid unnecessary re-renders
- Use scoped stores for isolated contexts (e.g., request-scoped)
- Leverage custom equality functions for performance
- Unsubscribe when components unmount
- Use TypeScript for type safety
- Keep stores focused and single-purpose
- Use async updates for async operations

### ❌ Don't

- Don't directly mutate state objects (always create new references)
- Don't create too many subscriptions (use selectors wisely)
- Don't forget to unsubscribe (leads to memory leaks)
- Don't use stores for local component state
- Don't share mutable objects in state
- Don't mix sync and async state updates without handling
- Don't create deeply nested state (keep it flat)

## Performance Tips

### Optimize Subscriptions

```ts
// ❌ Bad - subscribes to entire state
store.subscribe((state) => {
  updateUI(state.count);
});

// ✅ Good - subscribes only to count
store.subscribe(
  (state) => state.count,
  (count) => {
    updateUI(count);
  },
);
```

### Batch Updates

```ts
// ❌ Bad - multiple notifications
store.set({ count: 1 });
store.set({ name: 'Alice' });
store.set({ age: 30 });

// ✅ Good - single notification
store.set({ count: 1, name: 'Alice', age: 30 });

// ✅ Also good - update function
await store.update((state) => ({
  ...state,
  count: 1,
  name: 'Alice',
  age: 30,
}));
```

### Custom Equality for Complex Values

```ts
// Only re-render if item IDs changed
store.subscribe(
  (state) => state.items.map((item) => item.id),
  (ids) => {
    updateItemList(ids);
  },
  {
    equality: (a, b) => {
      if (a.length !== b.length) return false;
      return a.every((id, i) => id === b[i]);
    },
  },
);
```

## Common Patterns

### Loading State Pattern

```ts
type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

function createAsyncStore<T>(initialData: T | null = null) {
  return createStore<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });
}

// Usage
const userStore = createAsyncStore<User>();

async function loadUser(id: string) {
  userStore.set({ loading: true, error: null });
  try {
    const user = await api.getUser(id);
    userStore.set({ data: user, loading: false });
  } catch (error) {
    userStore.set({ error: error as Error, loading: false });
  }
}
```

### Optimistic Updates Pattern

```ts
async function updateItem(id: string, updates: Partial<Item>) {
  const prevState = itemsStore.get();

  // Optimistic update
  itemsStore.set({
    items: prevState.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
  });

  try {
    await api.updateItem(id, updates);
  } catch (error) {
    // Rollback on error
    itemsStore.replace(prevState);
    throw error;
  }
}
```

### Undo/Redo Pattern

```ts
class History<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(private store: Store<T>) {
    store.observe((state, prev) => {
      this.past.push(prev);
      this.future = [];
    });
  }

  undo() {
    const previous = this.past.pop();
    if (previous) {
      this.future.push(this.store.get());
      this.store.replace(previous);
    }
  }

  redo() {
    const next = this.future.pop();
    if (next) {
      this.past.push(this.store.get());
      this.store.replace(next);
    }
  }
}

// Usage
const store = createStore({ count: 0 });
const history = new History(store);

store.set({ count: 1 });
store.set({ count: 2 });
history.undo(); // Back to count: 1
history.redo(); // Forward to count: 2
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> - Complete API documentation</li>
      <li><a href="./examples">Examples</a> - Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> - Try it in your browser</li>
    </ul>
  </div>
</div>
