<PackageBadges package="stateit" />

<img src="/logo-stateit.svg" alt="Stateit Logo" width="156" class="logo-highlight"/>

# Stateit

**Stateit** is a tiny, framework-agnostic state management library for TypeScript. Build reactive applications with simple, powerful, and type-safe state management.

## What Problem Does Stateit Solve?

Managing application state across components and frameworks can be complex – you need reactivity, subscriptions, state updates, and performance optimization. Stateit provides a minimal, framework-agnostic solution that works everywhere.

**Traditional Approach**:

```ts
// Manual state management
let state = { count: 0, user: null };
const listeners = [];

function setState(updates) {
  state = { ...state, ...updates };
  listeners.forEach((fn) => fn(state));
}

function subscribe(listener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
  };
}

// Manual subscription management
subscribe((state) => {
  console.log('State changed:', state);
});

setState({ count: 1 });
```

**With Stateit**:

```ts
import { createStore } from '@vielzeug/stateit';

const store = createStore({ count: 0, user: null });

// Subscribe to changes
store.subscribe((state, prev) => {
  console.log('State changed:', state);
});

// Update state
store.set({ count: 1 });

// Selective subscriptions
store.subscribe(
  (state) => state.count,
  (count) => {
    console.log('Count:', count);
  },
);
```

### Comparison with Alternatives

| Feature              | Stateit                                               | Zustand   | Jotai     | Valtio  | Pinia     |
| -------------------- | ----------------------------------------------------- | --------- | --------- | ------- | --------- |
| Bundle Size          | **~<PackageInfo package="stateit" type="size" />**    | ~1.1 KB   | ~3.0 KB   | ~5.4 KB | ~6.5 KB   |
| Dependencies         | <PackageInfo package="stateit" type="dependencies" /> | 1         | 0         | 1       | 1         |
| Framework            | **Agnostic**                                          | React     | React     | React   | Vue       |
| TypeScript           | Native                                                | Excellent | Excellent | Good    | Excellent |
| Selective Subs       | ✅                                                    | ✅        | ✅        | ✅      | ✅        |
| Async Updates        | ✅                                                    | ✅        | ✅        | ✅      | ✅        |
| Scoped Stores        | ✅                                                    | ❌        | ✅        | ❌      | ❌        |
| Custom Equality      | ✅                                                    | ✅        | ✅        | ❌      | ❌        |
| Testing Helpers      | ✅                                                    | ❌        | ❌        | ❌      | ❌        |
| DevTools Integration | ❌                                                    | ✅        | ✅        | ✅      | ✅        |

## When to Use Stateit

✅ **Use Stateit when you need:**

- Framework-agnostic state management
- Simple, predictable state updates
- Type-safe state and subscriptions
- Fine-grained subscription control
- Scoped/isolated state contexts
- Minimal bundle size impact
- Testing with isolated stores

❌ **Don't use Stateit when:**

- You need built-in DevTools integration
- You want framework-specific optimizations (use Zustand/Pinia)
- You need computed/derived state with automatic dependencies
- You want time-travel debugging out of the box

## 🚀 Key Features

- **Async Support**: First-class support for [async state updates](./usage.md#async-state-updates)
- **Batched Updates**: Automatic notification batching for [optimal performance](./usage.md#performance-tips).
- **Custom Equality**: Configurable [equality checks](./usage.md#custom-equality) for fine-grained control
- **Framework Agnostic**: Works with React, Vue, Svelte, or vanilla JS. See [Common Patterns](./usage.md#common-patterns).
- **Lightweight & Fast**: <PackageInfo package="stateit" type="dependencies" /> dependencies and only **<PackageInfo package="stateit" type="size" /> gzipped**.
- **Reactive Subscriptions**: [Subscribe](./usage.md#subscriptions) to full state or selected slices.
- **Scoped Stores**: Create [child stores](./usage.md#scoped-stores) for isolated state management
- **Testing Friendly**: Built-in testing helpers and utilities.
- **Type-Safe**: Full TypeScript support with [precise type inference](./usage.md#type-safety).

## 🏁 Quick Start

### Installation

::: code-group

```sh [npm]
npm install @vielzeug/stateit
```

```sh [yarn]
yarn add @vielzeug/stateit
```

```sh [pnpm]
pnpm add @vielzeug/stateit
```

:::

### Basic Store

```ts
import { createStore } from '@vielzeug/stateit';

// Create a store
const counter = createStore({ count: 0 });

// Read state
console.log(counter.get().count); // 0

// Subscribe to changes
counter.subscribe((state, prev) => {
  console.log(`Count: ${prev.count} → ${state.count}`);
});

// Update state
counter.set({ count: 1 });

// Update with function
await counter.set((state) => ({
  ...state,
  count: state.count + 1,
}));
```

## 📚 Core Concepts

### Store Creation

Create stores with optional configuration:

```ts
// Simple store
const userStore = createStore({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
});

// Named store (useful for debugging)
const appStore = createStore({ theme: 'dark', language: 'en' }, { name: 'appSettings' });

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

Access state with type-safe methods:

```ts
// Get current state snapshot
const state = store.get();

// Access properties
console.log(state.name);
console.log(state.age);
```

### Updating State

Multiple ways to update state:

```ts
// Replace entire state
store.set({ name: 'Bob', age: 25, email: 'bob@example.com' });

// Merge partial state (shallow merge)
store.set({ age: 31 });

// Update with function (sync)
await store.set((state) => ({
  ...state,
  age: state.age + 1,
}));

// Update with function (async)
await store.set(async (state) => {
  const user = await fetchUser(state.id);
  return { ...state, ...user };
});

// Reset to initial state
store.reset();
```

### Subscriptions

Subscribe to state changes:

```ts
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

Create isolated state contexts:

```ts
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

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Store creation, subscriptions, and scoped stores
- **[API Reference](./api.md)**: Complete list of all available methods and types
- **[Examples](./examples.md)**: Practical patterns and framework integrations
- **[Interactive REPL](/repl)**: Try it in your browser

## ❓ FAQ

### Can I use multiple stores?

Yes! Create as many stores as you need:

```ts
const authStore = createStore({ user: null, token: null });
const themeStore = createStore({ mode: 'light', sidebarOpen: false });
const dataStore = createStore({ items: [], isLoading: false });
```

### How does batching work?

State changes within the same synchronous tick are automatically batched:

```ts
store.set({ count: 1 });
store.set({ count: 2 });
store.set({ count: 3 });
// Subscribers called once with final state (count: 3)
```

### Can I use this with Redux DevTools?

While Stateit doesn't have built-in DevTools support, you can implement it via observers:

```ts
store.subscribe((state, prev) => {
  window.__REDUX_DEVTOOLS_EXTENSION__?.send({
    type: 'STATE_UPDATE',
    payload: state,
  });
});
```

### How do I handle computed values?

Use framework-specific solutions or subscriptions:

```ts
// With subscriptions
let doubleCount = 0;
store.subscribe(
  (state) => state.count * 2,
  (value) => {
    doubleCount = value;
  },
);

// Or derive on-demand
function getDoubleCount() {
  return store.get().count * 2;
}

// In React
const doubleCount = useMemo(() => state.count * 2, [state.count]);

// In Vue
const doubleCount = computed(() => state.value.count * 2);
```

### Is it production-ready?

Yes! Stateit is:

- ✅ Fully tested (49 tests, 100% coverage)
- ✅ Type-safe with comprehensive type inference
- ✅ Zero dependencies
- ✅ Battle-tested patterns from other state libraries
- ✅ Used in production applications

## 🐛 Troubleshooting

### Subscribers not being called

Make sure you're waiting for the microtask to complete:

```ts
store.set({ count: 1 });
await Promise.resolve(); // Wait for batched notification

// Or in tests
await new Promise((resolve) => setTimeout(resolve, 0));
```

### State not updating in React

Make sure you're using the subscription properly:

```ts
// ❌ Wrong – reading once
const state = store.get();

// ✅ Correct – using subscription
const state = useSyncExternalStore(
  (callback) => store.subscribe(callback),
  () => store.get(),
);
```

### TypeScript errors with state updates

Make sure your updates match the state type:

```ts
type State = { count: number; name: string };
const store = createStore<State>({ count: 0, name: 'test' });

store.set({ count: 1 }); // ✅ Valid
store.set({ invalid: true }); // ❌ Type error
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md) for details.

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/stateit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/stateit/CHANGELOG.md)
