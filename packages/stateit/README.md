# @vielzeug/stateit

## What is Stateit?

**Stateit** is a tiny, framework-agnostic state management library. Build reactive applications with simple, powerful state handling—all in just 2.4 KB.

### The Problem

State management libraries are often complex or framework-specific:

- **Redux** requires boilerplate and middleware
- **MobX** has a learning curve with decorators
- **Zustand** is React-specific
- **Jotai/Recoil** are React-only
- Manual state management leads to bugs

### The Solution

Stateit provides a simple, reactive store API:

```typescript
import { createStore } from '@vielzeug/stateit';

const store = createStore({ count: 0, user: null });

// Subscribe to changes
store.subscribe((state, prev) => {
  console.log('Count changed:', prev.count, '→', state.count);
});

// Update state
store.set({ count: 1 });
store.set((state) => ({ count: state.count + 1 }));

// Read state
const current = store.get();
```

## ✨ Features

- ✅ **Type-Safe** – Full TypeScript support with precise type inference
- ✅ **Reactive Subscriptions** – Selective subscriptions with automatic change detection
- ✅ **Scoped Stores** – Child stores and isolated execution contexts
- ✅ **Custom Equality** – Configurable equality checks for fine-grained control
- ✅ **Async Support** – First-class support for async state updates
- ✅ **Batched Updates** – Automatic notification batching for optimal performance
- ✅ **Framework Agnostic** – Works with React, Vue, Svelte, or vanilla JS
- ✅ **Lightweight** – ~2.4 KB gzipped, zero dependencies
- ✅ **Developer Experience** – Intuitive API with comprehensive testing helpers

## 🆚 Comparison with Alternatives

| Feature                 | stateit    | Zustand            | Jotai              | Valtio             |
| ----------------------- | ---------- | ------------------ | ------------------ | ------------------ |
| Bundle Size (gzipped)   | **2.4 KB** | 1.1 KB             | 3.0 KB             | 5.4 KB             |
| Framework Agnostic      | ✅         | ❌ (React-focused) | ❌ (React-focused) | ❌ (React-focused) |
| TypeScript              | ✅ Full    | ✅ Full            | ✅ Full            | ✅ Full            |
| Selective Subscriptions | ✅         | ✅                 | ✅                 | ✅                 |
| Async Updates           | ✅         | ✅                 | ✅                 | ✅                 |
| Scoped Stores           | ✅         | ❌                 | ✅ (atoms)         | ❌                 |
| Custom Equality         | ✅         | ✅                 | ✅                 | ❌                 |
| Testing Helpers         | ✅         | ❌                 | ❌                 | ❌                 |
| Dependencies            | **0**      | 1                  | 0                  | 1                  |

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/stateit
# npm
npm install @vielzeug/stateit
# yarn
yarn add @vielzeug/stateit
```

## 🚀 Quick Start

```typescript
import { createStore } from '@vielzeug/stateit';

// Create a store
const counter = createStore({ count: 0 });

// Read state
console.log(counter.get().count); // 0

// Subscribe to changes
counter.subscribe((state, prev) => {
  console.log(`Count changed from ${prev.count} to ${state.count}`);
});

// Update state – partial merge
counter.set({ count: 1 });

// Update with sync function
counter.set((state) => ({
  ...state,
  count: state.count + 1,
}));

// Update with async function
await counter.set(async (state) => {
  const data = await fetchData();
  return { ...state, data };
});
```

## 🎓 Core Concepts

### Store Creation

```typescript
import { createStore } from '@vielzeug/stateit';

// Simple store
const userStore = createStore({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
});

// Named store (useful for debugging)
const appStore = createStore(
  {
    theme: 'dark',
    language: 'en',
  },
  { name: 'appSettings' },
);

// Custom equality function
const todoStore = createStore(
  { todos: [], filter: 'all' },
  {
    equals: (a, b) => {
      // Only trigger updates if todos array actually changed
      return a.todos === b.todos && a.filter === b.filter;
    },
  },
);
```

### Reading State

```typescript
// Get current state snapshot
const state = store.get();

// Access properties
console.log(state.name);
console.log(state.age);

// Select specific value without subscribing
const name = store.get((state) => state.name);
console.log(name); // 'Alice'

// Select nested property
const userStore = createStore({
  user: { profile: { email: 'alice@example.com' } },
});
const email = userStore.get((state) => state.user.profile.email);

// Select computed value
const isAdult = store.get((state) => state.age >= 18);

// Select multiple fields
const userInfo = store.get((state) => ({
  name: state.name,
  email: state.email,
}));
```

### Updating State

```typescript
// Merge partial state (shallow merge)
store.set({ age: 31 });

// Update with sync function
store.set((state) => ({
  ...state,
  age: state.age + 1,
}));

// Update with async function (returns Promise)
await store.set(async (state) => {
  const user = await fetchUser(state.id);
  return { ...state, ...user };
});

// Reset to initial state
store.reset();
```

### Subscriptions

```typescript
// Subscribe to all state changes
const unsubscribe = store.subscribe((state, prevState) => {
  console.log('State changed:', state);
  console.log('Previous state:', prevState);
});

// Unsubscribe when done
unsubscribe();

// Subscribe to specific field
store.subscribe(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// Subscribe with custom equality
store.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items changed:', items);
  },
  {
    equality: (a, b) => a.length === b.length, // Only notify if length changes
  },
);
```

### Scoped Stores

```typescript
// Create independent child store
const childStore = store.createChild({ isDraft: true });

childStore.set({ name: 'Modified' });
console.log(childStore.get().name); // "Modified"
console.log(store.get().name); // Original value (unchanged)

// Run code in isolated scope
await store.runInScope(
  async (scopedStore) => {
    scopedStore.set({ count: 999 });
    console.log(scopedStore.get().count); // 999
    await doSomething();
  },
  { isTemporary: true },
);

console.log(store.get().count); // Original value (unchanged)
```

## Framework Integration

### React

```typescript
import { useEffect, useSyncExternalStore } from 'react';
import { createStore, type Store } from '@vielzeug/stateit';

// Create hook for store integration
function useStore<T extends object>(store: Store<T>): T;
function useStore<T extends object, U>(
  store: Store<T>,
  selector: (state: T) => U
): U;
function useStore<T extends object, U>(
  store: Store<T>,
  selector?: (state: T) => U
) {
  return useSyncExternalStore(
    (callback) => {
      if (selector) {
        return store.subscribe(selector, callback);
      }
      return store.subscribe(callback);
    },
    () => (selector ? selector(store.get()) : store.get())
  );
}

// Create stores
const counterStore = createStore({ count: 0 });
const userStore = createStore({ name: 'Alice', isLoggedIn: false });

// Use in components
function Counter() {
  // Subscribe to specific field
  const count = useStore(counterStore, (state) => state.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterStore.set({ count: count + 1 })}>
        Increment
      </button>
    </div>
  );
}

function User() {
  // Subscribe to full state
  const user = useStore(userStore);

  return <div>Welcome, {user.name}!</div>;
}
```

### Vue

```typescript
import { computed, onUnmounted } from 'vue';
import { createStore, type Store } from '@vielzeug/stateit';

// Create composable for store integration
function useStore<T extends object>(store: Store<T>) {
  const state = computed(() => store.get());

  const unsubscribe = store.subscribe(() => {
    // Trigger reactivity
    state.value = store.get();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return state;
}

function useStoreSelector<T extends object, U>(store: Store<T>, selector: (state: T) => U) {
  const selected = computed(() => selector(store.get()));

  const unsubscribe = store.subscribe(selector, (value) => {
    selected.value = value;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return selected;
}

// Create store
const counterStore = createStore({ count: 0 });

// Use in component
export default {
  setup() {
    const state = useStore(counterStore);
    const count = useStoreSelector(counterStore, (s) => s.count);

    const increment = () => {
      counterStore.set({ count: count.value + 1 });
    };

    return { state, count, increment };
  },
};
```

### Svelte

```typescript
import { readable } from 'svelte/store';
import { createStore, type Store } from '@vielzeug/stateit';

// Create Svelte store from stateit store
function toSvelteStore<T extends object>(store: Store<T>) {
  return readable(store.get(), (set) => {
    return store.subscribe(set);
  });
}

// Create store
const counterStore = createStore({ count: 0 });

// Convert to Svelte store
const counter = toSvelteStore(counterStore);

// Use in component
// In your .svelte file:
// <script>
//   $: count = $counter.count;
//
//   function increment() {
//     counterStore.set({ count: $counter.count + 1 });
//   }
// </script>
```

## 🔥 Advanced Usage

### Async State Updates

```typescript
const dataStore = createStore({
  data: null,
  loading: false,
  error: null,
});

// Async fetch with loading state
async function fetchData() {
  // Set loading
  dataStore.set({ loading: true, error: null });

  try {
    await dataStore.set(async (state) => {
      const response = await fetch('/api/data');
      const data = await response.json();
      return { ...state, data, loading: false };
    });
  } catch (error) {
    dataStore.set({ error, loading: false });
  }
}
```

### Computed Values

```typescript
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

### Derived State with get()

Use `get()` with a selector for one-time reads of computed values without subscribing:

```typescript
const userStore = createStore({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA',
  },
});

// Get computed full name
function getFullName() {
  return userStore.get((state) => `${state.firstName} ${state.lastName}`);
}

// Get nested property
function getCity() {
  return userStore.get((state) => state.address.city);
}

// Get multiple derived values
function getUserSummary() {
  return userStore.get((state) => ({
    name: `${state.firstName} ${state.lastName}`,
    location: `${state.address.city}, ${state.address.country}`,
    isAdult: state.age >= 18,
  }));
}

console.log(getFullName()); // "Alice Johnson"
console.log(getCity()); // "New York"
console.log(getUserSummary());
// { name: "Alice Johnson", location: "New York, USA", isAdult: true }
```

### Middleware Pattern

```typescript
function withLogging<T extends object>(store: Store<T>) {
  store.subscribe((state, prev) => {
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
    store.set(JSON.parse(saved));
  }

  // Save on changes
  store.subscribe((state) => {
    localStorage.setItem(key, JSON.stringify(state));
  });

  return store;
}

// Usage
const store = withLogging(withPersistence(createStore({ count: 0 }), 'counter-state'));
```

### Multiple Stores Composition

```typescript
const authStore = createStore({ user: null, token: null });
const cartStore = createStore({ items: [] });
const uiStore = createStore({ theme: 'light', sidebarOpen: false });

// Subscribe to multiple stores
function syncStores() {
  authStore.subscribe((auth) => {
    if (!auth.user) {
      // Clear cart when user logs out
      cartStore.set({ items: [] });
    }
  });

  uiStore.subscribe(
    (state) => state.theme,
    (theme) => {
      document.body.className = theme;
    },
  );
}
```

## Testing

### Testing Helpers

```typescript
import { createTestStore, withMock } from '@vielzeug/stateit';

describe('Counter', () => {
  it('increments count', () => {
    // Create isolated test store
    const { store, dispose } = createTestStore(baseStore, { count: 0 });

    store.set({ count: 1 });
    expect(store.get().count).toBe(1);

    // Cleanup
    dispose();
  });

  it('uses mocked state', async () => {
    const store = createStore({ count: 0 });

    await withMock(store, { count: 99 }, async () => {
      // State is temporarily overridden
      // But this won't affect store directly since withMock uses runInScope
      await testWithMockedState();
    });

    // Original state unchanged
    expect(store.get().count).toBe(0);
  });
});
```

### Testing Subscriptions

```typescript
import { vi } from 'vitest';

it('notifies subscribers on change', async () => {
  const store = createStore({ count: 0 });
  const listener = vi.fn();

  store.subscribe(listener);
  listener.mockClear();

  store.set({ count: 1 });
  await Promise.resolve(); // Wait for batched notification

  expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
});
```

## 🎯 API Reference

### `createStore<T>(initialState: T, options?: StoreOptions<T>): Store<T>`

Creates a new store instance.

**Options:**

- `name?: string` – Optional name for debugging
- `equals?: EqualityFn<T>` – Custom equality function

### `Store<T>`

#### Read Methods

- `get(): T` – Get current state snapshot
- `get<U>(selector: (state: T) => U): U` – Get selected value without subscribing

#### Write Methods

- `set(patch: Partial<T>): void` – Merge partial state (shallow)
- `set(updater: (state: T) => T): void` – Update with sync function
- `set(updater: (state: T) => Promise<T>): Promise<void>` – Update with async function
- `reset(): void` – Reset to initial state

#### Subscription Methods

- `subscribe(listener: Listener<T>): Unsubscribe` – Subscribe to all changes
- `subscribe<U>(selector: Selector<T, U>, listener: Listener<U>, options?: { equality?: EqualityFn<U> }): Unsubscribe` – Subscribe to selected value

#### Scoping Methods

- `createChild(patch?: Partial<T>): Store<T>` – Create independent child store
- `runInScope<R>(fn: (scopedStore: Store<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R>` – Execute with scoped store

### Utility Functions

- `shallowEqual(a: unknown, b: unknown): boolean` – Shallow equality check
- `shallowMerge<T>(state: T, patch: Partial<T>): T` – Shallow merge

### Testing Helpers

- `createTestStore<T>(baseStore?: Store<T>, patch?: Partial<T>)` – Create test store
- `withMock<T, R>(baseStore: Store<T>, patch: Partial<T>, fn: () => R | Promise<R>): Promise<R>` – Temporary state override

## TypeScript Support

Fully typed with comprehensive type inference:

```typescript
const store = createStore({ count: 0, name: 'test' });

// Type inferred: { count: number; name: string }
const state = store.get();

// Type-safe selectors
store.subscribe(
  (state) => state.count, // Type: number
  (count) => {
    // count is typed as number
  },
);

// Compile-time error for invalid keys
store.set({ invalid: true }); // ❌ Type error
```

## FAQ

### When should I use stateit?

Use stateit when you need:

- Simple, predictable state management
- Framework-agnostic solution
- Type-safe state updates
- Fine-grained subscription control
- Minimal bundle size impact

### Can I use multiple stores?

Yes! Create as many stores as needed:

```typescript
const authStore = createStore({ user: null });
const themeStore = createStore({ mode: 'light' });
const dataStore = createStore({ items: [] });
```

### How does batching work?

State changes within the same synchronous tick are automatically batched:

```typescript
store.set({ count: 1 });
store.set({ count: 2 });
store.set({ count: 3 });
// Subscribers called once with final state
```

### Can I use this with Redux DevTools?

While stateit doesn't have built-in DevTools support, you can implement it via observers:

```typescript
store.subscribe((state, prev) => {
  window.__REDUX_DEVTOOLS_EXTENSION__?.send({
    type: 'STATE_UPDATE',
    payload: state,
  });
});
```

### Is it production-ready?

Yes! stateit is:

- ✅ Fully tested (49 tests, 100% coverage)
- ✅ Type-safe
- ✅ Zero dependencies
- ✅ Battle-tested patterns

## 📖 Documentation

- [**Full Documentation**](https://helmuthdu.github.io/vielzeug/stateit)
- [**Usage Guide**](https://helmuthdu.github.io/vielzeug/stateit/usage)
- [**API Reference**](https://helmuthdu.github.io/vielzeug/stateit/api)
- [**Examples**](https://helmuthdu.github.io/vielzeug/stateit/examples)

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🤝 Contributing

Contributions are welcome! Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 🔗 Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://helmuthdu.github.io/vielzeug/deposit)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/deposit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem – A collection of type-safe utilities for modern web development.
