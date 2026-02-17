# Snapit API Reference

Complete API documentation for snapit.

## Table of Contents

[[toc]]

## Types

### Listener

```ts
type Listener<T> = (curr: T, prev: T) => void;
```

Callback function that receives current and previous state.

**Parameters:**

- **curr**: Current state after update
- **prev**: Previous state before update

**Example:**

```ts
const listener: Listener<{ count: number }> = (current, prev) => {
  console.log(`Count changed from ${prev.count} to ${current.count}`);
};
```

---

### Selector

```ts
type Selector<T, U> = (state: T) => U;
```

Function that selects a value from state.

**Parameters:**

- **state**: Current state

**Returns:** Selected value of type `U`

**Example:**

```ts
const selectCount: Selector<AppState, number> = (data) => data.count;
const selectFullName: Selector<UserState, string> = (data) => `${data.firstName} ${data.lastName}`;
```

---

### Unsubscribe

```ts
type Unsubscribe = () => void;
```

Function to unsubscribe from state changes.

**Example:**

```ts
const unsubscribe = state.subscribe(listener);
// Later...
unsubscribe();
```

---

### EqualityFn

```ts
type EqualityFn<U> = (a: U, b: U) => boolean;
```

Function to check equality between two values.

**Parameters:**

- **a**: First value
- **b**: Second value

**Returns:** `true` if values are equal

**Example:**

```ts
const arrayLengthEqual: EqualityFn<any[]> = (a, b) => a.length === b.length;
```

---

### StateOptions

```ts
type StateOptions<T> = {
  name?: string;
  equals?: EqualityFn<T>;
};
```

Configuration options for creating state.

**Properties:**

- **name** (optional): Name for debugging
- **equals** (optional): Custom equality function (defaults to `shallowEqual`)

**Example:**

```ts
const options: StateOptions<TodoState> = {
  name: 'todoState',
  equals: (a, b) => a.todos === b.todos && a.filter === b.filter,
};
```

---

### Computed

```ts
type Computed<U> = {
  get: () => U;
  subscribe: (listener: Listener<U>) => Unsubscribe;
};
```

Object returned by `state.computed()` containing a cached value and subscription method.

**Properties:**

- **get**: Function to retrieve current computed value
- **subscribe**: Function to subscribe to computed value changes

**Example:**

```ts
const state = createSnapshot({ count: 5 });
const doubled: Computed<number> = state.computed((s) => s.count * 2);

// Get computed value
const value = doubled.get(); // 10

// Subscribe to changes
const unsubscribe = doubled.subscribe((current, prev) => {
  console.log(`Doubled: ${prev} → ${current}`);
});
```

---

## Factory Function

### createSnapshot()

```ts
function createSnapshot<T extends object>(initialState: T, options?: StateOptions<T>): State<T>;
```

Creates a new state instance.

**Type Parameters:**

- **T**: State type (must extend object)

**Parameters:**

- **initialState**: Initial state value
- **options** (optional): Configuration options

**Returns:** `State<T>` instance

**Examples:**

```ts
// Simple state
const counter = createSnapshot({ count: 0 });

// With name
const user = createSnapshot({ name: 'Alice' }, { name: 'userState' });

// With custom equality
const todos = createSnapshot(
  { items: [] },
  {
    equals: (a, b) => a.items.length === b.items.length,
  },
);
```

---

## State Class

### State\<T\>

Main state management class.

---

### get()

Get current state or selected value.

#### Overload 1: Get Full State

```ts
get(): T;
```

**Returns:** Current state snapshot

**Example:**

```ts
const current = state.get();
console.log(current.count);
```

#### Overload 2: Get Selected Value

```ts
get<U>(selector: Selector<T, U>): U;
```

**Type Parameters:**

- **U**: Selected value type

**Parameters:**

- **selector**: Function to select value from state

**Returns:** Selected value

**Example:**

```ts
const count = state.get((s) => s.count);
const fullName = state.get((s) => `${s.firstName} ${s.lastName}`);
```

---

### set()

Update state with partial object or updater function.

#### Overload 1: Partial Object

```ts
set(patch: Partial<T>): void;
```

**Parameters:**

- **patch**: Partial state object to merge

**Example:**

```ts
state.set({ count: 1 });
state.set({ count: 2, name: 'Bob' });
```

#### Overload 2: Sync Updater

```ts
set(updater: (state: T) => T): void;
```

**Parameters:**

- **updater**: Function that receives current state and returns new state

**Example:**

```ts
state.set((current) => ({ ...current, count: current.count + 1 }));
```

#### Overload 3: Async Updater

```ts
set(updater: (state: T) => Promise<T>): Promise<void>;
```

**Parameters:**

- **updater**: Async function that receives current state and returns new state

**Returns:** Promise that resolves when update completes

**Example:**

```ts
await state.set(async (current) => {
  const data = await fetchData();
  return { ...current, data };
});
```

---

### reset()

```ts
reset(): void;
```

Reset state to initial value.

**Example:**

```ts
state.set({ count: 10 });
state.reset();
console.log(state.get().count); // 0 (initial value)
```

---

### subscribe()

Subscribe to state changes.

#### Overload 1: Subscribe to All Changes

```ts
subscribe(listener: Listener<T>): Unsubscribe;
```

**Parameters:**

- **listener**: Callback called when state changes

**Returns:** Unsubscribe function

**Example:**

```ts
const unsubscribe = state.subscribe((current, prev) => {
  console.log('State changed:', current);
});

// Later...
unsubscribe();
```

**Notes:**

- Listener is called immediately with current state
- Updates are batched asynchronously
- Errors in listeners are swallowed to prevent breaking other subscribers

#### Overload 2: Subscribe to Selected Value

```ts
subscribe<U>(
  selector: Selector<T, U>,
  listener: Listener<U>,
  options?: { equality?: EqualityFn<U> }
): Unsubscribe;
```

**Type Parameters:**

- **U**: Selected value type

**Parameters:**

- **selector**: Function to select value from state
- **listener**: Callback called when selected value changes
- **options** (optional): Configuration
  - **equality**: Custom equality function (defaults to `shallowEqual`)

**Returns:** Unsubscribe function

**Example:**

```ts
// Subscribe to count only
state.subscribe(
  (data) => data.count,
  (count, prevCount) => {
    console.log(`Count: ${prevCount} → ${count}`);
  },
);

// With custom equality
state.subscribe(
  (data) => data.items,
  (items) => console.log('Items changed'),
  { equality: (a, b) => a.length === b.length },
);
```

**Notes:**

- Only called when selected value changes according to equality function
- Default equality is `shallowEqual`
- More efficient than subscribing to full state

---

### computed()

```ts
computed<U>(
  selector: Selector<T, U>,
  options?: { equality?: EqualityFn<U> }
): Computed<U>;
```

Create a cached computed value that automatically updates when dependencies change.

**Type Parameters:**

- **U**: Computed value type

**Parameters:**

- **selector**: Function to compute value from state
- **options** (optional): Configuration
  - **equality**: Custom equality function (defaults to `shallowEqual`)

**Returns:** `Computed<U>` object with `get()` and `subscribe()` methods

**Example:**

```ts
const state = createSnapshot({
  items: [{ price: 10 }, { price: 20 }],
});

const total = state.computed((s) => s.items.reduce((sum, item) => sum + item.price, 0));

console.log(total.get()); // 30

// Subscribe to computed changes
total.subscribe((current, prev) => {
  console.log(`Total changed: ${prev} → ${current}`);
});

state.set({ items: [...state.get().items, { price: 15 }] });
// Logs: Total changed: 30 → 45
```

**Notes:**

- Computed values are cached until state changes
- Only recomputes when the actual state object changes
- Notifies subscribers only when computed value changes
- Custom equality function controls when subscribers are notified
- Subscribers are called immediately with current value

---

### transaction()

```ts
transaction(fn: () => void): void;
```

Execute multiple state updates in a transaction, batching notifications into a single update.

**Parameters:**

- **fn**: Function containing state updates to batch

**Returns:** `void`

**Example:**

```ts
const state = createSnapshot({ count: 0, name: 'Alice', age: 30 });

state.subscribe((current) => {
  console.log('State updated:', current);
});

// Multiple updates batched into one notification
state.transaction(() => {
  state.set({ count: 1 });
  state.set({ name: 'Bob' });
  state.set({ age: 31 });
});
// Logs once: State updated: { count: 1, name: 'Bob', age: 31 }
```

**Notes:**

- All state changes within transaction are batched
- Subscribers notified only once after transaction completes
- Transactions can be nested (notifications still batched)
- State can be read during transaction
- If transaction throws, changes up to error are still applied
- Computed values also benefit from batching

---

### createChild()

```ts
createChild(patch?: Partial<T>): State<T>;
```

Create an independent child state.

**Parameters:**

- **patch** (optional): Partial state to override

**Returns:** New `State<T>` instance

**Example:**

```ts
const parent = createSnapshot({ count: 0, name: 'Parent' });
const child = parent.createChild({ name: 'Child' });

console.log(parent.get()); // { count: 0, name: 'Parent' }
console.log(child.get()); // { count: 0, name: 'Child' }

child.set({ count: 10 });
console.log(parent.get().count); // 0 (unchanged)
```

**Notes:**

- Child state is completely independent
- Parent changes don't affect child
- Child changes don't affect parent
- Child uses same equality function as parent

---

### runInScope()

```ts
async runInScope<R>(
  fn: (scopedState: State<T>) => R | Promise<R>,
  patch?: Partial<T>
): Promise<R>;
```

Execute function with a scoped state that doesn't affect original.

**Type Parameters:**

- **R**: Return type of function

**Parameters:**

- **fn**: Function to execute with scoped state
- **patch** (optional): Partial state to override

**Returns:** Promise resolving to function result

**Example:**

```ts
const state = createSnapshot({ count: 0 });

const result = await state.runInScope(
  async (scopedState) => {
    scopedState.set({ count: 999 });
    await doSomething();
    return 'completed';
  },
  { isTemporary: true },
);

console.log(state.get().count); // 0 (unchanged)
console.log(result); // "completed"
```

**Notes:**

- Scoped state starts with parent state + patch
- Changes to scoped state don't affect original
- Scoped state is garbage collected after function completes
- Useful for testing or temporary operations

---

## Utility Functions

### shallowEqual()

```ts
function shallowEqual(a: unknown, b: unknown): boolean;
```

Check shallow equality between two values.

**Parameters:**

- **a**: First value
- **b**: Second value

**Returns:** `true` if shallowly equal

**Example:**

```ts
shallowEqual({ a: 1 }, { a: 1 }); // true
shallowEqual({ a: 1 }, { a: 2 }); // false
shallowEqual({ a: { b: 1 } }, { a: { b: 1 } }); // false (different references)
```

**Notes:**

- Compares primitive values with `===`
- For objects, compares keys and values shallowly
- Arrays are compared element by element
- `null` and `undefined` are compared with `===`

---

### shallowMerge()

```ts
function shallowMerge<T extends object>(state: T, patch: Partial<T>): T;
```

Shallow merge two objects or arrays.

**Type Parameters:**

- **T**: Object or array type

**Parameters:**

- **state**: Base state
- **patch**: Partial state to merge

**Returns:** New merged object/array

**Example:**

```ts
const state = { count: 0, name: 'Alice' };
const patch = { count: 1 };
const merged = shallowMerge(state, patch);
// { count: 1, name: 'Alice' }

const arr = [1, 2, 3];
const merged = shallowMerge(arr, { 0: 99 });
// [99, 2, 3]
```

**Notes:**

- Creates new reference (doesn't mutate originals)
- Works with both objects and arrays
- Uses `Object.assign` internally

---

## Testing Helpers

### createTestState()

```ts
function createTestState<T extends object>(
  baseState?: State<T>,
  patch?: Partial<T>,
): {
  state: State<T>;
  dispose: () => void;
};
```

Create isolated test state.

**Type Parameters:**

- **T**: State type

**Parameters:**

- **baseState** (optional): Base state to inherit from
- **patch** (optional): Partial state to override

**Returns:** Object with:

- **state**: Test state instance
- **dispose**: Cleanup function

**Example:**

```ts
describe('Counter', () => {
  it('increments count', () => {
    const { state, dispose } = createTestState(null, { count: 0 });

    state.set({ count: 1 });
    expect(state.get().count).toBe(1);

    dispose();
  });
});
```

**Notes:**

- If `baseState` is provided, test state inherits its value
- Test state is independent of base state
- `dispose()` resets test state (for cleanup)

---

### withStateMock()

```ts
function withStateMock<T extends object, R>(
  baseState: State<T>,
  patch: Partial<T>,
  fn: (scopedState: State<T>) => R | Promise<R>
): Promise<R>;
```

Execute function with temporarily mocked state. The scoped state is passed to your callback function.

**Type Parameters:**

- **T**: State type
- **R**: Return type

**Parameters:**

- **baseState**: State to create mock from
- **patch**: Partial state to merge with base state
- **fn**: Function to execute with scoped state

**Returns:** Promise resolving to function result

**Example:**

```ts
const appState = createSnapshot({ user: null, isAdmin: false });

function checkAdmin(state: State<AppState>): string {
  return state.get().isAdmin ? 'Admin' : 'Guest';
}

it('checks admin status with mocked state', async () => {
  await withStateMock(
    appState,
    { user: { name: 'Admin' }, isAdmin: true },
    (scopedState) => {
      // scopedState has the mocked values
      const result = checkAdmin(scopedState);
      expect(result).toBe('Admin');
      expect(scopedState.get().isAdmin).toBe(true);
    }
  );

  // Original state unchanged
  expect(appState.get().isAdmin).toBe(false);
});
```

**Notes:**

- Creates a scoped child state with mocked values
- Original state is never modified
- Scoped state is discarded after callback completes
- Useful for testing functions that accept state as a parameter
- For simpler testing, consider `createTestState` instead
**Notes:**

- Uses `runInScope` internally
- Original state is never modified
- Useful for testing with different state scenarios

---

## TypeScript Support

### Full Type Inference

```ts
const state = createSnapshot({ count: 0, name: 'Alice' });

// Types are inferred automatically
const current = state.get(); // Type: { count: number; name: string }
const count = state.get((s) => s.count); // Type: number
const fullName = state.get((s) => s.name.toUpperCase()); // Type: string

// Type-safe updates
state.set({ count: 1 }); // ✅
state.set({ invalid: true }); // ❌ Type error

// Type-safe selectors
state.subscribe(
  (s) => s.count, // Selector returns number
  (count) => {
    // count is typed as number
    console.log(count.toFixed(2));
  },
);
```

### Generic Types

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

const userState = createSnapshot<{ user: User | null }>({
  user: null,
});

// Type guards work
if (userState.get().user) {
  console.log(userState.get().user.name); // Type: string
}
```

### Strict Mode

```ts
// Enable strict null checks in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true
  }
}

// Snapit respects strict mode
const state = createSnapshot<{ value: string | null }>({ value: null });

const value = state.get().value;
// Type: string | null (not just string)
```

---

## Error Handling

### Swallowed Listener Errors

Errors in listeners are caught and swallowed to prevent breaking other subscribers:

```ts
state.subscribe((current) => {
  throw new Error('Oops!');
});

state.subscribe((current) => {
  console.log('This still runs'); // ✅ Still called
});

state.set({ count: 1 }); // Doesn't throw
```

### Async Update Errors

Async updater errors are propagated:

```ts
try {
  await state.set(async (current) => {
    throw new Error('Fetch failed');
  });
} catch (error) {
  console.error(error); // Error is caught
}
```

---

## Performance Considerations

### Batched Notifications

Updates are automatically batched using microtasks:

```ts
state.set({ count: 1 });
state.set({ count: 2 });
state.set({ count: 3 });

// Only one notification sent after all updates
await Promise.resolve();
```

### Selective Subscriptions

Use selectors to avoid unnecessary notifications:

```ts
// ❌ Bad - notified on every state change
state.subscribe((data) => {
  updateCountUI(data.count);
});

// ✅ Good - notified only when count changes
state.subscribe(
  (data) => data.count,
  (count) => {
    updateCountUI(count);
  },
);
```

### Custom Equality

Use custom equality for expensive comparisons:

```ts
state.subscribe(
  (data) => data.largeArray,
  (array) => processArray(array),
  {
    equality: (a, b) => a.length === b.length, // Cheap comparison
  },
);
```

---

## Migration Guide

### From Zustand

```ts
// Zustand
import create from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((data) => ({ count: data.count + 1 })),
}));

// Snapit
import { createSnapshot } from '@vielzeug/snapit';

const state = createSnapshot({ count: 0 });

const increment = () => {
  state.set((current) => ({ count: current.count + 1 }));
};
```

### From Redux

```ts
// Redux
const initialState = { count: 0 };

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
}

// Snapit
const state = createSnapshot({ count: 0 });

const increment = () => {
  state.set((current) => ({ count: current.count + 1 }));
};
```

### From Valtio

```ts
// Valtio
import { proxy, useSnapshot } from 'valtio';

const state = proxy({ count: 0 });

// Snapit
import { createSnapshot } from '@vielzeug/snapit';

const state = createSnapshot({ count: 0 });
```
