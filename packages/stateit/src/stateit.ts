/** -------------------- Core Types -------------------- **/

export type Subscriber<T> = (state: T, prev: T) => void;
export type Selector<T, U> = (state: T) => U;
export type Unsubscribe = () => void;
export type EqualityFn<U> = (a: U, b: U) => boolean;

export type StoreOptions<T> = {
  /** Optional name for debugging/logging */
  name?: string;
  /** Custom equality function (default: shallowEqual) */
  equals?: EqualityFn<T>;
};

/** -------------------- Equality Utilities -------------------- **/

/**
 * Performs a shallow equality check between two values.
 * Returns true if values are identical or all own properties are strictly equal.
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are shallowly equal
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  // Reference equality (handles primitives, same objects, null === null, undefined === undefined)
  if (a === b) return true;

  // Handle null/undefined explicitly
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  // Non-object types that aren't equal by reference are not equal
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Performs shallow merge of a patch into state.
 * Preserves an array/object type and creates a new reference.
 *
 * @param state - Original state object
 * @param patch - Partial state to merge
 * @returns New state object with merged values
 */
export function shallowMerge<T extends object>(state: T, patch: Partial<T>): T {
  const base = Array.isArray(state) ? [...state] : { ...state };
  return Object.assign(base, patch) as T;
}

/** -------------------- Store Implementation -------------------- **/

type InternalSubscriber<T, U> = {
  id: number;
  selector?: Selector<T, U>;
  equality: EqualityFn<U>;
  listener: Subscriber<U>;
  lastSelected: U;
};

let subscriberId = 0;

export class Store<T extends object> {
  private state: T;
  private readonly initialState: T;
  private readonly name?: string;
  private readonly subscribers = new Map<number, InternalSubscriber<T, unknown>>();
  private readonly observers = new Set<Subscriber<T>>();
  private readonly equals: EqualityFn<T>;
  private notifyScheduled = false;

  constructor(initialState: T, options?: StoreOptions<T>) {
    this.state = initialState;
    this.initialState = initialState;
    this.name = options?.name;
    this.equals = (options?.equals ?? shallowEqual) as EqualityFn<T>;
  }

  /** -------------------- Read State -------------------- **/

  /**
   * Gets the current state snapshot.
   *
   * @returns Current state object
   *
   * @example
   * ```ts
   * const user = store.get();
   * console.log(user.name);
   * ```
   */
  get(): T {
    return this.state;
  }

  /**
   * Gets a selected slice of the current state.
   * Convenience method for type-safe property access without subscribing.
   *
   * @param selector - Function to select a slice of state
   * @returns The selected value
   *
   * @example
   * ```ts
   * const count = store.select(state => state.count);
   * const userName = store.select(state => state.user.name);
   * ```
   */
  select<U>(selector: Selector<T, U>): U {
    return selector(this.state);
  }

  /**
   * Gets the store name (if configured).
   *
   * @returns Store name or undefined
   */
  getName(): string | undefined {
    return this.name;
  }

  /** -------------------- Write State -------------------- **/

  /**
   * Replaces the entire state with a new value.
   * Only notifies subscribers if the state actually changed (uses equality check).
   *
   * @param nextState - New state to set
   *
   * @example
   * ```ts
   * store.replace({ name: 'Alice', age: 30 });
   * ```
   */
  replace(nextState: T): void {
    const prevState = this.state;
    if (this.equals(prevState, nextState)) return;

    this.state = nextState;
    this.scheduleNotify(prevState);
  }

  /**
   * Performs a shallow merge of the patch into the current state.
   * Convenience method for partial updates.
   *
   * @param patch - Partial state to merge
   *
   * @example
   * ```ts
   * // Simple field update
   * store.set({ age: 31 }); // ✅ Works
   *
   * // Nested object update - requires immutable pattern
   * store.set({
   *   user: { ...store.get().user, name: 'Alice' } // ✅ Creates new reference
   * });
   *
   * // Array update - requires immutable pattern
   * store.set({
   *   items: [...store.get().items, newItem] // ✅ Creates new array
   * });
   * ```
   */
  set(patch: Partial<T>): void {
    this.replace(shallowMerge(this.state, patch));
  }

  /**
   * Updates state using an updater function.
   * Supports both synchronous and asynchronous updaters.
   *
   * @param updater - Function that receives current state and returns new state
   * @returns Promise that resolves when update is complete
   *
   * @example
   * ```ts
   * // Synchronous update
   * await store.update(state => ({ ...state, count: state.count + 1 }));
   *
   * // Asynchronous update
   * await store.update(async state => {
   *   const data = await fetchData();
   *   return { ...state, data };
   * });
   * ```
   */
  async update(updater: (state: T) => T | Promise<T>): Promise<void> {
    const prevState = this.state;
    const result = updater(prevState);
    const nextState = result instanceof Promise ? await result : result;

    if (this.equals(prevState, nextState)) return;

    this.state = nextState;
    this.scheduleNotify(prevState);
  }

  /**
   * Resets state to the initial value provided during construction.
   *
   * @example
   * ```ts
   * store.reset(); // Reverts to initial state
   * ```
   */
  reset(): void {
    this.replace(this.initialState);
  }

  /** -------------------- Subscriptions -------------------- **/

  /**
   * Subscribes to state changes.
   * Supports both full state and selective subscriptions.
   *
   * @param listener - Callback for full state changes
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // Subscribe to full state
   * const unsubscribe = store.subscribe((state, prev) => {
   *   console.log('State changed:', state);
   * });
   *
   * // Unsubscribe
   * unsubscribe();
   * ```
   */
  subscribe(listener: Subscriber<T>): Unsubscribe;

  /**
   * Subscribes to a selected slice of state.
   * Only notifies when the selected value changes.
   *
   * For selective subscriptions, equality defaults to shallowEqual.
   * For expensive or deeply nested selectors, consider providing a custom equality function.
   *
   * @param selector - Function to select a slice of state
   * @param listener - Callback for selected value changes
   * @param options - Optional equality function for selected value
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * // Subscribe to specific field
   * const unsubscribe = store.subscribe(
   *   state => state.count,
   *   (count, prevCount) => {
   *     console.log('Count changed:', count);
   *   }
   * );
   *
   * // Custom equality for complex objects
   * store.subscribe(
   *   state => state.items,
   *   (items) => console.log('Items:', items),
   *   { equality: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
   * );
   * ```
   */
  subscribe<U>(selector: Selector<T, U>, listener: Subscriber<U>, options?: { equality?: EqualityFn<U> }): Unsubscribe;

  subscribe<U>(
    selectorOrListener: Selector<T, U> | Subscriber<T>,
    listenerOrOptions?: Subscriber<U> | { equality?: EqualityFn<U> },
    options?: { equality?: EqualityFn<U> },
  ): Unsubscribe {
    let selector: Selector<T, U> | undefined;
    let listener: Subscriber<U>;
    let equality: EqualityFn<U>;

    // Overload 1: subscribe(listener) - Full state subscription
    if (typeof selectorOrListener === 'function' && listenerOrOptions === undefined) {
      selector = undefined;
      listener = selectorOrListener as unknown as Subscriber<U>;
      // For full-state subscriptions, use store's configured equality
      equality = this.equals as unknown as EqualityFn<U>;
    }
    // Overload 2: subscribe(selector, listener, options?) - Selective subscription
    else {
      selector = selectorOrListener as Selector<T, U>;
      listener = listenerOrOptions as Subscriber<U>;
      // For selective subscriptions, default to shallowEqual
      equality = options?.equality ?? (shallowEqual as EqualityFn<U>);
    }

    const id = ++subscriberId;
    const initialValue = selector ? selector(this.state) : (this.state as unknown as U);

    const subscriber: InternalSubscriber<T, U> = {
      equality,
      id,
      lastSelected: initialValue,
      listener,
      selector,
    };

    this.subscribers.set(id, subscriber as InternalSubscriber<T, unknown>);

    // Immediately call listener with the current value
    try {
      listener(initialValue, initialValue);
    } catch {
      // Swallow listener errors
    }

    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Observes all state changes without selective filtering.
   * Lower-level API - prefer subscribe() for most use cases.
   *
   * @param observer - Callback for every state change
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = store.observe((state, prev) => {
   *   console.log('State changed from', prev, 'to', state);
   * });
   * ```
   */
  observe(observer: Subscriber<T>): Unsubscribe {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /** -------------------- Scoped Stores -------------------- **/

  /**
   * Creates a child store initialized with current state and optional patch.
   * Child stores are independent - changes don't sync with parent.
   *
   * @param patch - Optional partial state to merge into child's initial state
   * @returns New independent store instance
   *
   * @example
   * ```ts
   * const childStore = store.createChild({ isDraft: true });
   * childStore.set({ name: 'Bob' }); // Doesn't affect parent
   * ```
   */
  createChild(patch?: Partial<T>): Store<T> {
    const childInitialState = patch ? shallowMerge(this.state, patch) : this.state;
    const childName = this.name ? `${this.name}.child` : undefined;

    return new Store<T>(childInitialState, {
      equals: this.equals,
      name: childName,
    });
  }

  /**
   * Executes a function with a scoped child store.
   * Useful for isolated operations without affecting parent state.
   *
   * @param fn - Function to execute with scoped store
   * @param patch - Optional partial state for child store
   * @returns Promise resolving to function result
   *
   * @example
   * ```ts
   * await store.runInScope(async (scopedStore) => {
   *   scopedStore.set({ count: 999 });
   *   console.log(scopedStore.get()); // Scoped changes
   * }, { isDraft: true });
   *
   * console.log(store.get()); // Parent unchanged
   * ```
   */
  async runInScope<R>(fn: (scopedStore: Store<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R> {
    const childStore = this.createChild(patch);
    try {
      return await Promise.resolve(fn(childStore));
    } finally {
      // Child store will be garbage collected
    }
  }

  /** -------------------- Internal Helpers -------------------- **/

  /**
   * Schedules notification of subscribers (batched to next microtask).
   * Prevents redundant notifications within the same tick.
   */
  private scheduleNotify(prevState: T): void {
    if (this.notifyScheduled) return;

    this.notifyScheduled = true;

    Promise.resolve().then(() => {
      this.notifyScheduled = false;
      this.notifySubscribers(prevState);
    });
  }

  /**
   * Notifies all observers and subscribers of state changes.
   * Handles errors gracefully to prevent breaking other listeners.
   */
  private notifySubscribers(prevState: T): void {
    const currentState = this.state;

    // Notify observers (always called for any state change)
    for (const observer of this.observers) {
      try {
        observer(currentState, prevState);
      } catch {
        // Swallow errors to prevent breaking other observers
      }
    }

    // Notify subscribers (only if selected value changed)
    for (const subscriber of this.subscribers.values()) {
      try {
        if (!subscriber.selector) {
          // Full state subscription
          const lastState = subscriber.lastSelected as T;
          if (!subscriber.equality(lastState as never, currentState as never)) {
            subscriber.listener(currentState as never, lastState as never);
            (subscriber as InternalSubscriber<T, T>).lastSelected = currentState;
          }
        } else {
          // Selective subscription
          const selectedValue = subscriber.selector(currentState);
          if (!subscriber.equality(subscriber.lastSelected as never, selectedValue as never)) {
            subscriber.listener(selectedValue as never, subscriber.lastSelected as never);
            subscriber.lastSelected = selectedValue;
          }
        }
      } catch {
        // Swallow errors to prevent breaking other subscribers
      }
    }
  }
}

/** -------------------- Factory Function -------------------- **/

/**
 * Creates a new store with the given initial state.
 *
 * @param initialState - Initial state object
 * @param options - Optional configuration (name, equality function)
 * @returns New store instance
 *
 * @example
 * ```ts
 * const counterStore = createStore({ count: 0 });
 *
 * const userStore = createStore(
 *   { name: 'Alice', age: 30 },
 *   { name: 'userStore' }
 * );
 * ```
 */
export function createStore<T extends object>(initialState: T, options?: StoreOptions<T>): Store<T> {
  return new Store<T>(initialState, options);
}

/** -------------------- Testing Helpers -------------------- **/

/**
 * Creates a test store for isolated testing.
 * Returns a child store and dispose function for cleanup.
 *
 * @param baseStore - Optional base store to create child from
 * @param patch - Optional partial state for test store
 * @returns Object with store instance and dispose function
 *
 * @example
 * ```ts
 * const { store: testStore, dispose } = createTestStore(
 *   baseStore,
 *   { count: 42 }
 * );
 *
 * // Run tests with testStore
 * expect(testStore.get().count).toBe(42);
 *
 * // Cleanup
 * dispose();
 * ```
 */
export function createTestStore<T extends object>(baseStore?: Store<T>, patch?: Partial<T>) {
  const root = baseStore ?? new Store<T>({} as T);
  const testStore = root.createChild(patch);

  return {
    dispose: () => {
      testStore.reset();
    },
    store: testStore,
  };
}

/**
 * Temporarily overrides store state for the duration of a function.
 * Uses a child store to avoid affecting the base store.
 *
 * @param baseStore - Base store to derive from
 * @param patch - Temporary state override
 * @param fn - Function to execute with overridden state
 * @returns Promise resolving to function result
 *
 * @example
 * ```ts
 * await withMock(store, { count: 77 }, async () => {
 *   // Inside this scope, store appears to have count: 77
 *   console.log(store.get().count); // 77
 * });
 *
 * console.log(store.get().count); // Original value
 * ```
 */
export async function withMock<T extends object, R>(
  baseStore: Store<T>,
  patch: Partial<T>,
  fn: () => R | Promise<R>,
): Promise<R> {
  return baseStore.runInScope(fn, patch);
}
