# Stateit Usage Guide

Complete guide to using stateit in your projects.

::: tip 💡 API Reference
This guide covers usage patterns and examples. For complete type definitions, see [API Reference](./api.md).
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
import { createState } from '@vielzeug/stateit';

// Optional: Import types and utilities
import type { State, StateOptions, Listener, Selector } from '@vielzeug/stateit';
import { shallowEqual, shallowMerge } from '@vielzeug/stateit';
```

## State Creation

### Basic State

```ts
import { createState } from '@vielzeug/stateit';

const counterState = createState({ count: 0 });

console.log(counterState.get()); // { count: 0 }
```

### Named State

Add a name for debugging purposes:

```ts
const userState = createState(
  { name: 'Alice', age: 30 },
  { name: 'userState' }
);

// Useful in DevTools or debugging
```

### Custom Equality

Control when updates trigger notifications:

```ts
const todoState = createState(
  { todos: [], filter: 'all' },
  {
    name: 'todoState',
    equals: (a, b) => {
      // Only notify if todos array reference or filter changed
      return a.todos === b.todos && a.filter === b.filter;
    },
  }
);

// Won't trigger notifications for same reference
todoState.set({ todos: todoState.get().todos }); // No notification
```

### TypeScript Support

Full type inference:

```ts
const state = createState({
  count: 0,
  user: { name: 'Alice', age: 30 },
  items: ['a', 'b', 'c'],
});

// TypeScript knows the exact shape
type StateType = {
  count: number;
  user: { name: string; age: number };
  items: string[];
};

// Type-safe access
const count: number = state.get().count;
const userName: string = state.get().user.name;
```

## Reading State

### Get Current State

```ts
const state = createState({ count: 0, name: 'Alice' });

// Get full state
const current = state.get();
console.log(current); // { count: 0, name: 'Alice' }

// Access properties
console.log(current.count); // 0
console.log(current.name); // "Alice"
```

### Get with Selector

Read a derived or selected value without subscribing:

```ts
const userState = createState({
  firstName: 'Alice',
  lastName: 'Johnson',
  age: 30,
  address: {
    city: 'New York',
    country: 'USA',
  },
});

// Get computed value
const fullName = userState.get((state) => `${state.firstName} ${state.lastName}`);
console.log(fullName); // "Alice Johnson"

// Get nested property
const city = userState.get((state) => state.address.city);
console.log(city); // "New York"

// Get multiple derived values
const summary = userState.get((state) => ({
  name: `${state.firstName} ${state.lastName}`,
  location: `${state.address.city}, ${state.address.country}`,
  isAdult: state.age >= 18,
}));
console.log(summary);
// { name: "Alice Johnson", location: "New York, USA", isAdult: true }
```

## Updating State

### Partial Object Merge

Shallow merge a partial object:

```ts
const state = createState({ count: 0, name: 'Alice', age: 30 });

// Merge partial update
state.set({ count: 1 });
console.log(state.get()); // { count: 1, name: 'Alice', age: 30 }

// Update multiple fields
state.set({ count: 2, age: 31 });
console.log(state.get()); // { count: 2, name: 'Alice', age: 31 }
```

### Sync Updater Function

Update based on current state:

```ts
const state = createState({ count: 0 });

// Increment based on current value
state.set((current) => ({ count: current.count + 1 }));
console.log(state.get().count); // 1

// Complex update
state.set((current) => ({
  ...current,
  count: current.count * 2,
}));
console.log(state.get().count); // 2
```

### Async Updater Function

Handle async state updates:

```ts
const dataState = createState({
  data: null,
  loading: false,
  error: null,
});

// Async fetch
await dataState.set(async (current) => {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return { ...current, data, loading: false, error: null };
  } catch (error) {
    return { ...current, loading: false, error: error.message };
  }
});
```

### Reset to Initial State

```ts
const state = createState({ count: 0, name: 'Alice' });

state.set({ count: 10, name: 'Bob' });
console.log(state.get()); // { count: 10, name: 'Bob' }

state.reset();
console.log(state.get()); // { count: 0, name: 'Alice' }
```

## Subscriptions

### Subscribe to All Changes

```ts
const state = createState({ count: 0, name: 'Alice' });

const unsubscribe = state.subscribe((current, prev) => {
  console.log('State changed:');
  console.log('Previous:', prev);
  console.log('Current:', current);
});

state.set({ count: 1 });
// Logs:
// State changed:
// Previous: { count: 0, name: 'Alice' }
// Current: { count: 1, name: 'Alice' }

// Clean up
unsubscribe();
```

### Selective Subscription

Subscribe to specific fields or derived values:

```ts
const state = createState({
  count: 0,
  name: 'Alice',
  items: [1, 2, 3],
});

// Subscribe to count field only
state.subscribe(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count changed: ${prevCount} → ${count}`);
  }
);

state.set({ count: 1 }); // Triggers callback
state.set({ name: 'Bob' }); // Does NOT trigger callback

// Subscribe to array length
state.subscribe(
  (state) => state.items.length,
  (length, prevLength) => {
    console.log(`Length changed: ${prevLength} → ${length}`);
  }
);
```

### Custom Equality Function

Control when selective subscriptions trigger:

```ts
const state = createState({
  items: [{ id: 1, name: 'Item 1' }],
});

// Trigger only if array length changes
state.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items array changed:', items);
  },
  {
    equality: (a, b) => a.length === b.length,
  }
);

// Won't trigger (same length)
state.set({ items: [{ id: 2, name: 'Item 2' }] });

// Will trigger (different length)
state.set({ items: [{ id: 1 }, { id: 2 }] });
```

### Multiple Subscriptions

```ts
const state = createState({ count: 0, name: 'Alice' });

// Multiple subscribers work independently
const unsub1 = state.subscribe((current) => {
  console.log('Subscriber 1:', current.count);
});

const unsub2 = state.subscribe(
  (state) => state.name,
  (name) => {
    console.log('Subscriber 2:', name);
  }
);

state.set({ count: 1 }); // Both subscribers notified
state.set({ name: 'Bob' }); // Both subscribers notified

// Clean up individually
unsub1();
unsub2();
```

### Batched Updates

Updates are automatically batched for performance:

```ts
const state = createState({ count: 0, name: 'Alice' });

let notificationCount = 0;
state.subscribe(() => {
  notificationCount++;
});

// Multiple sync updates are batched
state.set({ count: 1 });
state.set({ count: 2 });
state.set({ count: 3 });

// Only one notification after microtask
await Promise.resolve();
console.log(notificationCount); // 1 (not 3)
```

## Scoped States

### Create Child State

Create an independent child state:

```ts
const parentState = createState({
  count: 0,
  name: 'Parent',
});

// Create child with override
const childState = parentState.createChild({
  name: 'Child',
});

console.log(parentState.get()); // { count: 0, name: 'Parent' }
console.log(childState.get());  // { count: 0, name: 'Child' }

// Mutations are independent
childState.set({ count: 10 });
console.log(childState.get().count);  // 10
console.log(parentState.get().count); // 0 (unchanged)
```

### Run in Scope

Execute code with a temporary scoped state:

```ts
const state = createState({ count: 0 });

const result = await state.runInScope(
  async (scopedState) => {
    // Scoped state starts with parent value
    console.log(scopedState.get().count); // 0

    // Modify scoped state
    scopedState.set({ count: 999 });
    console.log(scopedState.get().count); // 999

    // Do async work
    await doSomething();

    return 'completed';
  },
  { isTemporary: true } // Optional override
);

// Original state unchanged
console.log(state.get().count); // 0
console.log(result); // "completed"
```

### Use Cases for Scoped States

**Testing:**

```ts
it('calculates total', () => {
  const { state: testState, dispose } = createTestState(
    baseState,
    { items: [{ price: 10 }, { price: 20 }] }
  );

  const total = calculateTotal(testState.get());
  expect(total).toBe(30);

  dispose();
});
```

**Draft Mode:**

```ts
const originalState = createState({ title: 'Post', content: 'Hello' });

// Edit in draft mode
const draftState = originalState.createChild();

draftState.set({ content: 'Hello, World!' });

// Save or discard
if (userConfirms) {
  originalState.set(draftState.get());
}
```

## Custom Equality

### Default Shallow Equality

By default, `shallowEqual` is used:

```ts
import { shallowEqual } from '@vielzeug/stateit';

const a = { count: 1, name: 'Alice' };
const b = { count: 1, name: 'Alice' };

shallowEqual(a, b); // true (same values)
shallowEqual(a, a); // true (same reference)
```

### Custom Equality for State

```ts
const state = createState(
  { items: [], filter: 'all' },
  {
    equals: (a, b) => {
      // Custom deep equality for items
      return (
        a.filter === b.filter &&
        JSON.stringify(a.items) === JSON.stringify(b.items)
      );
    },
  }
);
```

### Custom Equality for Subscriptions

```ts
const state = createState({ items: [1, 2, 3] });

// Only notify if sum changes
state.subscribe(
  (state) => state.items.reduce((sum, n) => sum + n, 0),
  (sum) => console.log('Sum changed:', sum),
  {
    equality: (a, b) => a === b, // Strict equality
  }
);
```

## Async State Updates

### Loading Pattern

```ts
const state = createState({
  data: null,
  loading: false,
  error: null,
});

async function loadData() {
  // Set loading
  state.set({ loading: true, error: null });

  try {
    const data = await state.set(async (current) => {
      const response = await fetch('/api/data');
      const data = await response.json();
      return { ...current, data, loading: false };
    });
  } catch (error) {
    state.set({ error: error.message, loading: false });
  }
}
```

### Retry Pattern

```ts
async function fetchWithRetry(maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await state.set(async (current) => {
        const data = await fetchData();
        return { ...current, data, error: null };
      });
      return; // Success
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }

  state.set({ error: lastError.message });
}
```

### Optimistic Updates

```ts
const state = createState({ items: [] });

async function addItem(item) {
  // Optimistic update
  const previous = state.get();
  state.set({ items: [...previous.items, item] });

  try {
    await api.addItem(item);
  } catch (error) {
    // Rollback on error
    state.set(previous);
    throw error;
  }
}
```

## Testing

### Create Test State

```ts
import { createTestState } from '@vielzeug/stateit';

describe('Counter', () => {
  it('increments count', () => {
    const { state, dispose } = createTestState(null, { count: 0 });

    state.set({ count: 1 });
    expect(state.get().count).toBe(1);

    state.set((current) => ({ count: current.count + 1 }));
    expect(state.get().count).toBe(2);

    dispose();
  });
});
```

### Test with Base State

```ts
const baseState = createState({ count: 0, name: 'Base' });

it('inherits from base state', () => {
  const { state: testState, dispose } = createTestState(
    baseState,
    { count: 5 }
  );

  expect(testState.get().count).toBe(5);
  expect(testState.get().name).toBe('Base');

  // Base state unchanged
  expect(baseState.get().count).toBe(0);

  dispose();
});
```

### Mock State for Tests

**Important:** `withStateMock` does NOT actually mock the state that your code reads. It only creates a scoped child state for use within the callback function.

If you need to test code that depends on specific state values, you should **directly modify the state** before running your test:

```ts
const appState = createState({ user: null, isAdmin: false });

function renderAdminPanel() {
  // This function reads from appState
  const state = appState.get();
  
  if (state.isAdmin) {
    return '<div>Admin Panel</div>';
  }
  return '<div>Access Denied</div>';
}

it('shows admin panel for admin users', () => {
  // Set the state directly for your test
  appState.set({ user: { name: 'Admin' }, isAdmin: true });
  
  const result = renderAdminPanel();
  expect(result).toContain('Admin Panel');
  
  // Clean up after test
  appState.reset();
});
```

**When to use `withStateMock`:**

`withStateMock` is useful when you want to run code that **receives the state as a parameter** and you want to ensure the original state isn't modified:

```ts
import { withStateMock } from '@vielzeug/stateit';

const appState = createState({ count: 0, settings: { theme: 'light' } });

// This function receives state as a parameter
function processWithState(state: State<AppState>) {
  const current = state.get();
  // Do something with the state
  return current.count * 2;
}

it('processes data without affecting original state', async () => {
  await withStateMock(
    appState,
    { count: 10 },  // Mock value
    async () => {
      // Inside this callback, you could pass a scoped version
      // But in practice, withStateMock is rarely needed
      const result = processWithState(appState);
      expect(result).toBe(20);
    }
  );

  // Original state is unchanged
  expect(appState.get().count).toBe(0);
});
```

**Better Testing Pattern:**

For most testing scenarios, use `createTestState` instead:

```ts
import { createTestState } from '@vielzeug/stateit';

it('tests with isolated state', () => {
  // Create a completely isolated test state
  const { state: testState, dispose } = createTestState(
    null,
    { count: 0, isAdmin: true }
  );
  
  // Your code uses testState instead of the real state
  function checkAdmin(state: State<any>) {
    return state.get().isAdmin ? 'Admin' : 'User';
  }
  
  expect(checkAdmin(testState)).toBe('Admin');
  
  dispose();
});
```

**Practical Example:**

```ts
// Your application code
const userState = createState({ 
  name: '', 
  role: 'guest', 
  permissions: [] 
});

function hasPermission(permission: string): boolean {
  const state = userState.get();
  return state.permissions.includes(permission);
}

// Testing approach 1: Modify state directly (most common)
it('checks permissions correctly', () => {
  userState.set({ 
    name: 'Admin',
    role: 'admin',
    permissions: ['read', 'write', 'delete'] 
  });
  
  expect(hasPermission('write')).toBe(true);
  expect(hasPermission('execute')).toBe(false);
  
  userState.reset(); // Clean up
});

// Testing approach 2: Use isolated test state (better)
it('checks permissions with test state', () => {
  const { state: testState, dispose } = createTestState(null, {
    name: 'Admin',
    role: 'admin', 
    permissions: ['read', 'write', 'delete']
  });
  
  // Modify your function to accept state as parameter
  function hasPermissionInState(state: State<any>, permission: string): boolean {
    return state.get().permissions.includes(permission);
  }
  
  expect(hasPermissionInState(testState, 'write')).toBe(true);
  expect(hasPermissionInState(testState, 'execute')).toBe(false);
  
  dispose();
});
```

### Test Subscriptions

```ts
import { vi } from 'vitest';

it('notifies subscribers on change', async () => {
  const state = createState({ count: 0 });
  const listener = vi.fn();

  state.subscribe(listener);
  listener.mockClear(); // Clear initial call

  state.set({ count: 1 });
  await Promise.resolve(); // Wait for batched notification

  expect(listener).toHaveBeenCalledWith(
    { count: 1 },
    { count: 0 }
  );
  expect(listener).toHaveBeenCalledTimes(1);
});

it('cleans up subscriptions', () => {
  const state = createState({ count: 0 });
  const listener = vi.fn();

  const unsubscribe = state.subscribe(listener);
  listener.mockClear();

  unsubscribe();

  state.set({ count: 1 });
  expect(listener).not.toHaveBeenCalled();
});
```

## Advanced Patterns

### Middleware Pattern

```ts
function withLogging<T extends object>(state: State<T>) {
  state.subscribe((current, prev) => {
    console.log('State updated:', {
      from: prev,
      to: current,
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
  state.subscribe((current) => {
    localStorage.setItem(key, JSON.stringify(current));
  });

  return state;
}

// Compose middleware
const state = withLogging(
  withPersistence(
    createState({ count: 0 }),
    'counter-state'
  )
);
```

### Computed Values

```ts
const cartState = createState({
  items: [
    { id: 1, price: 10, quantity: 2 },
    { id: 2, price: 20, quantity: 1 },
  ],
});

// Subscribe to computed total
cartState.subscribe(
  (state) => state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ),
  (total) => {
    console.log('Cart total:', total);
  }
);

// Or get computed value on demand
const total = cartState.get((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);
```

### Multiple States Composition

```ts
const authState = createState({ user: null, token: null });
const cartState = createState({ items: [] });
const uiState = createState({ theme: 'light', sidebarOpen: false });

// Sync states
authState.subscribe((auth) => {
  if (!auth.user) {
    // Clear cart when user logs out
    cartState.set({ items: [] });
  }
});

uiState.subscribe(
  (state) => state.theme,
  (theme) => {
    document.body.className = theme;
  }
);
```

### Undo/Redo

```ts
const MAX_HISTORY = 50;

class UndoableState<T extends object> {
  private state: State<T>;
  private history: T[] = [];
  private historyIndex = -1;

  constructor(initialState: T) {
    this.state = createState(initialState);
    this.pushHistory(initialState);
  }

  get() {
    return this.state.get();
  }

  set(update: Partial<T> | ((current: T) => T)) {
    const newState = typeof update === 'function'
      ? update(this.state.get())
      : { ...this.state.get(), ...update };

    this.state.set(newState);
    this.pushHistory(newState);
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state.set(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state.set(this.history[this.historyIndex]);
    }
  }

  private pushHistory(state: T) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }
}
```

## Performance Tips

### Use Selective Subscriptions

```ts
// ❌ Bad - subscribes to entire state
state.subscribe((state) => {
  updateCountUI(state.count);
});

// ✅ Good - subscribes only to count
state.subscribe(
  (state) => state.count,
  (count) => {
    updateCountUI(count);
  }
);
```

### Custom Equality for Expensive Checks

```ts
const state = createState({ largeArray: [] });

// Only notify if length changes
state.subscribe(
  (state) => state.largeArray,
  (array) => processArray(array),
  {
    equality: (a, b) => a.length === b.length,
  }
);
```

### Batch Multiple Updates

```ts
// Updates are automatically batched
function updateMultiple() {
  state.set({ field1: 'a' });
  state.set({ field2: 'b' });
  state.set({ field3: 'c' });
  // Only one notification sent
}
```

### Avoid Unnecessary State

```ts
// ❌ Bad - storing derived data
const state = createState({
  items: [],
  itemCount: 0, // Derived from items.length
  total: 0,     // Derived from items
});

// ✅ Good - compute on demand
const state = createState({
  items: [],
});

const itemCount = state.get((s) => s.items.length);
const total = state.get((s) =>
  s.items.reduce((sum, item) => sum + item.price, 0)
);
```

## Best Practices

1. **Single Source of Truth** - Avoid duplicating state
2. **Immutable Updates** - Always return new objects/arrays
3. **Unsubscribe** - Clean up subscriptions to prevent memory leaks
4. **Type Safety** - Leverage TypeScript for safer state management
5. **Selective Subscriptions** - Subscribe only to what you need
6. **Meaningful Names** - Use descriptive state names for debugging
7. **Test with Helpers** - Use `createTestState` for isolated tests
8. **Batch Updates** - Let stateit handle batching automatically

