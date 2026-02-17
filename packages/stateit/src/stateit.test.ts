import { createState, createTestState, type State, shallowEqual, shallowMerge, withStateMock } from './stateit';

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
  let state: State<CounterState>;

  beforeEach(() => {
    state = createState({ count: 0 });
  });

  it('initializes with initial state', () => {
    expect(state.get()).toEqual({ count: 0 });
  });

  it('gets state with get()', () => {
    expect(state.get()).toEqual({ count: 0 });
  });

  it('sets state with partial object', () => {
    state.set({ count: 5 });
    expect(state.get()).toEqual({ count: 5 });
  });

  it('does not notify if state is equal', async () => {
    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();
    state.set({ count: 0 });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('merges state with set() for partial updates', () => {
    type ExtendedState = CounterState & { name: string };
    const extendedStore = createState<ExtendedState>({ count: 0, name: 'test' });
    extendedStore.set({ count: 1 });
    expect(extendedStore.get()).toEqual({ count: 1, name: 'test' });
  });

  it('updates state with sync updater function', () => {
    state.set((state) => ({ ...state, count: state.count + 1 }));
    expect(state.get()).toEqual({ count: 1 });
  });

  it('handles async updater', async () => {
    await state.set(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { ...state, count: state.count + 1 };
    });
    expect(state.get()).toEqual({ count: 1 });
  });

  it('does not update state if async result is equal', async () => {
    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();
    await state.set(async (state) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return state;
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it('resets to initial state', () => {
    state.set({ count: 10 });
    state.reset();
    expect(state.get()).toEqual({ count: 0 });
  });

  it('selects a slice of state with get(selector)', () => {
    type UserState = { name: string; age: number; email: string };
    const userState = createState<UserState>({ age: 30, email: 'alice@example.com', name: 'Alice' });

    const name = userState.get((state) => state.name);
    expect(name).toBe('Alice');

    const isAdult = userState.get((state) => state.age >= 18);
    expect(isAdult).toBe(true);
  });

  it('selects nested properties', () => {
    type NestedState = { user: { profile: { name: string } } };
    const nestedState = createState<NestedState>({ user: { profile: { name: 'Bob' } } });

    const profileName = nestedState.get((state) => state.user.profile.name);
    expect(profileName).toBe('Bob');
  });
});

/** -------------------- Subscription Tests -------------------- **/

describe('Store - Subscriptions', () => {
  type CounterState = { count: number };
  let state: State<CounterState>;

  beforeEach(() => {
    state = createState({ count: 0 });
  });

  it('subscribes to full state changes', async () => {
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);

    // Called immediately with current state
    expect(listener).toHaveBeenCalledWith({ count: 0 }, { count: 0 });

    listener.mockClear();
    state.set({ count: 1 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });

    unsubscribe();
  });

  it('subscribes to selected state slice', async () => {
    const listener = vi.fn();
    const unsubscribe = state.subscribe(
      (stt) => stt.count,
      (count, prevCount) => listener(count, prevCount),
    );

    // Called immediately
    expect(listener).toHaveBeenCalledWith(0, 0);

    listener.mockClear();
    state.set({ count: 5 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(5, 0);

    unsubscribe();
  });

  it('does not call listener when selected value unchanged', async () => {
    type ComplexState = { count: number; name: string };
    const complexState = createState<ComplexState>({ count: 0, name: 'test' });
    const listener = vi.fn();

    complexState.subscribe(
      (state) => state.count,
      (count) => listener(count),
    );

    listener.mockClear();
    complexState.set({ name: 'updated' });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('uses custom equality function for selector', async () => {
    type ArrayState = { items: number[] };
    const arrayStore = createState<ArrayState>({ items: [1, 2, 3] });
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
    const unsubscribe = state.subscribe(listener);

    listener.mockClear();
    unsubscribe();

    state.set({ count: 1 });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('handles multiple subscribers', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    state.subscribe(listener1);
    state.subscribe(listener2);

    listener1.mockClear();
    listener2.mockClear();

    state.set({ count: 1 });
    await Promise.resolve();

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('swallows listener errors', async () => {
    const errorListener = vi.fn(() => {
      throw new Error('Listener error');
    });
    const goodListener = vi.fn();

    state.subscribe(errorListener);
    state.subscribe(goodListener);

    errorListener.mockClear();
    goodListener.mockClear();

    state.set({ count: 1 });
    await Promise.resolve();

    expect(goodListener).toHaveBeenCalled();
  });

  it('batches multiple synchronous updates', async () => {
    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();

    state.set({ count: 1 });
    state.set({ count: 2 });
    state.set({ count: 3 });

    // Should only be called once after microtask
    await Promise.resolve();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 3 }, { count: 0 });
  });
});

/** -------------------- Scoped Store Tests -------------------- **/

describe('Store - Child Stores', () => {
  type TestState = { count: number; name: string };
  let parentState: State<TestState>;

  beforeEach(() => {
    parentState = createState({ count: 0, name: 'parent' });
  });

  it('creates child store with parent state', () => {
    const child = parentState.createChild();
    expect(child.get()).toEqual({ count: 0, name: 'parent' });
  });

  it('creates child store with patch', () => {
    const child = parentState.createChild({ count: 10 });
    expect(child.get()).toEqual({ count: 10, name: 'parent' });
  });

  it('child changes do not affect parent', () => {
    const child = parentState.createChild();
    child.set({ count: 5 });

    expect(child.get()).toEqual({ count: 5, name: 'parent' });
    expect(parentState.get()).toEqual({ count: 0, name: 'parent' });
  });

  it('parent changes do not affect child', () => {
    const child = parentState.createChild();
    parentState.set({ count: 5 });

    expect(parentState.get()).toEqual({ count: 5, name: 'parent' });
    expect(child.get()).toEqual({ count: 0, name: 'parent' });
  });
});

describe('Store - runInScope', () => {
  type TestState = { count: number };
  let state: State<TestState>;

  beforeEach(() => {
    state = createState({ count: 0 });
  });

  it('executes function with scoped store', async () => {
    const result = await state.runInScope((scopedState) => {
      scopedState.set({ count: 10 });
      return scopedState.get().count;
    });

    expect(result).toBe(10);
    expect(state.get().count).toBe(0); // Parent unchanged
  });

  it('supports async functions', async () => {
    const result = await state.runInScope(async (scopedState) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      scopedState.set({ count: 99 });
      return scopedState.get().count;
    });

    expect(result).toBe(99);
    expect(state.get().count).toBe(0);
  });

  it('accepts patch for scoped store', async () => {
    await state.runInScope(
      (scopedState) => {
        expect(scopedState.get().count).toBe(42);
      },
      { count: 42 },
    );
  });
});

/** -------------------- Testing Helpers Tests -------------------- **/

describe('createTestState', () => {
  it('creates test store with default state', () => {
    const { state: testState, dispose } = createTestState<{ count: number }>();

    testState.set({ count: 5 });
    expect(testState.get().count).toBe(5);

    dispose();
  });

  it('creates test store from base store', () => {
    const baseState = createState({ count: 0, name: 'base' });
    const { state: testState, dispose } = createTestState(baseState);

    expect(testState.get()).toEqual({ count: 0, name: 'base' });

    dispose();
  });

  it('creates test store with patch', () => {
    const baseState = createState({ count: 0, name: 'base' });
    const { state: testState, dispose } = createTestState(baseState, { count: 10 });

    expect(testState.get()).toEqual({ count: 10, name: 'base' });

    dispose();
  });

  it('disposes test store', () => {
    const baseState = createState({ count: 10 });
    const { state: testState, dispose } = createTestState(baseState, { count: 5 });

    expect(testState.get().count).toBe(5);

    dispose();

    // Reset to the initial state of the child (which was 5)
    expect(testState.get().count).toBe(5);
  });
});

describe('withMock', () => {
  it('temporarily overrides state', async () => {
    const state = createState({ count: 0, name: 'test' });

    await withStateMock(state, { count: 77 }, (scopedState) => {
      // Scoped state has the mocked value
      expect(scopedState.get().count).toBe(77);
      expect(scopedState.get().name).toBe('test');
    });

    // Original unchanged
    expect(state.get().count).toBe(0);
  });

  it('handles async functions', async () => {
    const state = createState({ count: 0 });

    const result = await withStateMock(state, { count: 99 }, async (scopedState) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(scopedState.get().count).toBe(99);
      return 'done';
    });

    expect(result).toBe('done');
    expect(state.get().count).toBe(0);
  });

  it('can modify scoped state without affecting original', async () => {
    const state = createState({ count: 0, items: [1, 2, 3] });

    await withStateMock(state, { count: 50 }, (scopedState) => {
      expect(scopedState.get().count).toBe(50);

      // Modify the scoped state
      scopedState.set({ count: 100 });
      expect(scopedState.get().count).toBe(100);

      // Original still unchanged
      expect(state.get().count).toBe(0);
    });

    // Original still unchanged after mock
    expect(state.get().count).toBe(0);
  });
});

/** -------------------- Custom Equality Tests -------------------- **/

describe('Store - Custom Equality', () => {
  it('uses custom equality function', async () => {
    type State = { items: number[] };
    const state = createState<State>(
      { items: [1, 2, 3] },
      {
        equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      },
    );

    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();
    state.set({ items: [1, 2, 3] }); // Same values, different reference
    await Promise.resolve();

    // Should not notify due to custom equality
    expect(listener).not.toHaveBeenCalled();
  });
});

/** -------------------- Edge Cases Tests -------------------- **/

describe('Store - Edge Cases', () => {
  it('handles empty state object', () => {
    const state = createState({});
    expect(state.get()).toEqual({});
  });

  it('handles state with nested objects', () => {
    type NestedState = { user: { profile: { name: string; age: number } } };
    const state = createState<NestedState>({
      user: { profile: { age: 25, name: 'Alice' } },
    });

    state.set({
      user: { profile: { age: 26, name: 'Alice' } },
    });

    expect(state.get().user.profile.age).toBe(26);
  });

  it('handles state with arrays', () => {
    type ArrayState = { items: number[] };
    const state = createState<ArrayState>({ items: [1, 2, 3] });

    state.set({ items: [4, 5, 6] });
    expect(state.get().items).toEqual([4, 5, 6]);
  });

  it('prevents mutation of original state', () => {
    const initialState = { count: 0, name: 'test' };
    const state = createState(initialState);

    state.set({ count: 5 });

    expect(initialState.count).toBe(0); // Original unchanged
  });

  it('handles rapid sequential updates', async () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();

    for (let i = 0; i < 100; i++) {
      state.set({ count: i });
    }

    await Promise.resolve();

    // Should be batched into one notification
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 99 }, { count: 0 });
  });

  it('handles async updates with race conditions', async () => {
    const state = createState({ count: 0 });

    const promises = [
      state.set(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { count: data.count + 1 };
      }),
      state.set(async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { count: data.count + 2 };
      }),
    ];

    await Promise.all(promises);

    // Both updates complete (order may vary due to race)
    expect(state.get().count).toBeGreaterThan(0);
  });

  it('handles subscriber errors during initialization', () => {
    const state = createState({ count: 0 });

    expect(() => {
      state.subscribe(() => {
        throw new Error('Init error');
      });
    }).not.toThrow();
  });

  it('handles multiple unsubscribes of same subscription', () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);

    expect(() => {
      unsubscribe();
      unsubscribe();
      unsubscribe();
    }).not.toThrow();
  });

  it('handles updater that returns same reference', () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();
    state.subscribe(listener);

    listener.mockClear();
    state.set((data) => data);

    expect(listener).not.toHaveBeenCalled();
  });
});

/** -------------------- Computed Values Tests -------------------- **/

describe('computed', () => {
  it('creates computed value from selector', () => {
    const state = createState({ items: [{ price: 10 }, { price: 20 }] });

    const total = state.computed((s) =>
      s.items.reduce((sum, item) => sum + item.price, 0)
    );

    expect(total.get()).toBe(30);
  });

  it('caches computed value when state unchanged', () => {
    const state = createState({ count: 1 });
    const expensive = vi.fn((s: { count: number }) => s.count * 2);

    const doubled = state.computed(expensive);

    expect(doubled.get()).toBe(2);
    expect(expensive).toHaveBeenCalledTimes(1);

    // Should use cache
    expect(doubled.get()).toBe(2);
    expect(expensive).toHaveBeenCalledTimes(1);
  });

  it('recomputes when state changes', () => {
    const state = createState({ count: 1 });
    const doubled = state.computed((s) => s.count * 2);

    expect(doubled.get()).toBe(2);

    state.set({ count: 5 });
    expect(doubled.get()).toBe(10);
  });

  it('notifies computed subscribers when value changes', async () => {
    const state = createState({ count: 1 });
    const doubled = state.computed((s) => s.count * 2);

    const listener = vi.fn();
    doubled.subscribe(listener);
    listener.mockClear();

    state.set({ count: 5 });
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(10, 2);
  });

  it('does not notify when computed value unchanged', async () => {
    const state = createState({ count: 1, name: 'Alice' });
    const count = state.computed((s) => s.count);

    const listener = vi.fn();
    count.subscribe(listener);
    listener.mockClear();

    // Change name but not count
    state.set({ name: 'Bob' });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('uses custom equality function', async () => {
    const state = createState({ items: [1, 2, 3] });

    // Only notify when length changes
    const items = state.computed(
      (s) => s.items,
      { equality: (a, b) => a.length === b.length }
    );

    const listener = vi.fn();
    items.subscribe(listener);
    listener.mockClear();

    // Same length, different values
    state.set({ items: [4, 5, 6] });
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();

    // Different length
    state.set({ items: [1, 2, 3, 4] });
    await Promise.resolve();
    expect(listener).toHaveBeenCalled();
  });

  it('calls subscriber immediately on subscribe', () => {
    const state = createState({ count: 5 });
    const doubled = state.computed((s) => s.count * 2);

    const listener = vi.fn();
    doubled.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(10, 10);
  });

  it('handles multiple computed subscribers', async () => {
    const state = createState({ count: 1 });
    const doubled = state.computed((s) => s.count * 2);

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    doubled.subscribe(listener1);
    doubled.subscribe(listener2);

    listener1.mockClear();
    listener2.mockClear();

    state.set({ count: 3 });
    await Promise.resolve();

    expect(listener1).toHaveBeenCalledWith(6, 2);
    expect(listener2).toHaveBeenCalledWith(6, 2);
  });

  it('allows unsubscribing from computed', async () => {
    const state = createState({ count: 1 });
    const doubled = state.computed((s) => s.count * 2);

    const listener = vi.fn();
    const unsubscribe = doubled.subscribe(listener);
    listener.mockClear();

    unsubscribe();

    state.set({ count: 5 });
    await Promise.resolve();

    expect(listener).not.toHaveBeenCalled();
  });

  it('swallows errors in computed subscribers', async () => {
    const state = createState({ count: 1 });
    const doubled = state.computed((s) => s.count * 2);

    const errorListener = vi.fn(() => {
      throw new Error('Computed listener error');
    });
    const goodListener = vi.fn();

    doubled.subscribe(errorListener);
    doubled.subscribe(goodListener);

    errorListener.mockClear();
    goodListener.mockClear();

    expect(() => {
      state.set({ count: 3 });
    }).not.toThrow();

    await Promise.resolve();
    expect(goodListener).toHaveBeenCalled();
  });
});

/** -------------------- Transaction Tests -------------------- **/

describe('transaction', () => {
  it('batches multiple updates into single notification', async () => {
    const state = createState({ count: 0, name: 'Alice', age: 30 });
    const listener = vi.fn();

    state.subscribe(listener);
    listener.mockClear();

    state.transaction(() => {
      state.set({ count: 1 });
      state.set({ name: 'Bob' });
      state.set({ age: 31 });
    });

    // Should only notify once after transaction
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      { count: 1, name: 'Bob', age: 31 },
      { count: 0, name: 'Alice', age: 30 }
    );
  });

  it('does not notify during transaction', () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();

    state.subscribe(listener);
    listener.mockClear();

    state.transaction(() => {
      state.set({ count: 1 });
      // Listener should not be called yet
      expect(listener).not.toHaveBeenCalled();

      state.set({ count: 2 });
      expect(listener).not.toHaveBeenCalled();
    });

    // Still not called synchronously
    expect(listener).not.toHaveBeenCalled();
  });

  it('handles nested transactions', async () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();

    state.subscribe(listener);
    listener.mockClear();

    state.transaction(() => {
      state.set({ count: 1 });

      state.transaction(() => {
        state.set({ count: 2 });
        state.set({ count: 3 });
      });

      state.set({ count: 4 });
    });

    await Promise.resolve();

    // Only one notification for entire transaction tree
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state.get().count).toBe(4);
  });

  it('notifies even if transaction throws', async () => {
    const state = createState({ count: 0 });
    const listener = vi.fn();

    state.subscribe(listener);
    listener.mockClear();

    expect(() => {
      state.transaction(() => {
        state.set({ count: 1 });
        throw new Error('Transaction error');
      });
    }).toThrow('Transaction error');

    await Promise.resolve();

    // Should still notify with the changes made before error
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state.get().count).toBe(1);
  });

  it('works with computed values', async () => {
    const state = createState({ a: 1, b: 2 });
    const sum = state.computed((s) => s.a + s.b);

    const listener = vi.fn();
    sum.subscribe(listener);
    listener.mockClear();

    state.transaction(() => {
      state.set({ a: 5 });
      state.set({ b: 10 });
    });

    await Promise.resolve();

    // Computed should only update once
    expect(listener).toHaveBeenCalledTimes(1);
    expect(sum.get()).toBe(15);
  });

  it('allows reading state during transaction', () => {
    const state = createState({ count: 0 });

    state.transaction(() => {
      state.set({ count: 1 });
      expect(state.get().count).toBe(1);

      state.set({ count: 2 });
      expect(state.get().count).toBe(2);
    });

    expect(state.get().count).toBe(2);
  });

  it('does not affect selective subscriptions batching', async () => {
    const state = createState({ count: 0, name: 'Alice' });
    const countListener = vi.fn();

    state.subscribe((s) => s.count, countListener);
    countListener.mockClear();

    state.transaction(() => {
      state.set({ count: 1 });
      state.set({ count: 2 });
      state.set({ name: 'Bob' }); // Shouldn't trigger count listener
    });

    await Promise.resolve();

    expect(countListener).toHaveBeenCalledTimes(1);
    expect(countListener).toHaveBeenCalledWith(2, 0);
  });
});

