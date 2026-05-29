import type { ComputedSignal, ReactiveOptions, Signal, Store, Subscription } from './types';

import { computed } from './computed';
import { StateError } from './error';
import { IS_SIGNAL, IS_STORE } from './helpers';
import { SignalImpl } from './signal';

// ── LensImpl ──────────────────────────────────────────────────────────────────

class LensImpl<T extends object, K extends keyof T & string> implements Signal<T[K]> {
  [IS_SIGNAL] = true;

  private readonly keyComputed_: ComputedSignal<T[K]>;
  private readonly store_: StoreImpl<T>;
  private readonly key_: K;

  constructor(store: StoreImpl<T>, key: K) {
    this.store_ = store;
    this.key_ = key;
    this.keyComputed_ = computed(() => store.value[key]);
  }

  get value(): T[K] {
    return this.keyComputed_.value;
  }

  set value(next: T[K]) {
    this.store_.patch({ [this.key_]: next } as unknown as Partial<T>);
  }

  peek(): T[K] {
    return this.store_.peek()[this.key_];
  }

  update(fn: (current: T[K]) => T[K]): void {
    this.value = fn(this.peek());
  }

  subscribe(listener: () => void): Subscription {
    return this.keyComputed_.subscribe(listener);
  }

  derive<U>(fn: (value: T[K]) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.keyComputed_.derive(fn, options);
  }

  dispose(): void {
    this.keyComputed_.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── StoreImpl ─────────────────────────────────────────────────────────────────

class StoreImpl<T extends object> implements Store<T> {
  private readonly signal_: SignalImpl<T>;
  private readonly initial_: T;
  private readonly lensCache_ = new Map<string, Signal<unknown>>();
  [IS_SIGNAL] = true;
  [IS_STORE] = true;

  constructor(initial: T, name?: string) {
    this.signal_ = new SignalImpl(structuredClone(initial), undefined, name);
    this.initial_ = structuredClone(initial);
  }

  get value(): T {
    return this.signal_.value;
  }

  peek(): T {
    return this.signal_.peek();
  }

  readonly subscribe = (listener: () => void): Subscription => this.signal_.subscribe(listener);

  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  patch(partial: Partial<T>): void {
    if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) {
      throw new StateError('INVALID_STORE', 'store.patch() requires a plain object partial.');
    }

    const current = this.peek();
    const hasChange = (Object.keys(partial) as Array<keyof T>).some((k) => !Object.is(current[k], partial[k]));

    if (hasChange) this.signal_.value = { ...current, ...partial };
  }

  update(fn: (state: T) => T): void {
    const current = this.peek();
    const next = fn(current);

    if (next === current) {
      throw new StateError(
        'INVALID_STORE',
        'store.update() must return a new object — returning the same reference has no effect. ' +
          'Use store.patch() for partial updates, or spread: { ...state, key: newValue }.',
      );
    }

    this.signal_.value = next;
  }

  reset(): void {
    this.signal_.value = structuredClone(this.initial_);
  }

  select<U>(selector: (state: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.derive(selector, options);
  }

  /**
   * Returns a writable `Signal` scoped to a single property of the store.
   * Reads and subscribes to only that property — unrelated patches do not notify this signal.
   * Writes call `store.patch()` under the hood.
   *
   * The lens is cached per key — `store.lens('x') === store.lens('x')`.
   *
   * @example
   * ```ts
   * const userStore = store({ name: 'Alice', age: 30 });
   * const nameLens = userStore.lens('name');
   *
   * console.log(nameLens.value); // 'Alice'
   * nameLens.value = 'Bob';       // equivalent to userStore.patch({ name: 'Bob' })
   * ```
   */
  lens<K extends keyof T & string>(key: K): Signal<T[K]> {
    if (this.lensCache_.has(key)) return this.lensCache_.get(key) as Signal<T[K]>;

    const lens = new LensImpl<T, K>(this, key);

    this.lensCache_.set(key, lens as unknown as Signal<unknown>);

    return lens;
  }
}

export const store = <T extends object>(initial: T, options?: { name?: string }): Store<T> => {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
    throw new StateError('INVALID_STORE', 'store() requires a plain object initial state.');
  }

  return new StoreImpl(initial, options?.name);
};
