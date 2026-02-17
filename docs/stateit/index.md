<PackageBadges package="stateit" />

<img src="/logo-stateit.svg" alt="Stateit Logo" width="156" class="logo-highlight"/>

# Stateit

**Stateit** is a tiny, framework-agnostic state management library. Build reactive applications with simple, powerful state handling—all in just **<PackageInfo package="stateit" type="size" />** gzipped.

## What Problem Does Stateit Solve?

State management libraries are often complex or framework-specific. Redux requires boilerplate, MobX has a learning curve, and Zustand is React-only. Stateit provides simple, reactive state with zero dependencies and works everywhere.

**Traditional Approach**:

```ts
// Manual state management with subscriptions
class StateManager {
  private state = {};
  private listeners = new Set();

  get() {
    return this.state;
  }

  set(newState) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**With Stateit**:

```ts
import { createState } from '@vielzeug/stateit';

const state = createState({ count: 0, user: null });

// Subscribe to changes
state.subscribe((curr, prev) => {
  console.log('State changed:', curr);
});

// Update state
state.set({ count: 1 });
state.set((current) => ({ count: current.count + 1 }));

// Read state
const current = state.get();
```

### Comparison with Alternatives

| Feature              | Stateit                                               | Zustand        | Jotai          | Valtio     | Pinia          |
| -------------------- | ----------------------------------------------------- | -------------- | -------------- | ---------- | -------------- |
| Bundle Size          | **~<PackageInfo package="stateit" type="size" />**    | ~3.5 KB        | ~6.5 KB        | ~5.8 KB    | ~35 KB         |
| Dependencies         | <PackageInfo package="stateit" type="dependencies" /> | 1              | 0              | 1          | 1              |
| TypeScript           | ✅ First-class                                        | ✅ First-class | ✅ First-class | ✅ Good    | ✅ First-class |
| Framework            | Agnostic                                              | React only     | React only     | React only | Vue only       |
| Async Updates        | ✅ Yes                                                | ✅ Yes         | ✅ Yes         | ✅ Yes     | ✅ Yes         |
| Computed Values      | ✅ Yes                                                | ❌             | ✅ Yes         | ✅ Yes     | ✅ Yes         |
| Transactions         | ✅ Yes                                                | ❌             | ❌             | ❌         | ❌             |
| Custom Equality      | ✅ Yes                                                | ✅ Yes         | ✅ Yes         | ❌         | ❌             |
| DevTools Integration | ❌                                                    | ✅ Yes         | ✅ Yes         | ✅ Yes     | ✅ Yes         |
| Scoped Stores        | ✅ Yes                                                | ❌             | ✅ Yes         | ❌         | ❌             |
| Selective Subs       | ✅ Yes                                                | ✅ Yes         | ✅ Yes         | ✅ Yes     | ✅ Yes         |
| Testing Helpers      | ✅ Yes                                                | ❌             | ❌             | ❌         | ❌             |

## When to Use Stateit

**✅ Use Stateit when you:**

- Need lightweight state management (<PackageInfo package="stateit" type="size" /> gzipped)
- Want a framework-agnostic state that works with React, Vue, Svelte, or vanilla JS
- Need type-safe state with full TypeScript inference
- Want selective subscriptions to avoid unnecessary re-renders
- Need async state updates with proper batching
- Want scoped states for testing or isolated contexts
- Prefer zero dependencies and minimal bundle size

**❌ Consider alternatives when you:**

- Need React-specific hooks out of the box (use Zustand or Jotai)
- Need a complex middleware system (use Redux)
- Need proxy-based reactivity (use Valtio or MobX)
- Building a simple app with minimal state needs

## 🚀 Key Features

- **Type-Safe** – Full TypeScript support with precise type inference
- **Reactive Subscriptions** – [Selective subscriptions](./usage.md#subscriptions) with automatic change detection
- **Computed Values** – [Cached derived values](./usage.md#computed-values) that update automatically
- **Transactions** – [Batch multiple updates](./usage.md#transactions) for optimal performance
- **Scoped States** – [Child states](./usage.md#scoped-states) and isolated execution contexts
- **Custom Equality** – Configurable [equality checks](./usage.md#custom-equality) for fine-grained control
- **Async Support** – First-class support for [async state updates](./usage.md#async-state-updates)
- **Batched Updates** – Automatic notification batching for optimal performance
- **Framework Agnostic** – Works with React, Vue, Svelte, or vanilla JS
- **Lightweight** – **<PackageInfo package="stateit" type="size" />** gzipped, zero dependencies
- **Testing Helpers** – Built-in [testing utilities](./usage.md#testing) for easy unit tests

## 🏁 Quick Start

### Basic Usage

```ts
import { createState } from '@vielzeug/stateit';

// Create state
const counter = createState({ count: 0 });

// Read state
console.log(counter.get().count); // 0

// Subscribe to changes
counter.subscribe((curr, prev) => {
  console.log(`Count changed from ${prev.count} to ${curr.count}`);
});

// Update state – partial merge
counter.set({ count: 1 });

// Update with function
counter.set((data) => ({ count: data.count + 1 }));

// Update with async function
await counter.set(async (data) => {
  const res = await fetchData();
  return { ...data, res };
});
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for detailed features and patterns
- Check [Examples](./examples.md) for framework integrations (React, Vue, Svelte)
- Read [API Reference](./api.md) for complete type definitions
  :::

## 🎓 Core Concepts

### State Creation

Create state with initial values and optional configuration:

```ts
import { createState } from '@vielzeug/stateit';

// Simple state
const userState = createState({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
});

// Named state (useful for debugging)
const appState = createState({ theme: 'dark', language: 'en' }, { name: 'appSettings' });

// Custom equality function
const todoState = createState(
  { todos: [], filter: 'all' },
  {
    equals: (a, b) => {
      return a.todos === b.todos && a.filter === b.filter;
    },
  },
);
```

Learn more in [State Creation](./usage.md#state-creation).

### Reading State

Access state with `get()` for one-time reads or selectors:

```ts
// Get current state snapshot
const current = state.get();
console.log(current.count);

// Get selected value
const count = state.get((data) => data.count);

// Get computed value
const fullName = state.get((s) => `${s.firstName} ${s.lastName}`);
```

See [Reading State](./usage.md#reading-state) for more patterns.

### Updating State

Update state with partial objects or updater functions:

```ts
// Partial merge
state.set({ count: 1 });

// Sync updater
state.set((current) => ({ count: current.count + 1 }));

// Async updater
await state.set(async (current) => {
  const data = await fetchData();
  return { ...current, data };
});

// Reset to initial state
state.reset();
```

Learn about [Updating State](./usage.md#updating-state).

### Subscriptions

Subscribe to state changes with full or selective subscriptions:

```ts
// Subscribe to all changes
const unsubscribe = state.subscribe((curr, prev) => {
  console.log('State changed:', curr);
});

// Subscribe to specific field
state.subscribe(
  (data) => data.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// Custom equality
state.subscribe(
  (data) => data.items,
  (items) => console.log('Items changed:', items),
  { equality: (a, b) => a.length === b.length },
);

// Cleanup
unsubscribe();
```

Read more about [Subscriptions](./usage.md#subscriptions).

### Scoped States

Create isolated child states for testing or temporary contexts:

```ts
// Create independent child state
const childState = state.createChild({ isDraft: true });

childState.set({ name: 'Modified' });
console.log(childState.get().name); // "Modified"
console.log(state.get().name); // Original value (unchanged)

// Run code in isolated scope
await state.runInScope(
  async (scopedState) => {
    scopedState.set({ count: 999 });
    await doSomething();
  },
  { isTemporary: true },
);

console.log(state.get().count); // Original value (unchanged)
```

Explore [Scoped States](./usage.md#scoped-states).

## ❓ FAQ

### **Q: How do I use stateit with React?**

Use `useSyncExternalStore` for React 18+:

```ts
import { useSyncExternalStore } from 'react';
import { createState, type State } from '@vielzeug/stateit';

function useStateitState<T extends object>(state: State<T>): T;
function useStateitState<T extends object, U>(state: State<T>, selector: (state: T) => U): U;
function useStateitState<T extends object, U>(state: State<T>, selector?: (state: T) => U) {
  return useSyncExternalStore(
    (callback) => {
      if (selector) {
        return state.subscribe(selector, callback);
      }
      return state.subscribe(callback);
    },
    () => (selector ? selector(state.get()) : state.get()),
  );
}
```

See [React Integration](./examples.md#react) for more details.

### **Q: How do I persist state to localStorage?**

Create a middleware pattern:

```ts
function withPersistence<T extends object>(state: State<T>, key: string) {
  // Load from localStorage
  const saved = localStorage.getItem(key);
  if (saved) {
    state.set(JSON.parse(saved));
  }

  // Save on changes
  state.subscribe((current) => {
    localStorage.setItem(key, JSON.stringify(current));
  });

  return state;
}

const state = withPersistence(createState({ count: 0 }), 'counter');
```

### **Q: How do I test components using stateit?**

Use the testing helpers:

```ts
import { createTestState, withStateMock } from '@vielzeug/stateit';

it('increments count', () => {
  const { state, dispose } = createTestState(null, { count: 0 });

  state.set({ count: 1 });
  expect(state.get().count).toBe(1);

  dispose();
});
```

See [Testing](./usage.md#testing) for more patterns.

### **Q: How do I handle async state updates?**

Use async updater functions:

```ts
const state = createState({ data: null, loading: false });

await state.set(async (current) => {
  const response = await fetch('/api/data');
  const data = await response.json();
  return { ...current, data, loading: false };
});
```

### **Q: Can I use multiple states together?**

Yes! Create separate states and compose them:

```ts
const authState = createState({ user: null, token: null });
const cartState = createState({ items: [] });
const uiState = createState({ theme: 'light' });

// Subscribe to changes across states
authState.subscribe((auth) => {
  if (!auth.user) {
    cartState.set({ items: [] }); // Clear cart on logout
  }
});
```

## 🐛 Troubleshooting

### State not updating after set()

::: danger Problem
Calling `set()` but UI doesn't update.
:::

::: tip Solution
Make sure you're subscribing to changes. State updates are batched asynchronously:

```ts
state.subscribe((current) => {
  // This will be called after batched updates
  updateUI(current);
});

state.set({ count: 1 });
await Promise.resolve(); // Wait for batched notification
```

:::

### Selective subscription not triggering

::: danger Problem
Subscription with selector doesn't trigger when expected.
:::

::: tip Solution
Check your equality function. By default, `shallowEqual` is used:

```ts
// This may not trigger if items array reference is the same
state.subscribe(
  (data) => data.items,
  (items) => console.log(items),
);

// Use custom equality to trigger on length changes
state.subscribe(
  (data) => data.items,
  (items) => console.log(items),
  { equality: (a, b) => a.length === b.length },
);
```

:::

### Memory leaks with subscriptions

::: danger Problem
Subscriptions not being cleaned up.
:::

::: tip Solution
Always unsubscribe when done:

```ts
// Store unsubscribe function
const unsubscribe = state.subscribe(callback);

// Clean up when component unmounts or effect cleanup
return () => {
  unsubscribe();
};
```

:::

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/stateit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/stateit/CHANGELOG.md)

---

> **Tip:** Stateit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for forms, i18n, HTTP clients, routing, and more.
