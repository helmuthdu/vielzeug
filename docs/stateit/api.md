# Stateit API Reference

Complete API documentation for @vielzeug/stateit.

## Table of Contents

[[toc]]

## Factory Functions

### createStore()

Creates a new store with the given initial state.

#### Signature

```ts
function createStore<T extends object>(initialState: T, options?: StoreOptions<T>): Store<T>;
```

#### Parameters

- `initialState: T` – Initial state object
- `options?: StoreOptions<T>` – Optional configuration

```ts
type StoreOptions<T> = {
  name?: string; // Optional name for debugging
  equals?: EqualityFn<T>; // Custom equality function
};

type EqualityFn<T> = (a: T, b: T) => boolean;
```

#### Returns

A new `Store<T>` instance

#### Example

```ts
// Simple store
const counterStore = createStore({ count: 0 });

// Named store
const userStore = createStore({ name: 'Alice', age: 30 }, { name: 'userStore' });

// Custom equality
const todoStore = createStore(
  { todos: [], filter: 'all' },
  {
    equals: (a, b) => {
      return a.todos === b.todos && a.filter === b.filter;
    },
  },
);
```

---

### createTestStore()

Creates a test store for isolated testing.

#### Signature

```ts
function createTestStore<T extends object>(
  baseStore?: Store<T>,
  patch?: Partial<T>,
): {
  store: Store<T>;
  dispose: () => void;
};
```

#### Parameters

- `baseStore?: Store<T>` – Optional base store to create child from
- `patch?: Partial<T>` – Optional partial state for test store

#### Returns

Object with store instance and dispose function

#### Example

```ts
const { store: testStore, dispose } = createTestStore(baseStore, { count: 42 });

// Run tests
expect(testStore.get().count).toBe(42);

// Cleanup
dispose();
```

---

### withMock()

Temporarily overrides store state for the duration of a function.

#### Signature

```ts
function withMock<T extends object, R>(baseStore: Store<T>, patch: Partial<T>, fn: () => R | Promise<R>): Promise<R>;
```

#### Parameters

- `baseStore: Store<T>` – Base store to derive from
- `patch: Partial<T>` – Temporary state override
- `fn: () => R | Promise<R>` – Function to execute with overridden state

#### Returns

Promise resolving to function result

#### Example

```ts
await withMock(store, { count: 77 }, async () => {
  // Inside this scope, store appears to have count: 77
  await testWithMockedState();
});

// Original state unchanged
console.log(store.get().count); // Original value
```

## Store Class

### Methods

#### get()

Gets the current state snapshot or a selected slice.

##### Signature

```ts
get(): T;
get<U>(selector: (state: T) => U): U;
```

##### Parameters

- `selector?: (state: T) => U` – Optional function to select a slice of state

##### Returns

Current state object or selected value

##### Example

```ts
// Get full state
const state = store.get();
console.log(state.count);

// Get selected value
const count = store.get((state) => state.count);

// Get nested property
const userName = store.get((state) => state.user.name);

// Get computed value
const isAdult = store.get((state) => state.age >= 18);
```

---

#### set()

Updates state with partial merge, sync function, or async function.

##### Signature

```ts
set(patch: Partial<T>): void;
set(updater: (state: T) => T): void;
set(updater: (state: T) => Promise<T>): Promise<void>;
```

##### Parameters

- `patch: Partial<T>` – Partial state to merge (shallow)
- `updater: (state: T) => T | Promise<T>` – Function that receives current state and returns new state

##### Returns

`void` for sync updates, `Promise<void>` for async updates

##### Example

```ts
// Partial merge
store.set({ count: 1 });

// Sync function
store.set((state) => ({
  ...state,
  count: state.count + 1,
}));

// Async function
await store.set(async (state) => {
  const data = await fetchData();
  return { ...state, data };
});
```

---

#### reset()

Resets state to the initial value provided during construction.

##### Signature

```ts
reset(): void;
```

##### Example

```ts
store.reset(); // Reverts to initial state
```

---

#### subscribe() – Full State

Subscribes to all state changes.

##### Signature

```ts
subscribe(listener: Subscriber<T>): Unsubscribe;
```

##### Parameters

- `listener: Subscriber<T>` – Callback for state changes

```ts
type Subscriber<T> = (state: T, prev: T) => void;
type Unsubscribe = () => void;
```

##### Returns

Unsubscribe function

##### Example

```ts
const unsubscribe = store.subscribe((state, prev) => {
  console.log('State changed:', state);
});

// Unsubscribe
unsubscribe();
```

---

#### subscribe() – Selective

Subscribes to a selected slice of state.

##### Signature

```ts
subscribe<U>(
  selector: Selector<T, U>,
  listener: Subscriber<U>,
  options?: { equality?: EqualityFn<U> }
): Unsubscribe;
```

##### Parameters

- `selector: Selector<T, U>` – Function to select a slice of state
- `listener: Subscriber<U>` – Callback for selected value changes
- `options?: { equality?: EqualityFn<U> }` – Optional equality function

```ts
type Selector<T, U> = (state: T) => U;
```

##### Returns

Unsubscribe function

##### Example

```ts
// Subscribe to specific field
const unsubscribe = store.subscribe(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// With custom equality
store.subscribe(
  (state) => state.items,
  (items) => {
    console.log('Items changed:', items);
  },
  {
    equality: (a, b) => a.length === b.length,
  },
);
```

---

#### createChild()

Creates a child store initialized with current state and optional patch.

##### Signature

```ts
createChild(patch?: Partial<T>): Store<T>;
```

##### Parameters

- `patch?: Partial<T>` – Optional partial state to merge into child's initial state

##### Returns

New independent store instance

##### Example

```ts
const childStore = store.createChild({ isDraft: true });

childStore.set({ name: 'Bob' }); // Doesn't affect parent
console.log(store.get().name); // Original value
```

---

#### runInScope()

Executes a function with a scoped child store.

##### Signature

```ts
runInScope<R>(
  fn: (scopedStore: Store<T>) => R | Promise<R>,
  patch?: Partial<T>
): Promise<R>;
```

##### Parameters

- `fn: (scopedStore: Store<T>) => R | Promise<R>` – Function to execute with scoped store
- `patch?: Partial<T>` – Optional partial state for child store

##### Returns

Promise resolving to function result

##### Example

```ts
await store.runInScope(
  async (scopedStore) => {
    scopedStore.set({ count: 999 });
    console.log(scopedStore.get()); // Scoped changes
    await doSomething();
  },
  { isDraft: true },
);

console.log(store.get()); // Parent unchanged
```

## Utility Functions

### shallowEqual()

Performs shallow equality check between two values.

#### Signature

```ts
function shallowEqual(a: unknown, b: unknown): boolean;
```

#### Parameters

- `a: unknown` – First value to compare
- `b: unknown` – Second value to compare

#### Returns

True if values are shallowly equal

#### Example

```ts
import { shallowEqual } from '@vielzeug/stateit';

shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
shallowEqual({ a: 1 }, { a: 2 }); // false
shallowEqual([1, 2, 3], [1, 2, 3]); // true
```

---

### shallowMerge()

Performs shallow merge of a patch into state.

#### Signature

```ts
function shallowMerge<T extends object>(state: T, patch: Partial<T>): T;
```

#### Parameters

- `state: T` – Original state object
- `patch: Partial<T>` – Partial state to merge

#### Returns

New state object with merged values

#### Example

```ts
import { shallowMerge } from '@vielzeug/stateit';

const state = { a: 1, b: 2 };
const result = shallowMerge(state, { b: 3, c: 4 });
// { a: 1, b: 3, c: 4 }
```

## Type Definitions

### Store

Main store class type.

```ts
class Store<T extends object> {
  get(): T;
  getName(): string | undefined;
  replace(nextState: T): void;
  set(patch: Partial<T>): void;
  update(updater: (state: T) => T | Promise<T>): Promise<void>;
  reset(): void;
  subscribe(listener: Subscriber<T>): Unsubscribe;
  subscribe<U>(selector: Selector<T, U>, listener: Subscriber<U>, options?: { equality?: EqualityFn<U> }): Unsubscribe;
  observe(observer: Subscriber<T>): Unsubscribe;
  createChild(patch?: Partial<T>): Store<T>;
  runInScope<R>(fn: (scopedStore: Store<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R>;
}
```

---

### Subscriber

Callback type for state changes.

```ts
type Subscriber<T> = (state: T, prev: T) => void;
```

---

### Selector

Function type for selecting state slices.

```ts
type Selector<T, U> = (state: T) => U;
```

---

### Unsubscribe

Function type for unsubscribing from state changes.

```ts
type Unsubscribe = () => void;
```

---

### EqualityFn

Function type for custom equality checks.

```ts
type EqualityFn<T> = (a: T, b: T) => boolean;
```

---

### StoreOptions

Configuration options for creating stores.

```ts
type StoreOptions<T> = {
  /** Optional name for debugging/logging */
  name?: string;
  /** Custom equality function (default: shallowEqual) */
  equals?: EqualityFn<T>;
};
```

## Behavior Notes

### Subscription Timing

- `subscribe()` is called **immediately** with the current state when you subscribe
- `observe()` is **NOT** called immediately – only on subsequent changes
- Both are called asynchronously (next microtask) when state changes

### Batched Updates

State changes within the same synchronous tick are automatically batched:

```ts
store.set({ count: 1 });
store.set({ count: 2 });
store.set({ count: 3 });
// Subscribers called once with final state (count: 3)
```

### Equality Checks

- Default equality is `shallowEqual` (compares object properties)
- Can be customized via `StoreOptions.equals` for the entire store
- Can be customized per selector subscription via `options.equality`
- Only triggers notifications if equality check returns `false`

### Error Handling

- Listener errors are swallowed to prevent breaking other listeners
- State update errors propagate to the caller
- Async update errors propagate via rejected Promise

### Memory Management

- Always unsubscribe when components unmount to avoid memory leaks
- Child stores don't affect parent stores
- Scoped stores are garbage collected after execution
- Use `dispose()` from test helpers for cleanup
