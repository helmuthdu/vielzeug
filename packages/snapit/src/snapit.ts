/** -------------------- Core Types -------------------- **/

export type Listener<T> = (curr: T, prev: T) => void;
export type Selector<T, U> = (data: T) => U;
export type Unsubscribe = () => void;
export type EqualityFn<U> = (a: U, b: U) => boolean;

export type StateOptions<T> = {
  name?: string;
  equals?: EqualityFn<T>;
};

export type SubscribeOptions<U> = {
  equality?: EqualityFn<U>;
};

export type Computed<U> = {
  get: () => U;
  subscribe: (listener: Listener<U>) => Unsubscribe;
  dispose: () => void;
};

/** -------------------- Equality Utilities -------------------- **/

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
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
  return (Array.isArray(state) ? Object.assign([...state], patch) : { ...state, ...patch }) as T;
}

/** -------------------- Store Implementation -------------------- **/

type Subscription<T> = {
  dispatch: (current: T) => void;
};

export class State<T extends object> {
  private static nextId = 0;
  private state: T;
  private readonly initialState: T;
  private readonly name?: string;
  private readonly subscriptions = new Map<number, Subscription<T>>();
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

    if (typeof patchOrUpdater !== 'function') {
      const nextState = shallowMerge(prevState, patchOrUpdater);
      if (this.equals(prevState, nextState)) return;
      this.state = nextState;
      this.notify();
      return;
    }

    const result = patchOrUpdater(prevState);

    if (result instanceof Promise) {
      return result.then((nextState) => {
        if (this.equals(this.state, nextState)) return;
        this.state = nextState;
        this.notify();
      });
    }

    if (this.equals(prevState, result)) return;
    this.state = result;
    this.notify();
  }

  reset(): void {
    if (this.equals(this.state, this.initialState)) return;
    this.state = this.initialState;
    this.notify();
  }

  /** -------------------- Subscriptions -------------------- **/

  subscribe(listener: Listener<T>): Unsubscribe;
  subscribe<U>(selector: Selector<T, U>, listener: Listener<U>, options?: SubscribeOptions<U>): Unsubscribe;
  subscribe<U>(
    selectorOrListener: Selector<T, U> | Listener<T>,
    listenerArg?: Listener<U> | SubscribeOptions<U>,
    options?: SubscribeOptions<U>,
  ): Unsubscribe {
    let selector: Selector<T, U> | undefined;
    let listener: Listener<U>;
    let equality: EqualityFn<U>;

    if (typeof selectorOrListener === 'function' && listenerArg === undefined) {
      // Full state subscription
      listener = selectorOrListener as unknown as Listener<U>;
      equality = this.equals as unknown as EqualityFn<U>;
    } else {
      // Selective subscription
      selector = selectorOrListener as Selector<T, U>;
      listener = listenerArg as Listener<U>;
      equality = options?.equality ?? (shallowEqual as EqualityFn<U>);
    }

    const id = ++State.nextId;
    let lastValue = selector ? selector(this.state) : (this.state as unknown as U);

    this.subscriptions.set(id, {
      dispatch: (current: T) => {
        const next = (selector ? selector(current) : current) as U;
        if (!equality(lastValue, next)) {
          listener(next, lastValue);
          lastValue = next;
        }
      },
    });

    // Call listener immediately with the current value
    try {
      listener(lastValue, lastValue);
    } catch {
      // Swallow errors
    }

    return () => this.subscriptions.delete(id);
  }

  /** -------------------- Computed Values -------------------- **/

  computed<U>(selector: Selector<T, U>, options?: SubscribeOptions<U>): Computed<U> {
    let cachedValue = selector(this.state);
    let cachedState = this.state;
    const equality = (options?.equality ?? shallowEqual) as EqualityFn<U>;
    const listeners = new Set<Listener<U>>();

    // Use _addSubscription to avoid the eager listener invocation that this.subscribe() triggers
    const unsubscribe = this._addSubscription((current) => {
      const newValue = selector(current);
      if (!equality(cachedValue, newValue)) {
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
      dispose: () => {
        unsubscribe();
        listeners.clear();
      },
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
    return new State<T>(patch ? shallowMerge(this.state, patch) : this.state, {
      equals: this.equals,
      name: this.name ? `${this.name}.child` : undefined,
    });
  }

  async runInScope<R>(fn: (scopedState: State<T>) => R | Promise<R>, patch?: Partial<T>): Promise<R> {
    return fn(this.createChild(patch));
  }

  /** -------------------- Internal Helpers -------------------- **/

  private _addSubscription(dispatch: (current: T) => void): Unsubscribe {
    const id = ++State.nextId;
    this.subscriptions.set(id, { dispatch });
    return () => this.subscriptions.delete(id);
  }

  private notify(): void {
    if (this.scheduled || this.transacting) return;
    this.scheduled = true;

    Promise.resolve().then(() => {
      this.scheduled = false;
      const current = this.state;
      for (const sub of this.subscriptions.values()) {
        try {
          sub.dispatch(current);
        } catch {}
      }
    });
  }
}

/** -------------------- Factory Function -------------------- **/

export function createSnapshot<T extends object>(initialState: T, options?: StateOptions<T>): State<T> {
  return new State<T>(initialState, options);
}

export type Snapshot<T extends object> = State<T>;

/** -------------------- Testing Helpers -------------------- **/

export function createTestState<T extends object>(baseState: State<T> | T, patch?: Partial<T>) {
  const testState =
    baseState instanceof State
      ? baseState.createChild(patch)
      : new State<T>(patch ? shallowMerge(baseState as T, patch) : (baseState as T));

  return {
    dispose: () => {
      testState.reset();
    },
    state: testState,
  };
}

export function withStateMock<T extends object, R>(
  state: State<T>,
  patch: Partial<T>,
  fn: (scopedState: State<T>) => R | Promise<R>,
): Promise<R> {
  return state.runInScope(fn, patch);
}
