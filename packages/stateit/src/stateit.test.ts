/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { createStore, createTestStore, type Store, shallowEqual, shallowMerge, withMock } from './stateit';

describe('stateit', () => {
  /** -------------------- Utility Tests -------------------- **/

  describe('shallowEqual', () => {
    it('returns true for identical primitive values', () => {
      expect(shallowEqual(1, 1)).toBe(true);
      expect(shallowEqual('test', 'test')).toBe(true);
      expect(shallowEqual(true, true)).toBe(true);
    });

    it('returns false for different primitive values', () => {
      expect(shallowEqual(1, 2)).toBe(false);
      expect(shallowEqual('a', 'b')).toBe(false);
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
      expect(shallowEqual(null, { a: 1 })).toBe(false);
      expect(shallowEqual({ a: 1 }, null)).toBe(false);
      expect(shallowEqual(undefined, { a: 1 })).toBe(false);
      expect(shallowEqual({ a: 1 }, undefined)).toBe(false);
    });

    it('returns true for same reference', () => {
      const obj = { a: 1 };
      expect(shallowEqual(obj, obj)).toBe(true);
    });
  });

  describe('shallowMerge', () => {
    it('merges properties into object', () => {
      const state = { a: 1, b: 2 };
      const result = shallowMerge(state, { b: 3 });
      expect(result).toEqual({ a: 1, b: 3 });
      expect(result).not.toBe(state); // New reference
    });

    it('merges properties into array', () => {
      const state = [1, 2, 3];
      const result = shallowMerge(state as unknown as object, { 1: 99 }) as number[];
      expect(result).toEqual([1, 99, 3]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('creates new reference for objects', () => {
      const state = { a: 1 };
      const result = shallowMerge(state, {});
      expect(result).not.toBe(state);
    });
  });

  /** -------------------- Store Core Tests -------------------- **/

  describe('Store - Basic State Management', () => {
    type CounterState = { count: number };
    let store: Store<CounterState>;

    beforeEach(() => {
      store = createStore({ count: 0 });
    });

    it('initializes with initial state', () => {
      expect(store.get()).toEqual({ count: 0 });
    });

    it('gets state with get()', () => {
      const state = store.get();
      expect(state).toEqual({ count: 0 });
    });

    it('sets state with replace()', () => {
      store.replace({ count: 5 });
      expect(store.get()).toEqual({ count: 5 });
    });

    it('does not notify if state is equal', () => {
      const listener = vi.fn();
      store.subscribe(listener);

      listener.mockClear();
      store.replace({ count: 0 });
      expect(listener).not.toHaveBeenCalled();
    });

    it('merges state with set()', () => {
      type ExtendedState = CounterState & { name: string };
      const extendedStore = createStore<ExtendedState>({ count: 0, name: 'test' });
      extendedStore.set({ count: 1 });
      expect(extendedStore.get()).toEqual({ count: 1, name: 'test' });
    });

    it('updates state with updater function', async () => {
      await store.update((state) => ({ ...state, count: state.count + 1 }));
      expect(store.get()).toEqual({ count: 1 });
    });

    it('handles async updater', async () => {
      await store.update(async (state) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...state, count: state.count + 1 };
      });
      expect(store.get()).toEqual({ count: 1 });
    });

    it('resets to initial state', () => {
      store.set({ count: 10 });
      store.reset();
      expect(store.get()).toEqual({ count: 0 });
    });

    it('gets store name when configured', () => {
      const namedStore = createStore({ count: 0 }, { name: 'counter' });
      expect(namedStore.getName()).toBe('counter');
    });

    it('returns undefined for store name when not configured', () => {
      expect(store.getName()).toBeUndefined();
    });

    it('selects a slice of state with select()', () => {
      type UserState = { name: string; age: number; email: string };
      const userStore = createStore<UserState>({ age: 30, email: 'alice@example.com', name: 'Alice' });

      // Select primitive
      const name = userStore.select((state) => state.name);
      expect(name).toBe('Alice');

      // Select computed value
      const isAdult = userStore.select((state) => state.age >= 18);
      expect(isAdult).toBe(true);

      // Select nested property
      type NestedState = { user: { profile: { name: string } } };
      const nestedStore = createStore<NestedState>({ user: { profile: { name: 'Bob' } } });
      const profileName = nestedStore.select((state) => state.user.profile.name);
      expect(profileName).toBe('Bob');
    });
  });

  /** -------------------- Subscription Tests -------------------- **/

  describe('Store - Subscriptions', () => {
    type TestState = { count: number; name: string };
    let store: Store<TestState>;

    beforeEach(() => {
      store = createStore({ count: 0, name: 'test' });
    });

    it('subscribes to full state changes', async () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      // Called immediately with current state
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 0, name: 'test' }, { count: 0, name: 'test' });

      listener.mockClear();

      // Called when state changes
      store.set({ count: 1 });
      await Promise.resolve(); // Wait for microtask

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 1, name: 'test' }, { count: 0, name: 'test' });

      unsubscribe();
    });

    it('subscribes to selected state slice', async () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe((state) => state.count, listener);

      // Called immediately
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(0, 0);

      listener.mockClear();

      // Called when selected value changes
      store.set({ count: 1 });
      await Promise.resolve();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1, 0);

      unsubscribe();
    });

    it('does not call listener when selected value unchanged', async () => {
      const listener = vi.fn();
      store.subscribe((state) => state.count, listener);

      listener.mockClear();

      // Change name but not count
      store.set({ name: 'changed' });
      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();
    });

    it('uses custom equality function for selector', async () => {
      const listener = vi.fn();
      const customEquality = (a: number, b: number) => Math.abs(a - b) < 2;

      store.subscribe((state) => state.count, listener, { equality: customEquality });

      listener.mockClear();

      // Change count by 1 - should not notify (within threshold)
      store.set({ count: 1 });
      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();

      // Change count by 2 - should notify
      store.set({ count: 3 });
      await Promise.resolve();

      expect(listener).toHaveBeenCalled();
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

      // Good listener should still be called
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Store - Observers', () => {
    type TestState = { count: number };
    let store: Store<TestState>;

    beforeEach(() => {
      store = createStore({ count: 0 });
    });

    it('observes all state changes', async () => {
      const observer = vi.fn();
      const unsubscribe = store.observe(observer);

      // Not called immediately (unlike subscribe)
      expect(observer).not.toHaveBeenCalled();

      store.set({ count: 1 });
      await Promise.resolve();

      expect(observer).toHaveBeenCalledWith({ count: 1 }, { count: 0 });

      unsubscribe();
    });

    it('unsubscribes observer correctly', async () => {
      const observer = vi.fn();
      const unsubscribe = store.observe(observer);

      unsubscribe();

      store.set({ count: 1 });
      await Promise.resolve();

      expect(observer).not.toHaveBeenCalled();
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

    it('creates child with namespaced name', () => {
      const namedStore = createStore({ count: 0, name: 'test' }, { name: 'parent' });
      const child = namedStore.createChild();

      expect(child.getName()).toBe('parent.child');
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
      expect(store.get()).toEqual({ count: 0 }); // Parent unchanged
    });

    it('supports async functions', async () => {
      const result = await store.runInScope(async (scopedStore) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        scopedStore.set({ count: 5 });
        return scopedStore.get().count;
      });

      expect(result).toBe(5);
      expect(store.get()).toEqual({ count: 0 });
    });

    it('accepts patch for scoped store', async () => {
      await store.runInScope(
        (scopedStore) => {
          expect(scopedStore.get()).toEqual({ count: 99 });
        },
        { count: 99 },
      );
    });
  });

  /** -------------------- Testing Helpers -------------------- **/

  describe('createTestStore', () => {
    it('creates test store with default state', () => {
      const { store, dispose } = createTestStore<{ count: number }>();

      expect(store.get()).toEqual({});

      dispose();
    });

    it('creates test store from base store', () => {
      const baseStore = createStore({ count: 0 });
      const { store, dispose } = createTestStore(baseStore);

      expect(store.get()).toEqual({ count: 0 });

      dispose();
    });

    it('creates test store with patch', () => {
      const baseStore = createStore({ count: 0, name: 'test' });
      const { store, dispose } = createTestStore(baseStore, { count: 42 });

      expect(store.get()).toEqual({ count: 42, name: 'test' });

      dispose();
    });

    it('disposes test store', () => {
      const baseStore = createStore({ count: 0 });
      const { store, dispose } = createTestStore(baseStore, { count: 10 });

      store.set({ count: 20 });
      dispose();

      // Resets to initial state
      expect(store.get()).toEqual({ count: 10 });
    });
  });

  describe('withMock', () => {
    it('temporarily overrides state', async () => {
      const store = createStore({ count: 0 });

      const result = await withMock(store, { count: 77 }, () => {
        // Note: withMock uses runInScope which creates a child store
        // The function doesn't receive the modified store directly
        return 'success';
      });

      expect(result).toBe('success');
      expect(store.get()).toEqual({ count: 0 }); // Original state unchanged
    });

    it('handles async functions', async () => {
      const store = createStore({ count: 0 });

      await withMock(store, { count: 99 }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(store.get()).toEqual({ count: 0 });
    });
  });

  /** -------------------- Custom Equality Tests -------------------- **/

  describe('Store - Custom Equality', () => {
    it('uses custom equality function', async () => {
      type TestState = { count: number; name: string };
      const customEquals = vi.fn((a: TestState, b: TestState) => a.count === b.count);
      const store = createStore<TestState>({ count: 0, name: 'test' }, { equals: customEquals });

      const listener = vi.fn();
      store.subscribe(listener);

      listener.mockClear();

      // Change only name - should not notify because count is same
      store.replace({ count: 0, name: 'changed' });
      await Promise.resolve();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  /** -------------------- Batched Notifications -------------------- **/

  describe('Store - Batched Notifications', () => {
    it('batches multiple synchronous updates', async () => {
      const store = createStore({ count: 0 });
      const listener = vi.fn();

      store.subscribe(listener);
      listener.mockClear();

      // Multiple synchronous updates
      store.set({ count: 1 });
      store.set({ count: 2 });
      store.set({ count: 3 });

      // Listener isn't called yet (scheduled)
      expect(listener).not.toHaveBeenCalled();

      // Wait for a microtask
      await Promise.resolve();

      // Listener called only once with the final state
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ count: 3 }, { count: 0 });
    });
  });

  /** -------------------- Edge Cases -------------------- **/

  describe('Store - Edge Cases', () => {
    it('handles empty state object', () => {
      const store = createStore({});
      expect(store.get()).toEqual({});
    });

    it('handles state with nested objects', async () => {
      type NestedState = { user: { name: string; age: number } };
      const store = createStore<NestedState>({ user: { age: 30, name: 'Alice' } });

      store.set({ user: { age: 25, name: 'Bob' } });
      expect(store.get()).toEqual({ user: { age: 25, name: 'Bob' } });
    });

    it('handles state with arrays', async () => {
      type ArrayState = { items: string[] };
      const store = createStore<ArrayState>({ items: ['a', 'b'] });

      store.set({ items: ['c', 'd'] });
      expect(store.get()).toEqual({ items: ['c', 'd'] });
    });

    it('prevents mutation of original state', () => {
      const initialState = { count: 0 };
      const store = createStore(initialState);

      store.set({ count: 1 });

      // The original state should not be mutated
      expect(initialState).toEqual({ count: 0 });
    });
  });
});
