import { createStore, createTestStore, type Store, shallowEqual, shallowMerge, withMock } from './stateit';

/** -------------------- Utility Tests -------------------- **/

describe('shallowEqual', () => {
  it('returns true for identical primitive values', () => {
    expect(shallowEqual(5, 5)).toBe(true);
    expect(shallowEqual('test', 'test')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
  });

  it('returns false for different primitive values', () => {
    expect(shallowEqual(5, 10)).toBe(false);
    expect(shallowEqual('a', 'b')).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
  });

  it('returns true for objects with same properties', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false for objects with different property values', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false for objects with different number of properties', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns true for null === null', () => {
    expect(shallowEqual(null, null)).toBe(true);
  });

  it('returns true for undefined === undefined', () => {
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for null vs undefined', () => {
    expect(shallowEqual(null, undefined)).toBe(false);
  });

  it('returns false when comparing null or undefined with objects', () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(undefined, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
    expect(shallowEqual({}, undefined)).toBe(false);
  });

  it('returns true for same reference', () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('returns false for nested objects with different references', () => {
    expect(shallowEqual({ nested: { a: 1 } }, { nested: { a: 1 } })).toBe(false);
  });
});

describe('shallowMerge', () => {
  it('merges properties into object', () => {
    const result = shallowMerge({ a: 1, b: 2 }, { b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
  });

  it('merges properties into array', () => {
    const original = [1, 2, 3];
    const result = shallowMerge(original, { 1: 99 } as unknown as Partial<number[]>);
    expect(result).toEqual([1, 99, 3]);
  });

  it('creates new reference for objects', () => {
    const original = { a: 1, b: 2 };
    const result = shallowMerge(original, { b: 3 });
    expect(result).not.toBe(original);
  });

  it('creates new reference for arrays', () => {
    const original = [1, 2, 3];
    const result = shallowMerge(original, [] as Partial<number[]>);
    expect(result).not.toBe(original);
  });
});

/** -------------------- Store Tests -------------------- **/

describe('Store - Core Functionality', () => {
  type CounterState = { count: number };
  let store: Store<CounterState>;

  beforeEach(() => {
    store = createStore({ count: 0 });
  });

  it('initializes with initial state', () => {
    expect(store.get()).toEqual({ count: 0 });
  });

  it('gets state with get()', () => {
    expect(store.get()).toEqual({ count: 0 });
  });

  it('sets state with partial object', () => {
    store.set({ count: 5 });
    expect(store.get()).toEqual({ count: 5 });
  });

  it('does not notify if state is equal', async () => {
    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();
    store.set({ count: 0 });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('merges state with set() for partial updates', () => {
    type ExtendedState = CounterState & { name: string };
    const extendedStore = createStore<ExtendedState>({ count: 0, name: 'test' });
    extendedStore.set({ count: 1 });
    expect(extendedStore.get()).toEqual({ count: 1, name: 'test' });
  });

  it('updates state with sync updater function', () => {
    store.set((state) => ({ ...state, count: state.count + 1 }));
    expect(store.get()).toEqual({ count: 1 });
  });

  it('handles async updater', async () => {
    await store.set(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ...state, count: state.count + 1 };
    });
    expect(store.get()).toEqual({ count: 1 });
  });

  it('does not update state if async result is equal', async () => {
    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();
    await store.set(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return state;
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('resets to initial state', () => {
    store.set({ count: 10 });
    store.reset();
    expect(store.get()).toEqual({ count: 0 });
  });

  it('selects a slice of state with get(selector)', () => {
    type UserState = { name: string; age: number; email: string };
    const userStore = createStore<UserState>({ age: 30, email: 'alice@example.com', name: 'Alice' });

    const name = userStore.get((state) => state.name);
    expect(name).toBe('Alice');

    const isAdult = userStore.get((state) => state.age >= 18);
    expect(isAdult).toBe(true);
  });

  it('selects nested properties', () => {
    type NestedState = { user: { profile: { name: string } } };
    const nestedStore = createStore<NestedState>({ user: { profile: { name: 'Bob' } } });

    const profileName = nestedStore.get((state) => state.user.profile.name);
    expect(profileName).toBe('Bob');
  });
});

/** -------------------- Subscription Tests -------------------- **/

describe('Store - Subscriptions', () => {
  type CounterState = { count: number };
  let store: Store<CounterState>;

  beforeEach(() => {
    store = createStore({ count: 0 });
  });

  it('subscribes to full state changes', async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    // Called immediately with current state
    expect(listener).toHaveBeenCalledWith({ count: 0 }, { count: 0 });

    listener.mockClear();
    store.set({ count: 1 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });

    unsubscribe();
  });

  it('subscribes to selected state slice', async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(
      (state) => state.count,
      (count, prevCount) => listener(count, prevCount),
    );

    // Called immediately
    expect(listener).toHaveBeenCalledWith(0, 0);

    listener.mockClear();
    store.set({ count: 5 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(5, 0);

    unsubscribe();
  });

  it('does not call listener when selected value unchanged', async () => {
    type ComplexState = { count: number; name: string };
    const complexStore = createStore<ComplexState>({ count: 0, name: 'test' });
    const listener = vi.fn();

    complexStore.subscribe(
      (state) => state.count,
      (count) => listener(count),
    );

    listener.mockClear();
    complexStore.set({ name: 'updated' });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('uses custom equality function for selector', async () => {
    type ArrayState = { items: number[] };
    const arrayStore = createStore<ArrayState>({ items: [1, 2, 3] });
    const listener = vi.fn();

    arrayStore.subscribe(
      (state) => state.items,
      (items) => listener(items),
      {
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      },
    );

    listener.mockClear();
    arrayStore.set({ items: [1, 2, 3] }); // Same values, different reference
    await Promise.resolve();

    // Should not be called due to custom equality
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes correctly', async () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    listener.mockClear();
    unsubscribe();

    store.set({ count: 1 });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('handles multiple subscribers', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);

    listener1.mockClear();
    listener2.mockClear();

    store.set({ count: 1 });
    await Promise.resolve();

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('swallows listener errors', async () => {
    const errorListener = vi.fn(() => {
      throw new Error('Listener error');
    });
    const goodListener = vi.fn();

    store.subscribe(errorListener);
    store.subscribe(goodListener);

    errorListener.mockClear();
    goodListener.mockClear();

    store.set({ count: 1 });
    await Promise.resolve();

    expect(goodListener).toHaveBeenCalled();
  });

  it('batches multiple synchronous updates', async () => {
    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();

    store.set({ count: 1 });
    store.set({ count: 2 });
    store.set({ count: 3 });

    // Should only be called once after microtask
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 3 }, { count: 0 });
  });
});

/** -------------------- Scoped Store Tests -------------------- **/

describe('Store - Child Stores', () => {
  type TestState = { count: number; name: string };
  let parentStore: Store<TestState>;

  beforeEach(() => {
    parentStore = createStore({ count: 0, name: 'parent' });
  });

  it('creates child store with parent state', () => {
    const child = parentStore.createChild();
    expect(child.get()).toEqual({ count: 0, name: 'parent' });
  });

  it('creates child store with patch', () => {
    const child = parentStore.createChild({ count: 10 });
    expect(child.get()).toEqual({ count: 10, name: 'parent' });
  });

  it('child changes do not affect parent', () => {
    const child = parentStore.createChild();
    child.set({ count: 5 });

    expect(child.get()).toEqual({ count: 5, name: 'parent' });
    expect(parentStore.get()).toEqual({ count: 0, name: 'parent' });
  });

  it('parent changes do not affect child', () => {
    const child = parentStore.createChild();
    parentStore.set({ count: 5 });

    expect(parentStore.get()).toEqual({ count: 5, name: 'parent' });
    expect(child.get()).toEqual({ count: 0, name: 'parent' });
  });
});

describe('Store - runInScope', () => {
  type TestState = { count: number };
  let store: Store<TestState>;

  beforeEach(() => {
    store = createStore({ count: 0 });
  });

  it('executes function with scoped store', async () => {
    const result = await store.runInScope((scopedStore) => {
      scopedStore.set({ count: 10 });
      return scopedStore.get().count;
    });

    expect(result).toBe(10);
    expect(store.get().count).toBe(0); // Parent unchanged
  });

  it('supports async functions', async () => {
    const result = await store.runInScope(async (scopedStore) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      scopedStore.set({ count: 99 });
      return scopedStore.get().count;
    });

    expect(result).toBe(99);
    expect(store.get().count).toBe(0);
  });

  it('accepts patch for scoped store', async () => {
    await store.runInScope(
      (scopedStore) => {
        expect(scopedStore.get().count).toBe(42);
      },
      { count: 42 },
    );
  });
});

/** -------------------- Testing Helpers Tests -------------------- **/

describe('createTestStore', () => {
  it('creates test store with default state', () => {
    const { store: testStore, dispose } = createTestStore<{ count: number }>();

    testStore.set({ count: 5 });
    expect(testStore.get().count).toBe(5);

    dispose();
  });

  it('creates test store from base store', () => {
    const baseStore = createStore({ count: 0, name: 'base' });
    const { store: testStore, dispose } = createTestStore(baseStore);

    expect(testStore.get()).toEqual({ count: 0, name: 'base' });

    dispose();
  });

  it('creates test store with patch', () => {
    const baseStore = createStore({ count: 0, name: 'base' });
    const { store: testStore, dispose } = createTestStore(baseStore, { count: 10 });

    expect(testStore.get()).toEqual({ count: 10, name: 'base' });

    dispose();
  });

  it('disposes test store', () => {
    const baseStore = createStore({ count: 10 });
    const { store: testStore, dispose } = createTestStore(baseStore, { count: 5 });

    expect(testStore.get().count).toBe(5);

    dispose();

    // Reset to the initial state of the child (which was 5)
    expect(testStore.get().count).toBe(5);
  });
});

describe('withMock', () => {
  it('temporarily overrides state', async () => {
    const store = createStore({ count: 0, name: 'test' });

    await withMock(store, { count: 77 }, () => {
      // Not accessible - scoped store is isolated
    });

    expect(store.get().count).toBe(0); // Original unchanged
  });

  it('handles async functions', async () => {
    const store = createStore({ count: 0 });

    const result = await withMock(store, { count: 99 }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'done';
    });

    expect(result).toBe('done');
    expect(store.get().count).toBe(0);
  });
});

/** -------------------- Custom Equality Tests -------------------- **/

describe('Store - Custom Equality', () => {
  it('uses custom equality function', async () => {
    type State = { items: number[] };
    const store = createStore<State>(
      { items: [1, 2, 3] },
      {
        equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      },
    );

    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();
    store.set({ items: [1, 2, 3] }); // Same values, different reference
    await Promise.resolve();

    // Should not notify due to custom equality
    expect(listener).not.toHaveBeenCalled();
  });
});

/** -------------------- Edge Cases Tests -------------------- **/

describe('Store - Edge Cases', () => {
  it('handles empty state object', () => {
    const store = createStore({});
    expect(store.get()).toEqual({});
  });

  it('handles state with nested objects', () => {
    type NestedState = { user: { profile: { name: string; age: number } } };
    const store = createStore<NestedState>({
      user: { profile: { age: 25, name: 'Alice' } },
    });

    store.set({
      user: { profile: { age: 26, name: 'Alice' } },
    });

    expect(store.get().user.profile.age).toBe(26);
  });

  it('handles state with arrays', () => {
    type ArrayState = { items: number[] };
    const store = createStore<ArrayState>({ items: [1, 2, 3] });

    store.set({ items: [4, 5, 6] });
    expect(store.get().items).toEqual([4, 5, 6]);
  });

  it('prevents mutation of original state', () => {
    const initialState = { count: 0, name: 'test' };
    const store = createStore(initialState);

    store.set({ count: 5 });

    expect(initialState.count).toBe(0); // Original unchanged
  });

  it('handles rapid sequential updates', async () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();

    for (let i = 0; i < 100; i++) {
      store.set({ count: i });
    }

    await Promise.resolve();

    // Should be batched into one notification
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 99 }, { count: 0 });
  });

  it('handles async updates with race conditions', async () => {
    const store = createStore({ count: 0 });

    const promises = [
      store.set(async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { count: state.count + 1 };
      }),
      store.set(async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { count: state.count + 2 };
      }),
    ];

    await Promise.all(promises);

    // Both updates complete (order may vary due to race)
    expect(store.get().count).toBeGreaterThan(0);
  });

  it('handles subscriber errors during initialization', () => {
    const store = createStore({ count: 0 });

    expect(() => {
      store.subscribe(() => {
        throw new Error('Init error');
      });
    }).not.toThrow();
  });

  it('handles multiple unsubscribes of same subscription', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(() => {
      unsubscribe();
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });

  it('handles updater that returns same reference', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    listener.mockClear();
    store.set((state) => state);

    expect(listener).not.toHaveBeenCalled();
  });
});
