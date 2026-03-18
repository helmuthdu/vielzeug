import { ReactiveNode, _DEV, _UNINITIALIZED, _withCtx } from './runtime';
import {
  type CleanupFn,
  type Disposable,
  type EffectCallback,
  type EqualityFn,
  type ReactiveOptions,
  type ReadonlySignal,
  type Signal,
  _SIGNAL_BRAND,
} from './types';

/** A derived read-only signal with an explicit dispose method. */
export interface ComputedSignal<T> extends ReadonlySignal<T>, Disposable {
  /** True when the computed value is stale (deps changed but not yet re-read) or disposed. */
  readonly stale: boolean;
}

/** @internal
 * Lazy computed node. Seeded once at construction so .peek() is immediately valid
 * (unless { lazy: true } is passed, in which case first compute defers to first read).
 *  - On dep change: marks dirty, notifies downstream (no recompute yet).
 *  - On .value read: recomputes if dirty, re-tracks fresh deps.
 *  - After dispose: _track() is skipped to prevent leaking outer effects.
 */
export class ComputedNode<T> extends ReactiveNode implements ComputedSignal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  #compute: () => T;
  #value: T | typeof _UNINITIALIZED = _UNINITIALIZED;
  #dirty = true;
  #disposed = false;
  #equals: EqualityFn<T>;
  #deps = new Set<CleanupFn>();

  readonly #onDepChange: EffectCallback = () => {
    if (!this.#dirty) {
      this.#dirty = true;
      this._notify();
    }
  };

  constructor(compute: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }) {
    super();
    this.#compute = compute;
    this.#equals = options?.equals ?? Object.is;

    if (!options?.lazy) this.#recompute(); // seed: ensures peek() is valid immediately
  }

  #recompute(): void {
    for (const unsub of this.#deps) unsub();
    this.#deps.clear();

    const result = _withCtx(this.#onDepChange, this.#deps, null, this.#compute);

    this.#dirty = false;

    if (this.#value === _UNINITIALIZED || !this.#equals(this.#value as T, result)) {
      this.#value = result;
    }
  }

  get value(): T {
    if (this.#disposed) {
      if (_DEV) console.warn('[stateit] Reading a disposed ComputedSignal returns a stale value.');

      return this.#value as T;
    }

    if (this.#dirty) this.#recompute();

    this._track();

    return this.#value as T;
  }

  peek(): T {
    if (this.#value === _UNINITIALIZED) {
      if (this.#disposed) {
        if (_DEV)
          console.warn(
            '[stateit] peek() called on a disposed lazy ComputedSignal that was never read — returning undefined.',
          );

        return undefined as unknown as T;
      }

      this.#recompute();
    }

    return this.#value as T;
  }

  get stale(): boolean {
    return this.#dirty || this.#disposed;
  }

  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    for (const unsub of this.#deps) unsub();
    this.#deps.clear();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

/** Creates a derived read-only Signal whose value is recomputed lazily on `.value` read
 * when dependencies have changed. Call `.dispose()` to stop tracking and free dependencies.
 * Pass `{ lazy: true }` to defer the initial computation until the first `.value` read. */
export const computed = <T>(compute: () => T, options?: ReactiveOptions<T> & { lazy?: boolean }): ComputedSignal<T> =>
  new ComputedNode(compute, options);

/** A bidirectional computed Signal with an explicit dispose method. */
export interface WritableSignal<T> extends Signal<T>, Disposable {
  /** True when the backing computed value is stale (deps changed but not yet re-read) or disposed. */
  readonly stale: boolean;
}

/** @internal */
export class WritableNode<T> extends ComputedNode<T> implements WritableSignal<T> {
  readonly #set: (v: T) => void;

  constructor(get: () => T, set: (v: T) => void, options?: ReactiveOptions<T>) {
    super(get, options);
    this.#set = set;
  }

  override get value(): T {
    return super.value;
  }

  set value(v: T) {
    this.#set(v);
  }

  update(fn: (current: T) => T): void {
    this.#set(fn(this.peek()));
  }
}

/** Creates a bidirectional computed Signal. Reads track the getter reactively;
 * writes are forwarded to `set`. Call `.dispose()` to stop tracking and free dependencies. */
export const writable = <T>(get: () => T, set: (value: T) => void, options?: ReactiveOptions<T>): WritableSignal<T> =>
  new WritableNode(get, set, options);

/**
 * Creates a derived ComputedSignal by combining multiple source signals through a projector
 * function. Each source is passed as a positional argument to `fn`; the projector is
 * re-evaluated whenever any source changes.
 *
 * @example
 * const total = derived([price, quantity, discount], (p, q, d) => p * q * (1 - d));
 */
export const derived = <const Srcs extends ReadonlyArray<ReadonlySignal<unknown>>, R>(
  sources: Srcs,
  fn: (...values: { [K in keyof Srcs]: Srcs[K] extends ReadonlySignal<infer V> ? V : never }) => R,
  options?: ReactiveOptions<R>,
): ComputedSignal<R> => computed(() => (fn as (...args: any[]) => R)(...sources.map((s) => s.value)), options);
