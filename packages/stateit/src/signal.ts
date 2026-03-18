import { ReactiveNode } from './runtime';
import { type EqualityFn, type ReactiveOptions, type ReadonlySignal, type Signal, _SIGNAL_BRAND } from './types';

/** @internal */
export class SignalImpl<T> extends ReactiveNode implements Signal<T> {
  readonly [_SIGNAL_BRAND] = true as const;
  #value: T;
  #equals: EqualityFn<T>;

  constructor(initial: T, options?: ReactiveOptions<T>) {
    super();
    this.#value = initial;
    this.#equals = options?.equals ?? Object.is;
  }

  get value(): T {
    this._track();

    return this.#value;
  }

  set value(next: T) {
    if (this.#equals(this.#value, next)) return;

    this.#value = next;
    this._notify();
  }

  update(fn: (current: T) => T): void {
    this.value = fn(this.#value);
  }

  peek(): T {
    return this.#value;
  }
}

/** Creates a reactive signal holding a single value. */
export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> => new SignalImpl(initial, options);

const _readonlyCache = new WeakMap<object, ReadonlySignal<unknown>>();

/**
 * Returns a stable read-only view of a signal. Hides the setter at both type and runtime
 * level. The wrapper is cached — repeated calls with the same signal return the same reference.
 */
export const readonly = <T>(sig: ReadonlySignal<T>): ReadonlySignal<T> => {
  const cached = _readonlyCache.get(sig as object);

  if (cached) return cached as ReadonlySignal<T>;

  const wrapper: ReadonlySignal<T> = {
    get [_SIGNAL_BRAND]() {
      return true as const;
    },
    peek: () => sig.peek(),
    get value() {
      return sig.value;
    },
  };

  _readonlyCache.set(sig as object, wrapper as ReadonlySignal<unknown>);

  return wrapper;
};

/** Type guard -- identifies Signal instances (works through composition and subclasses). */
export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && _SIGNAL_BRAND in (value as object);

/** Unwraps a plain value or Signal to its current value. Reads are tracked if called inside an effect. */
export const toValue = <T>(v: T | ReadonlySignal<T>): T => (isSignal<T>(v) ? v.value : v);

/** Unwraps a plain value or Signal to its current value without registering a reactive subscription. */
export const peekValue = <T>(v: T | ReadonlySignal<T>): T => (isSignal<T>(v) ? v.peek() : v);
