import { type ComputedSignal, computed } from './computed';
import { _DEV } from './runtime';
import { SignalImpl } from './signal';
import { type EqualityFn, type ReactiveOptions, type Signal, _STORE_BRAND } from './types';

/**
 * Shallow structural equality — compares own enumerable keys by reference.
 * This is the default equality function used by `store()`. Export it to avoid
 * reimplementation when composing custom `StoreOptions.equals`.
 */
export const shallowEqual: EqualityFn<unknown> = (a, b) => {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }

  return true;
};

export type StoreOptions<T extends object> = {
  /** Custom equality for top-level change detection. Default: shallowEqual */
  equals?: EqualityFn<T>;
};

/** Reactive store for object state. Implements Signal<T> so all signal primitives work natively. */
export interface Store<T extends object> extends Signal<T> {
  readonly frozen: boolean;
  /** Shallow-merge a partial object into the current state. */
  patch(partial: Partial<T>): void;
  /** Derive the next state from the current state via an updater function.
   *  Receives a shallow copy of the current state — mutations in the updater are safe. */
  update(fn: (s: T) => T): void;
  /** Reset to the original initial state. */
  reset(): void;
  /** Create a lazily recomputed derived signal from a slice of this store's state. */
  select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U>;
  /** Freeze the store. Further writes via patch/update/reset are silently ignored. */
  freeze(): void;
}

/** @internal */
class StoreImpl<T extends object> extends SignalImpl<T> implements Store<T> {
  readonly [_STORE_BRAND] = true as const;

  readonly #initial: T;
  #frozen = false;

  constructor(initial: T, options?: StoreOptions<T>) {
    super(initial, { equals: options?.equals ?? (shallowEqual as EqualityFn<T>) });
    this.#initial = { ...initial }; // defensive copy — external mutation cannot corrupt reset()
  }

  get frozen(): boolean {
    return this.#frozen;
  }

  override get value(): T {
    return super.value;
  }

  override set value(next: T) {
    if (this.#frozen) {
      if (_DEV) console.warn('[stateit] store is frozen — write ignored.');

      return;
    }

    super.value = next;
  }

  patch(partial: Partial<T>): void {
    this.value = { ...this.peek(), ...partial };
  }

  update(fn: (s: T) => T): void {
    this.value = fn({ ...this.peek() });
  }

  reset(): void {
    this.value = { ...this.#initial };
  }

  select<U>(selector: (s: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => selector(this.value), options);
  }

  freeze(): void {
    this.#frozen = true;
  }
}

/** Creates a reactive store for the object state. */
export const store = <T extends object>(initial: T, options?: StoreOptions<T>): Store<T> =>
  new StoreImpl(initial, options);

/** Type guard -- identifies Store instances. */
export const isStore = <T extends object = Record<string, unknown>>(value: unknown): value is Store<T> =>
  typeof value === 'object' && value !== null && _STORE_BRAND in value;
