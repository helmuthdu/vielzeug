# @vielzeug/snapit

## What is Snapit?

**Snapit** is a tiny, framework-agnostic state management library that lets you **snap** state values in and out with ease. Think of it as taking quick snapshots of your application state—read it, update it, and subscribe to changes with a simple, intuitive API.

### The Problem

State management libraries are often complex or framework-specific:

- **Redux** requires boilerplate and middleware
- **MobX** has a learning curve with decorators and observables
- **Zustand** is React-specific
- **Jotai/Recoil** are React-only with atomic patterns
- **Valtio** uses proxy magic that can be hard to debug
- Manual state management leads to bugs and scattered logic

### The Solution

Snapit provides a simple, reactive state API that lets you **snap** state changes into place:

```typescript
import { createSnapshot } from '@vielzeug/snapit';

const state = createSnapshot({ count: 0, user: null });

// Subscribe to changes
state.subscribe((curr, prev) => {
  console.log('Count changed:', prev.count, '→', curr.count);
});

// Snap in new values
state.set({ count: 1 });
state.set((data) => ({ count: data.count + 1 }));

// Snap out the current state
const snapshot = state.get();
```

**Why "Snapit"?**

- **Snap** state values in with `set()`
- **Snap** state values out with `get()`
- Get instant **snapshots** of your application state
- Changes happen in a **snap** - fast and lightweight
- Simple, **snappy** API that's easy to learn

## ✨ Features

- ✅ **Type-Safe** – Full TypeScript support with precise type inference
- ✅ **Reactive Subscriptions** – Selective subscriptions with automatic change detection
- ✅ **Computed Values** – Cached derived values that update automatically
- ✅ **Transactions** – Batch multiple updates for optimal performance
- ✅ **Scoped States** – Child states and isolated execution contexts
- ✅ **Custom Equality** – Configurable equality checks for fine-grained control
- ✅ **Async Support** – First-class support for async state updates
- ✅ **Batched Updates** – Automatic notification batching for optimal performance
- ✅ **Framework Agnostic** – Works with React, Vue, Svelte, or vanilla JS
- ✅ **Lightweight** – ~2.4 KB gzipped, zero dependencies
- ✅ **Developer Experience** – Intuitive API with comprehensive testing helpers

## 🆚 Comparison with Alternatives

| Feature                 | snapit     | Zustand            | Jotai              | Valtio             |
| ----------------------- | ----------- | ------------------ | ------------------ | ------------------ |
| Bundle Size (gzipped)   | **~2.5 KB** | ~3.5 KB            | ~6.5 KB            | ~5.8 KB            |
| Framework Agnostic      | ✅          | ❌ (React-focused) | ❌ (React-focused) | ❌ (React-focused) |
| TypeScript              | ✅ Full     | ✅ Full            | ✅ Full            | ✅ Full            |
| Selective Subscriptions | ✅          | ✅                 | ✅                 | ✅                 |
| Computed Values         | ✅          | ❌                 | ✅                 | ✅                 |
| Transactions            | ✅          | ❌                 | ❌                 | ❌                 |
| Async Updates           | ✅          | ✅                 | ✅                 | ✅                 |
| Scoped States           | ✅          | ❌                 | ✅ (atoms)         | ❌                 |
| Custom Equality         | ✅          | ✅                 | ✅                 | ❌                 |
| Testing Helpers         | ✅          | ❌                 | ❌                 | ❌                 |
| Dependencies            | **0**       | 1                  | 0                  | 1                  |

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/snapit
# npm
npm install @vielzeug/snapit
# yarn
yarn add @vielzeug/snapit
```

## 🚀 Quick Start

```typescript
import { createSnapshot } from '@vielzeug/snapit';

// Create a state
const counter = createSnapshot({ count: 0 });

// Read state
console.log(counter.get().count); // 0

// Subscribe to changes
counter.subscribe((curr, prev) => {
  console.log(`Count changed from ${prev.count} to ${curr.count}`);
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

### State Creation

```typescript
import { createSnapshot } from '@vielzeug/snapit';

// Simple state
const userState = createSnapshot({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
});

// Named state (useful for debugging)
const appState = createSnapshot(
  {
    theme: 'dark',
    language: 'en',
  },
  { name: 'appSettings' },
);

// Custom equality function
const todoState = createSnapshot(
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
const snapshot = state.get();

// Access properties
console.log(snapshot.name);
console.log(snapshot.age);

// Select specific value without subscribing
const name = state.get((data) => data.name);
console.log(name); // 'Alice'

// Select nested property
const userState = createSnapshot({
  user: { profile: { email: 'alice@example.com' } },
});
const email = userState.get((data) => data.user.profile.email);

// Select computed value
const isAdult = state.get((data) => data.age >= 18);

// Select multiple fields
const userInfo = state.get((data) => ({
  name: data.name,
  email: data.email,
}));
```

### Updating State

```typescript
// Merge partial state (shallow merge)
state.set({ age: 31 });

// Update with sync function
state.set((data) => ({
  ...data,
  age: data.age + 1,
}));

// Update with async function (returns Promise)
await state.set(async (data) => {
  const user = await fetchUser(data.id);
  return { ...data, ...user };
});

// Reset to initial state
state.reset();
```

### Subscriptions

```typescript
// Subscribe to all state changes
const unsubscribe = state.subscribe((curr, prev) => {
  console.log('State changed:', curr);
  console.log('Previous state:', prev);
});

// Unsubscribe when done
unsubscribe();

// Subscribe to specific field
state.subscribe(
  (data) => data.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// Subscribe with custom equality
state.subscribe(
  (data) => data.items,
  (items) => {
    console.log('Items changed:', items);
  },
  {
    equality: (a, b) => a.length === b.length, // Only notify if length changes
  },
);
```

### Scoped States

```typescript
// Create independent child state
const childState = state.createChild({ isDraft: true });

childState.set({ name: 'Modified' });
console.log(childState.get().name); // "Modified"
console.log(state.get().name); // Original value (unchanged)

// Run code in isolated scope
await state.runInScope(
  async (scopedState) => {
    scopedState.set({ count: 999 });
    console.log(scopedState.get().count); // 999
    await doSomething();
  },
  { isTemporary: true },
);

console.log(state.get().count); // Original value (unchanged)
```

### Computed Values

```typescript
// Create cached derived value
const cart = createSnapshot({
  items: [
    { price: 10, quantity: 2 },
    { price: 20, quantity: 1 },
  ],
});

const total = cart.computed((state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

console.log(total.get()); // 40

// Subscribe to computed value changes
total.subscribe((current, prev) => {
  console.log(`Total: ${prev} → ${current}`);
});

// Computed value updates automatically
cart.set({
  items: [...cart.get().items, { price: 15, quantity: 3 }],
});
console.log(total.get()); // 85
```

### Transactions

```typescript
// Batch multiple updates into single notification
const state = createSnapshot({ count: 0, name: 'Alice', age: 30 });

state.subscribe((current) => {
  console.log('State updated:', current);
});

// Multiple updates = multiple notifications (without transaction)
state.set({ count: 1 }); // notification 1
state.set({ name: 'Bob' }); // notification 2
state.set({ age: 31 }); // notification 3

// Batch into single notification (with transaction)
state.transaction(() => {
  state.set({ count: 1 });
  state.set({ name: 'Bob' });
  state.set({ age: 31 });
}); // Only 1 notification with final state
```

## Framework Integration

### React

```typescript
import { useEffect, useSyncExternalStore } from 'react';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Create hook for state integration
function useState<T extends object>(state: State<T>): T;
function useState<T extends object, U>(
  state: State<T>,
  selector: (state: T) => U
): U;
function useState<T extends object, U>(
  state: State<T>,
  selector?: (state: T) => U
) {
  return useSyncExternalStore(
    (callback) => {
      if (selector) {
        return state.subscribe(selector, callback);
      }
      return state.subscribe(callback);
    },
    () => (selector ? selector(state.get()) : state.get())
  );
}

// Create states
const counterState = createSnapshot({ count: 0 });
const userState = createSnapshot({ name: 'Alice', isLoggedIn: false });

// Use in components
function Counter() {
  // Subscribe to specific field
  const count = useState(counterState, (data) => data.count);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => counterState.set({ count: count + 1 })}>
        Increment
      </button>
    </div>
  );
}

function User() {
  // Subscribe to full state
  const user = useState(userState);

  return <div>Welcome, {user.name}!</div>;
}
```

### Vue

```typescript
import { computed, onUnmounted } from 'vue';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Create composable for state integration
function useState<T extends object>(state: State<T>) {
  const reactive = computed(() => state.get());

  const unsubscribe = state.subscribe(() => {
    // Trigger reactivity
    reactive.value = state.get();
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return reactive;
}

function useSelector<T extends object, U>(state: State<T>, selector: (state: T) => U) {
  const selected = computed(() => selector(state.get()));

  const unsubscribe = state.subscribe(selector, (value) => {
    selected.value = value;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return selected;
}

// Create state
const counterState = createSnapshot({ count: 0 });

// Use in component
export default {
  setup() {
    const state = useState(counterState);
    const count = useSelector(counterState, (s) => s.count);

    const increment = () => {
      counterState.set({ count: count.value + 1 });
    };

    return { state, count, increment };
  },
};
```

### Svelte

```typescript
import { readable } from 'svelte/state';
import { createSnapshot, type State } from '@vielzeug/snapit';

// Create Svelte state from snapit state
function toState<T extends object>(state: State<T>) {
  return readable(state.get(), (set) => {
    return state.subscribe(set);
  });
}

// Create state
const counterState = createSnapshot({ count: 0 });

// Convert to Svelte state
const counter = toState(counterState);

// Use in component
// In your .svelte file:
// <script>
//   $: count = $counter.count;
//
//   function increment() {
//     counterState.set({ count: $counter.count + 1 });
//   }
// </script>
```

## 🔥 Advanced Usage

### Async State Updates

```typescript
const dataState = createSnapshot({
  data: null,
  loading: false,
  error: null,
});

// Async fetch with loading state
async function fetchData() {
  // Set loading
  dataState.set({ loading: true, error: null });

  try {
    await dataState.set(async (curr) => {
      const response = await fetch('/api/data');
      const data = await response.json();
      return { ...curr, data, loading: false };
    });
  } catch (error) {
    dataState.set({ error, loading: false });
  }
}
```

### Computed Values

```typescript
const cartState = createSnapshot({
  items: [
    { id: 1, price: 10, quantity: 2 },
    { id: 2, price: 20, quantity: 1 },
  ],
});

// Subscribe to computed total
cartState.subscribe(
  (data) => data.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  (total) => {
    console.log('Cart total:', total);
  },
);
```

### Derived State with get()

Use `get()` with a selector for one-time reads of computed values without subscribing:

```typescript
const userState = createSnapshot({
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
  return userState.get((data) => `${data.firstName} ${data.lastName}`);
}

// Get nested property
function getCity() {
  return userState.get((data) => data.address.city);
}

// Get multiple derived values
function getUserSummary() {
  return userState.get((data) => ({
    name: `${data.firstName} ${data.lastName}`,
    location: `${data.address.city}, ${data.address.country}`,
    isAdult: data.age >= 18,
  }));
}

console.log(getFullName()); // "Alice Johnson"
console.log(getCity()); // "New York"
console.log(getUserSummary());
// { name: "Alice Johnson", location: "New York, USA", isAdult: true }
```

### Middleware Pattern

```typescript
function withLogging<T extends object>(state: State<T>) {
  state.subscribe((curr, prev) => {
    console.log('State updated:', {
      from: prev,
      to: curr,
      timestamp: new Date().toISOString(),
    });
  });

  return state;
}

function withPersistence<T extends object>(state: State<T>, key: string) {
  // Load from localStorage
  const saved = localStorage.getItem(key);
  if (saved) {
    state.set(JSON.parse(saved));
  }

  // Save on changes
  state.subscribe((curr) => {
    localStorage.setItem(key, JSON.stringify(curr));
  });

  return state;
}

// Usage
const state = withLogging(withPersistence(createSnapshot({ count: 0 }), 'counter-state'));
```

### Multiple States Composition

```typescript
const authState = createSnapshot({ user: null, token: null });
const cartState = createSnapshot({ items: [] });
const uiState = createSnapshot({ theme: 'light', sidebarOpen: false });

// Subscribe to multiple states
function syncStates() {
  authState.subscribe((auth) => {
    if (!auth.user) {
      // Clear cart when user logs out
      cartState.set({ items: [] });
    }
  });

  uiState.subscribe(
    (data) => data.theme,
    (theme) => {
      document.body.className = theme;
    },
  );
}
```

## Testing

### Testing Helpers

```typescript
import { createTestState, withStateMock } from '@vielzeug/snapit';

describe('Counter', () => {
  it('increments count', () => {
    // Create isolated test state
    const { state, dispose } = createTestState(baseState, { count: 0 });

    state.set({ count: 1 });
    expect(state.get().count).toBe(1);

    // Cleanup
    dispose();
  });

  it('uses mocked state', async () => {
    const state = createSnapshot({ count: 0 });

    await withStateMock(state, { count: 99 }, async () => {
      // State is temporarily overridden
      // But this won't affect state directly since withStateMock uses runInScope
      await testWithMockedState();
    });

    // Original state unchanged
    expect(state.get().count).toBe(0);
  });
});
```

### Testing Subscriptions

```typescript
import { vi } from 'vitest';

it('notifies subscribers on change', async () => {
  const state = createSnapshot({ count: 0 });
  const listener = vi.fn();

  state.subscribe(listener);
  listener.mockClear();

  state.set({ count: 1 });
  await Promise.resolve(); // Wait for batched notification

  expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
});
```

## 🎯 API Reference

### `createSnapshot<T>(initialState: T, options?: StateOptions<T>): State<T>`

Creates a new state instance.

**Options:**

- `name?: string` – Optional name for debugging
- `equals?: EqualityFn<T>` – Custom equality function

### `State<T>`

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

- `createChild(patch?: Partial<T>): State<T>` – Create independent child state
- `runInScope<R>(fn: (scopedState: State<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R>` – Execute with scoped state

### Utility Functions

- `shallowEqual(a: unknown, b: unknown): boolean` – Shallow equality check
- `shallowMerge<T>(state: T, patch: Partial<T>): T` – Shallow merge

### Testing Helpers

- `createTestState<T>(baseState?: State<T>, patch?: Partial<T>)` – Create test state
- `withStateMock<T, R>(baseState: State<T>, patch: Partial<T>, fn: () => R | Promise<R>): Promise<R>` – Temporary state override

## TypeScript Support

Fully typed with comprehensive type inference:

```typescript
const state = createSnapshot({ count: 0, name: 'test' });

// Type inferred: { count: number; name: string }
const current = state.get();

// Type-safe selectors
state.subscribe(
  (state) => state.count, // Type: number
  (count) => {
    // count is typed as number
  },
);

// Compile-time error for invalid keys
state.set({ invalid: true }); // ❌ Type error
```

## FAQ

### When should I use snapit?

Use snapit when you need:

- Simple, predictable state management
- Framework-agnostic solution
- Type-safe state updates
- Fine-grained subscription control
- Minimal bundle size impact

### Can I use multiple states?

Yes! Create as many states as needed:

```typescript
const authStore = createSnapshot({ user: null });
const themeStore = createSnapshot({ mode: 'light' });
const dataStore = createSnapshot({ items: [] });
```

### How does batching work?

State changes within the same synchronous tick are automatically batched:

```typescript
state.set({ count: 1 });
state.set({ count: 2 });
state.set({ count: 3 });
// Subscribers called once with final state
```

### Can I use this with Redux DevTools?

While snapit doesn't have built-in DevTools support, you can implement it via observers:

```typescript
state.subscribe((state, prev) => {
  window.__REDUX_DEVTOOLS_EXTENSION__?.send({
    type: 'STATE_UPDATE',
    payload: state,
  });
});
```

### Is it production-ready?

Yes! snapit is:

- ✅ Fully tested (49 tests, 100% coverage)
- ✅ Type-safe
- ✅ Zero dependencies
- ✅ Battle-tested patterns

## 📖 Documentation

- [**Full Documentation**](https://helmuthdu.github.io/vielzeug/snapit)
- [**Usage Guide**](https://helmuthdu.github.io/vielzeug/snapit/usage)
- [**API Reference**](https://helmuthdu.github.io/vielzeug/snapit/api)
- [**Examples**](https://helmuthdu.github.io/vielzeug/snapit/examples)

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
