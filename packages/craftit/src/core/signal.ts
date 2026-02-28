/**
 * Craftit - Signal System
 * Fine-grained reactivity with automatic dependency tracking
 */

// Global effect tracking
let activeEffect: Effect | null = null;
const effectStack: Effect[] = [];

// Batching state
let isBatching = false;
let batchDepth = 0;
const pendingEffects = new Set<Effect>();
let flushScheduled = false;

/**
 * Global error handler for effects
 */
let globalErrorHandler: ((error: unknown, context: string) => void) | null = null;

/**
 * Set global error handler for effects
 *
 * @example
 * setEffectErrorHandler((error, context) => {
 *   console.error(`[${context}]`, error);
 *   reportToSentry(error);
 * });
 */
export function setEffectErrorHandler(handler: ((error: unknown, context: string) => void) | null): void {
  globalErrorHandler = handler;
}

/**
 * Handle effect errors
 */
function handleEffectError(error: unknown, context: string): void {
  if (globalErrorHandler) {
    globalErrorHandler(error, context);
  } else {
    console.error(`[craftit:${context}]`, error);
  }
}

/**
 * Cleanup function type
 */
export type Cleanup = () => void;

/**
 * Effect class for dependency tracking
 */
class Effect {
  public dependencies = new Set<Cleanup>();
  public fn: () => unknown;
  private cleanup?: Cleanup;
  private isDisposed = false;

  constructor(fn: () => unknown) {
    this.fn = fn;
  }

  execute(): void {
    // Don't execute if disposed
    if (this.isDisposed) return;

    this.cleanup?.();
    this.cleanupDependencies();

    effectStack.push(this);
    activeEffect = this;

    try {
      const result = this.fn();
      if (typeof result === 'function') {
        this.cleanup = result as Cleanup;
      }
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  }

  cleanupDependencies(): void {
    for (const cleanup of this.dependencies) {
      cleanup();
    }
    this.dependencies.clear();
  }

  dispose(): void {
    this.isDisposed = true;
    this.cleanup?.();
    this.cleanupDependencies();
  }
}

/**
 * Signal - reactive primitive
 */
export class Signal<T> {
  #value: T;
  #subscribers = new Set<Effect>();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get value(): T {
    // Track dependency if inside effect
    if (activeEffect) {
      const effect = activeEffect;
      this.#subscribers.add(effect);
      effect.dependencies.add(() => {
        this.#subscribers.delete(effect);
      });
    }
    return this.#value;
  }

  set value(newValue: T) {
    if (Object.is(this.#value, newValue)) return;

    this.#value = newValue;
    this.#notify();
  }

  #notify(): void {
    // Collect subscribers
    const subscribers = Array.from(this.#subscribers);

    if (isBatching) {
      // Add to pending effects queue
      for (const subscriber of subscribers) {
        pendingEffects.add(subscriber);
      }

      // Schedule flush if not already scheduled
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flushEffects);
      }
    } else {
      // Execute immediately
      for (const subscriber of subscribers) {
        subscriber.execute();
      }
    }
  }

  /**
   * Get value without tracking dependency
   */
  peek(): T {
    return this.#value;
  }

  /**
   * Update value using a function
   */
  update(updater: (current: T) => T): void {
    this.value = updater(this.#value);
  }

  /**
   * Convert to string (for template interpolation)
   */
  toString(): string {
    return String(this.value);
  }
}

/**
 * Create a reactive signal
 */
export function signal<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
}

/**
 * Computed signal - automatically cached and reactive
 */
export class ComputedSignal<T> {
  #value?: T;
  #dirty = true;
  #fn: () => T;
  #effect?: Effect;
  #subscribers = new Set<Effect>();
  #equals: (a: T, b: T) => boolean;

  constructor(fn: () => T, options?: { equals?: (a: T, b: T) => boolean }) {
    this.#fn = fn;
    this.#equals = options?.equals || Object.is;
    this.#setupEffect();
  }

  #setupEffect(): void {
    this.#effect = new Effect(() => {
      // This runs when dependencies change
      // Just mark as dirty and notify subscribers
      this.#dirty = true;

      const subscribers = Array.from(this.#subscribers);
      for (const subscriber of subscribers) {
        subscriber.execute();
      }
    });
  }

  get value(): T {
    // Track as dependency of current effect
    if (activeEffect) {
      const effect = activeEffect;
      this.#subscribers.add(effect);
      effect.dependencies.add(() => {
        this.#subscribers.delete(effect);
      });
    }

    // Recompute if dirty
    if (this.#dirty) {
      this.#recompute();
    }

    return this.#value!;
  }

  #recompute(): void {
    // Dispose old effect
    if (this.#effect) {
      this.#effect.dispose();
    }

    // Set up effect to track dependencies
    this.#effect = new Effect(() => {
      // This is the recompute function
      const newValue = this.#fn();

      // Only update if value actually changed according to equality function
      if (this.#value === undefined || !this.#equals(this.#value, newValue)) {
        this.#value = newValue;
      }
    });

    // Execute to get value and track dependencies
    try {
      this.#effect.execute();
      this.#dirty = false;
    } catch (error) {
      // Keep dirty on error so next read will retry
      this.#dirty = true;
      throw error;
    }

    // Override the effect function to mark dirty when dependencies change
    this.#effect.fn = () => {
      this.#dirty = true;
      const subscribers = Array.from(this.#subscribers);
      for (const subscriber of subscribers) {
        subscriber.execute();
      }
    };
  }

  peek(): T {
    if (this.#dirty) {
      this.#recompute();
    }
    return this.#value!;
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * Create a computed signal
 *
 * @param fn - Function to compute the value
 * @param options - Options for equality checking
 * @example
 * // Default equality (Object.is)
 * const count = computed(() => items.value.length);
 *
 * // Custom equality for objects
 * const summary = computed(() => ({
 *   count: items.value.length,
 *   total: items.value.reduce((a, b) => a + b.price, 0)
 * }), {
 *   equals: (a, b) => a.count === b.count && a.total === b.total
 * });
 */
export function computed<T>(fn: () => T, options?: { equals?: (a: T, b: T) => boolean }): ComputedSignal<T> {
  return new ComputedSignal(fn, options);
}

/**
 * Shallow equality check for objects
 */
export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check (for simple objects/arrays)
 *
 * ⚠️ WARNING: Not cycle-safe! Use only for simple, non-circular structures.
 * For complex objects with circular references, use a dedicated deep-equal library.
 *
 * @example
 * deepEqual([1, 2, 3], [1, 2, 3]) // true
 * deepEqual({ a: 1 }, { a: 1 }) // true
 *
 * // Don't use with circular structures:
 * // const obj = { self: null };
 * // obj.self = obj; // Will cause stack overflow!
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return Object.is(a, b);

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!deepEqual((a as any)[key], (b as any)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Create a readonly version of a signal
 */
export function readonly<T>(source: Signal<T>): ComputedSignal<T> {
  return computed(() => source.value);
}

/**
 * Effect - runs code and tracks dependencies
 * Automatically handles both sync and async functions
 *
 * ⚠️ AVOID INFINITE LOOPS:
 * Effects that write to signals they read from can create infinite loops.
 * Use batching or conditional logic to prevent feedback loops.
 *
 * @example Sync effect
 * effect(() => {
 *   console.log('Count:', count.value);
 * });
 *
 * @example Async effect with AbortSignal
 * effect(async (signal) => {
 *   const data = await fetch(`/api/${id.value}`, { signal });
 *   result.value = await data.json();
 * });
 *
 * @example Avoid infinite loops
 * // ❌ Bad: creates infinite loop
 * effect(() => {
 *   count.value = count.value + 1; // Reads and writes same signal!
 * });
 *
 * // ✅ Good: conditional write
 * effect(() => {
 *   if (trigger.value) {
 *     count.value = 0; // Only writes when condition changes
 *   }
 * });
 */
export function effect(
  fn: (() => unknown) | ((signal: AbortSignal) => Promise<unknown>) | (() => Promise<unknown>),
): Cleanup {
  // Check if function accepts signal parameter or is async
  // Note: constructor.name check is best-effort and may not work in all bundlers/minifiers
  // For reliability, use explicit async functions or pass AbortSignal parameter
  const fnLength = fn.length;
  const isAsync = fn.constructor.name === 'AsyncFunction';

  // If it's async, handle async
  if (isAsync) {
    let cleanup: Cleanup | undefined;
    let currentController: AbortController | null = null;

    // Create a sync effect that manages the async execution
    const eff = new Effect(() => {
      // Cleanup previous run
      cleanup?.();

      // Abort previous async operation
      if (currentController) {
        currentController.abort();
      }

      // Create new controller for this run
      currentController = new AbortController();
      const controller = currentController;

      // Run async function - pass signal if function accepts it
      const promise =
        fnLength > 0
          ? (fn as (signal: AbortSignal) => Promise<unknown>)(controller.signal)
          : (fn as () => Promise<unknown>)();

      promise
        .then((asyncResult) => {
          // Only set cleanup if this run wasn't aborted
          if (!controller.signal.aborted && typeof asyncResult === 'function') {
            cleanup = asyncResult as Cleanup;
          }
        })
        .catch((err) => {
          // Only a log error if this run wasn't aborted
          if (!controller.signal.aborted) {
            handleEffectError(err, 'async-effect');
          }
        });
    });

    eff.execute();

    return () => {
      cleanup?.();
      if (currentController) {
        currentController.abort();
      }
      eff.dispose();
    };
  }

  // Handle sync
  const eff = new Effect(fn as () => unknown);
  eff.execute();

  return () => eff.dispose();
}

/**
 * Watch a signal or multiple signals and run callback when they change
 *
 * @example Single source
 * watch(count, (newVal, oldVal) => console.log(newVal))
 *
 * @example Multiple sources
 * watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
 *   console.log(newCount, newName)
 * })
 */
export function watch<T>(
  source: Signal<T> | ComputedSignal<T> | (() => T),
  callback: (newValue: T, oldValue: T) => void,
  options?: { immediate?: boolean },
): Cleanup;
export function watch<T extends readonly unknown[]>(
  sources: { [K in keyof T]: Signal<T[K]> | ComputedSignal<T[K]> | (() => T[K]) },
  callback: (newValues: T, oldValues: T) => void,
  options?: { immediate?: boolean },
): Cleanup;
export function watch(
  source:
    | Signal<any>
    | ComputedSignal<any>
    | (() => any)
    | ReadonlyArray<Signal<any> | ComputedSignal<any> | (() => any)>,
  callback: (newValue: any, oldValue: any) => void,
  options?: { immediate?: boolean },
): Cleanup {
  let oldValue: any;

  // Create getter function(s)
  const getter = Array.isArray(source)
    ? () => source.map((s) => (typeof s === 'function' ? s() : s.value))
    : typeof source === 'function'
      ? source
      : () => (source as Signal<any> | ComputedSignal<any>).value;

  // Get initial value
  oldValue = getter();

  // Run immediately if requested
  if (options?.immediate) {
    callback(oldValue, oldValue);
  }

  // Watch for changes
  return effect(() => {
    const newValue = getter();

    // Check if changed (handles both single values and arrays)
    const hasChanged = Array.isArray(newValue)
      ? newValue.some((val, i) => !Object.is(val, (oldValue as any[])[i]))
      : !Object.is(newValue, oldValue);

    if (hasChanged) {
      callback(newValue, oldValue);
      oldValue = newValue;
    }
  });
}

/**
 * Start a batch - internal helper
 */
function startBatch(): void {
  batchDepth++;
  isBatching = true;
}

/**
 * End a batch and flush if depth reaches 0 - internal helper
 */
function endBatch(): void {
  batchDepth--;
  if (batchDepth === 0) {
    isBatching = false;
    flushEffects();
  }
}

/**
 * Flush pending effects - internal helper
 */
function flushEffects(): void {
  flushScheduled = false;

  if (pendingEffects.size === 0) return;

  // Copy and clear pending effects
  const effects = Array.from(pendingEffects);
  pendingEffects.clear();

  // Execute all pending effects
  for (const effect of effects) {
    effect.execute();
  }
}

/**
 * Batch multiple signal updates
 * Groups multiple signal updates to trigger only one re-render
 *
 * @example
 * batch(() => {
 *   count.value++;
 *   name.value = 'Alice';
 *   // Only triggers one effect execution
 * });
 */
export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}

/**
 * Untrack - run code without tracking dependencies
 */
export function untrack<T>(fn: () => T): T {
  const prev = activeEffect;
  activeEffect = null;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}
