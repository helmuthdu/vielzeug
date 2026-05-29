import type { ComputedSignal, PathValue, ReactiveOptions, Signal, Store, Subscription } from './types';

import { computed } from './computed';
import { StateError } from './error';
import { IS_SIGNAL, IS_STORE } from './helpers';
import { SignalImpl } from './signal';

// ── Nested path helpers ───────────────────────────────────────────────────────

const getNestedValue = (obj: unknown, parts: string[]): unknown => {
  let current = obj;

  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[key];
  }

  return current;
};

const setNestedValue = <T>(obj: T, parts: string[], value: unknown): T => {
  if (parts.length === 0) return value as T;

  if (obj === null || typeof obj !== 'object') {
    throw new StateError(
      'INVALID_STORE',
      'Cannot write to a nested path through a null or non-object intermediate value.',
    );
  }

  const [key, ...rest] = parts;
  const currentObj = obj as Record<string, unknown>;

  return { ...currentObj, [key!]: setNestedValue(currentObj[key!], rest, value) } as T;
};

// ── LensImpl ──────────────────────────────────────────────────────────────────

/**
 * A writable signal scoped to a specific path within a store.
 * Single-key paths (`'name'`) and nested paths (`'user.address.city'`) are both supported.
 * The internal computed fires only when the value at that path changes.
 */
class LensImpl<T extends object, V> implements Signal<V> {
  [IS_SIGNAL] = true;

  private readonly keyComputed_: ComputedSignal<V>;
  private readonly store_: StoreImpl<T>;
  private readonly parts_: string[];
  private readonly evict_: () => void;

  constructor(store: StoreImpl<T>, parts: string[], evict: () => void) {
    this.store_ = store;
    this.parts_ = parts;
    this.evict_ = evict;
    this.keyComputed_ = computed(() => getNestedValue(store.value, parts) as V);
  }

  get value(): V {
    return this.keyComputed_.value;
  }

  set value(next: V) {
    // Use update() so the same-reference no-op applies at the path level too.
    this.store_.update((state) => {
      const current = getNestedValue(state, this.parts_) as V;

      if (Object.is(current, next)) return state;

      return setNestedValue(state, this.parts_, next);
    });
  }

  peek(): V {
    return getNestedValue(this.store_.peek(), this.parts_) as V;
  }

  update(fn: (current: V) => V): void {
    this.value = fn(this.peek());
  }

  subscribe(listener: () => void): Subscription {
    return this.keyComputed_.subscribe(listener);
  }

  map<U>(fn: (value: V) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.keyComputed_.map(fn, options);
  }

  filter<U extends V>(predicate: (value: V) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined> {
    return this.keyComputed_.filter(predicate);
  }

  dispose(): void {
    // Evict first — if a subscriber is notified synchronously during computed disposal,
    // a concurrent store.lens(path) call will create a fresh live lens rather than
    // returning the half-disposed one.
    this.evict_();
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

  map<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  filter<U extends T>(predicate: (value: T) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined>;
  filter(predicate: (value: T) => boolean): ComputedSignal<T | undefined> {
    return computed(() => {
      const v = this.value;

      return predicate(v) ? v : undefined;
    });
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

    // Same reference → no change. Silently no-op (consistent with signal equality semantics).
    if (next === current) return;

    this.signal_.value = next;
  }

  reset(): void {
    this.signal_.value = structuredClone(this.initial_);
  }

  /**
   * Returns a writable `Signal` scoped to a property or dot-separated nested path.
   * The lens is cached — `store.lens('x') === store.lens('x')`.
   *
   * @example
   * ```ts
   * const s = store({ user: { name: 'Alice', address: { city: 'NY' } } });
   * const name = s.lens('user.name');         // Signal<string>
   * const city = s.lens('user.address.city'); // Signal<string>
   * city.value = 'LA'; // immutably updates the nested path
   * ```
   */
  lens<P extends string>(path: P): Signal<PathValue<T, P>> {
    if (this.lensCache_.has(path)) return this.lensCache_.get(path) as Signal<PathValue<T, P>>;

    const parts = path.split('.');
    const lens = new LensImpl<T, PathValue<T, P>>(this, parts, () => this.lensCache_.delete(path));

    this.lensCache_.set(path, lens as unknown as Signal<unknown>);

    return lens;
  }
}

export const store = <T extends object>(initial: T, options?: { name?: string }): Store<T> => {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
    throw new StateError('INVALID_STORE', 'store() requires a plain object initial state.');
  }

  return new StoreImpl(initial, options?.name);
};
