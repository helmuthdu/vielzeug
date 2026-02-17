/** -------------------- Core Types -------------------- **/

export type Listener<T> = (curr: T, prev: T) => void;
export type Selector<T, U> = (data: T) => U;
export type Unsubscribe = () => void;
export type EqualityFn<U> = (a: U, b: U) => boolean;

export type StateOptions<T> = {
  name?: string;
  equals?: EqualityFn<T>;
};

export type Computed<U> = {
  get: () => U;
  subscribe: (listener: Listener<U>) => Unsubscribe;
};

/** -------------------- Equality Utilities -------------------- **/

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
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

export function shallowMerge<T extends object>(state: T, patch: Partial<T>): T {
  const base = Array.isArray(state) ? [...state] : { ...state };
  return Object.assign(base, patch) as T;
}

/** -------------------- Store Implementation -------------------- **/

type Subscription<T, U> = {
  id: number;
  selector?: Selector<T, U>;
  equality: EqualityFn<U>;
  listener: Listener<U>;
  lastValue: U;
};

let nextId = 0;

export class State<T extends object> {
  private state: T;
  private readonly initialState: T;
  private readonly name?: string;
  private readonly subscriptions = new Map<number, Subscription<T, unknown>>();
  private readonly equals: EqualityFn<T>;
  private scheduled = false;
  private transacting = false;

  constructor(initialState: T, options?: StateOptions<T>) {
    this.state = initialState;
    this.initialState = initialState;
    this.name = options?.name;
    this.equals = (options?.equals ?? shallowEqual) as EqualityFn<T>;
  }

  /** -------------------- Read State -------------------- **/

  get(): T;
  get<U>(selector: Selector<T, U>): U;
  get<U>(selector?: Selector<T, U>): T | U {
    return selector ? selector(this.state) : this.state;
  }

  /** -------------------- Write State -------------------- **/

  set(patch: Partial<T>): void;
  set(updater: (data: T) => T | Promise<T>): Promise<void>;
  set(patchOrUpdater: Partial<T> | ((data: T) => T | Promise<T>)): void | Promise<void> {
    const prevState = this.state;

    // Handle partial object merge
    if (typeof patchOrUpdater !== 'function') {
      const nextState = shallowMerge(prevState, patchOrUpdater);
      if (this.equals(prevState, nextState)) return;
      this.state = nextState;
      this.notify();
      return;
    }

    // Handle updater function (sync or async)
    const result = patchOrUpdater(prevState);

    // Check if a result is a Promise (async updater)
    if (result instanceof Promise) {
      return result.then((nextState) => {
        if (this.equals(prevState, nextState)) return;
        this.state = nextState;
        this.notify();
      });
    }

    // Sync updater
    if (this.equals(prevState, result)) return;
    this.state = result;
    this.notify();
  }

  reset(): void {
    this.set(this.initialState);
  }

  /** -------------------- Subscriptions -------------------- **/

  subscribe(listener: Listener<T>): Unsubscribe;
  subscribe<U>(selector: Selector<T, U>, listener: Listener<U>, options?: { equality?: EqualityFn<U> }): Unsubscribe;
  subscribe<U>(
    selectorOrListener: Selector<T, U> | Listener<T>,
    listenerOrOptions?: Listener<U> | { equality?: EqualityFn<U> },
    options?: { equality?: EqualityFn<U> },
  ): Unsubscribe {
    let selector: Selector<T, U> | undefined;
    let listener: Listener<U>;
    let equality: EqualityFn<U>;

    if (typeof selectorOrListener === 'function' && listenerOrOptions === undefined) {
      // Full state subscription
      selector = undefined;
      listener = selectorOrListener as unknown as Listener<U>;
      equality = this.equals as unknown as EqualityFn<U>;
    } else {
      // Selective subscription
      selector = selectorOrListener as Selector<T, U>;
      listener = listenerOrOptions as Listener<U>;
      equality = options?.equality ?? (shallowEqual as EqualityFn<U>);
    }

    const id = ++nextId;
    const initialValue = selector ? selector(this.state) : (this.state as unknown as U);

    const subscription: Subscription<T, U> = {
      equality,
      id,
      lastValue: initialValue,
      listener,
      selector,
    };

    this.subscriptions.set(id, subscription as Subscription<T, unknown>);

    // Call listener immediately with the current value
    try {
      listener(initialValue, initialValue);
    } catch {
      // Swallow errors
    }

    return () => {
      this.subscriptions.delete(id);
    };
  }

  /** -------------------- Computed Values -------------------- **/

  computed<U>(
    selector: Selector<T, U>,
    options?: { equality?: EqualityFn<U> },
  ): Computed<U> {
    let cachedValue = selector(this.state);
    let cachedState = this.state;
    const equality = (options?.equality ?? shallowEqual) as EqualityFn<U>;
    const listeners = new Set<Listener<U>>();
    let isInitialCall = true;

    // Subscribe to state changes
    this.subscribe((current) => {
      // Skip the initial call from subscribe
      if (isInitialCall) {
        isInitialCall = false;
        return;
      }

      const newValue = selector(current);
      if (!equality(cachedValue as never, newValue as never)) {
        const prev = cachedValue;
        cachedValue = newValue;
        cachedState = current;

        for (const listener of listeners) {
          try {
            listener(newValue, prev);
          } catch {
            // Swallow errors
          }
        }
      }
    });

    return {
      get: () => {
        // If state changed, recompute
        if (this.state !== cachedState) {
          cachedValue = selector(this.state);
          cachedState = this.state;
        }
        return cachedValue;
      },
      subscribe: (listener: Listener<U>) => {
        listeners.add(listener);
        // Call listener immediately with current value
        try {
          listener(cachedValue, cachedValue);
        } catch {
          // Swallow errors
        }
        return () => listeners.delete(listener);
      },
    };
  }

  /** -------------------- Transactions -------------------- **/

  transaction(fn: () => void): void {
    if (this.transacting) {
      // Already in a transaction, just run the function
      fn();
      return;
    }

    this.transacting = true;
    try {
      fn();
    } finally {
      this.transacting = false;
      this.notify();
    }
  }

  /** -------------------- Scoped Stores -------------------- **/

  createChild(patch?: Partial<T>): State<T> {
    const childInitialState = patch ? shallowMerge(this.state, patch) : this.state;
    const childName = this.name ? `${this.name}.child` : undefined;

    return new State<T>(childInitialState, {
      equals: this.equals,
      name: childName,
    });
  }

  async runInScope<R>(fn: (scopedState: State<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R> {
    const childStore = this.createChild(patch);
    try {
      return fn(childStore);
    } finally {
      // Child store will be garbage collected
    }
  }

  /** -------------------- Internal Helpers -------------------- **/

  private notify(): void {
    if (this.scheduled || this.transacting) return;

    this.scheduled = true;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
    Promise.resolve().then(() => {
      this.scheduled = false;
      const currentState = this.state;

      for (const subscription of this.subscriptions.values()) {
        try {
          if (!subscription.selector) {
            // Full state subscription
            const lastState = subscription.lastValue as T;
            if (!subscription.equality(lastState as never, currentState as never)) {
              subscription.listener(currentState as never, lastState as never);
              (subscription as Subscription<T, T>).lastValue = currentState;
            }
          } else {
            // Selective subscription
            const selectedValue = subscription.selector(currentState);
            if (!subscription.equality(subscription.lastValue as never, selectedValue as never)) {
              subscription.listener(selectedValue as never, subscription.lastValue as never);
              subscription.lastValue = selectedValue;
            }
          }
        } catch {
          // Swallow errors to prevent breaking other subscribers
        }
      }
    });
  }
}

/** -------------------- Factory Function -------------------- **/

export function createSnapshot<T extends object>(initialState: T, options?: StateOptions<T>): State<T> {
  return new State<T>(initialState, options);
}

/** -------------------- Testing Helpers -------------------- **/

export function createTestState<T extends object>(baseState?: State<T>, patch?: Partial<T>) {
  const root = baseState ?? new State<T>({} as T);
  const testState = root.createChild(patch);

  return {
    dispose: () => {
      testState.reset();
    },
    state: testState,
  };
}

export async function withStateMock<T extends object, R>(
  baseStore: State<T>,
  patch: Partial<T>,
  fn: (scopedState: State<T>) => R | Promise<R>,
): Promise<R> {
  return baseStore.runInScope(fn, patch);
}
