import type { ComputedSignal, PathValue, ReactiveOptions, Signal, Store, Subscription } from './types';

import { computed } from './computed';
import { StateError } from './error';
import { batch } from './scheduling';
import { SignalImpl } from './signal';
import { IS_SIGNAL, IS_STORE } from './symbols';

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

// ── TopLevelLens ──────────────────────────────────────────────────────────────
//
// A writable Signal backed by a per-property SignalImpl in the store.
// Reads track only that property; unrelated patches do not trigger re-runs.
//
// R5: Collapsed store_ + key_ into a single applyWrite_ closure, reducing field
// count and avoiding an extra property lookup on every write.

class TopLevelLens<V> {
  declare [IS_SIGNAL]: true;

  private applyWrite_: (v: V) => void;
  private evict_: () => void;
  private propSignal_: SignalImpl<V>;

  constructor(propSignal: SignalImpl<V>, applyWrite: (v: V) => void, evict: () => void) {
    this[IS_SIGNAL] = true;
    this.applyWrite_ = applyWrite;
    this.evict_ = evict;
    this.propSignal_ = propSignal;
  }

  get value(): V {
    return this.propSignal_.value;
  }

  set value(next: V) {
    this.applyWrite_(next);
  }

  peek(): V {
    return this.propSignal_.peek();
  }

  update(fn: (current: V) => V): void {
    this.value = fn(this.peek());
  }

  subscribe(listener: () => void): Subscription {
    return this.propSignal_.subscribe(listener);
  }

  map<U>(fn: (value: V) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.propSignal_.map(fn, options);
  }

  filter<U extends V>(predicate: (value: V) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined> {
    return this.propSignal_.filter(predicate);
  }

  dispose(): void {
    this.evict_();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── NestedLens ────────────────────────────────────────────────────────────────
//
// A writable Signal for dot-notation paths (e.g. 'user.address.city').
// Reads register a fine-grained dep on the root property's signal so only
// changes to the root key (or narrower) trigger re-runs.

class NestedLens<T extends object, V> {
  declare [IS_SIGNAL]: true;

  private evict_: () => void;
  private keyComputed_: ComputedSignal<V>;
  private parts_: string[];
  private setPath_: (parts: string[], value: unknown) => void;

  constructor(store: StoreImpl<T>, parts: string[], evict: () => void) {
    this[IS_SIGNAL] = true;
    this.evict_ = evict;
    this.parts_ = parts;
    this.setPath_ = (p, v) => store.setPath_(p, v);
    // The computed reads via store.propSignalFor_() which registers a
    // fine-grained dep on just the root property signal.
    this.keyComputed_ = computed(() => getNestedValue(store.propSignalFor_(parts[0]!).value, parts.slice(1)) as V);
  }

  get value(): V {
    return this.keyComputed_.value;
  }

  set value(next: V) {
    const current = this.keyComputed_.peek();

    if (Object.is(current, next)) return;

    this.setPath_(this.parts_, next);
  }

  peek(): V {
    return this.keyComputed_.peek();
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
    this.evict_();
    this.keyComputed_.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── StoreImpl ─────────────────────────────────────────────────────────────────
//
// Fine-grained reactive store.
// - current_: mutable backing object (internal use only — never exposed directly)
// - readonlyProxy_: Proxy over current_ that throws on set (F3/R8 — returned by value getter)
// - propSignals_: per-top-level-key SignalImpl, lazily created
// - version_: whole-store monotonic counter (bumped on any change, used by subscribe())
//
// R3: StoreImpl is a standalone class — it no longer extends ReactiveBase.
// ReactiveBase carried dead computedSubs_/effectSubs_ infrastructure that was
// never used since the store delegates subscribe() to version_.

class StoreImpl<T extends object> {
  declare [IS_SIGNAL]: true;
  declare [IS_STORE]: true;

  readonly name: string | undefined;

  private current_: T;
  private readonly initial_: T;
  private readonly lensCache_: Map<string, TopLevelLens<unknown> | NestedLens<T, unknown>>;
  private readonly propSignals_: Map<string, SignalImpl<unknown>>;
  private readonly readonlyProxy_: Readonly<T>;
  private readonly version_: SignalImpl<number>;

  constructor(initial: T, name?: string) {
    this[IS_SIGNAL] = true;
    this[IS_STORE] = true;
    this.name = name;
    this.current_ = structuredClone(initial);
    this.initial_ = structuredClone(initial);
    this.lensCache_ = new Map();
    this.propSignals_ = new Map();
    this.version_ = new SignalImpl(0, undefined, name ? `${name}.version` : undefined);

    // F3/R8: create a Proxy at construction time that throws on any mutation attempt.
    // All external reads go through this proxy; internal writes use this.current_ directly.
    this.readonlyProxy_ = new Proxy(this.current_, {
      deleteProperty(_target, key): never {
        throw new StateError(
          'INVALID_STORE',
          `Direct deletion from store.value is not allowed. Use store.patch() or store.lens(). (key: "${String(key)}")`,
        );
      },
      set(_target, key): never {
        throw new StateError(
          'INVALID_STORE',
          `Direct mutation of store.value is not allowed. Use store.patch(), store.lens(), or store.replace(). (key: "${String(key)}")`,
        );
      },
    }) as Readonly<T>;
  }

  /** Returns (or lazily creates) the per-property signal for a top-level key. */
  propSignalFor_(key: string): SignalImpl<unknown> {
    let sig = this.propSignals_.get(key);

    if (sig === undefined) {
      sig = new SignalImpl((this.current_ as Record<string, unknown>)[key], undefined, key);
      this.propSignals_.set(key, sig);
    }

    return sig;
  }

  /** @internal Called by NestedLens.set to write through the store. */
  setPath_(parts: string[], value: unknown): void {
    const [rootKey, ...rest] = parts;
    const rootVal = (this.current_ as Record<string, unknown>)[rootKey!];
    const newRootVal = setNestedValue(rootVal, rest, value);

    this.applyTopLevelChange_(rootKey!, newRootVal);
  }

  /** @internal Apply a change to a top-level key and propagate to prop signal + version. */
  applyTopLevelChange_(key: string, newValue: unknown): void {
    const current = (this.current_ as Record<string, unknown>)[key];

    if (Object.is(current, newValue)) return;

    batch(() => {
      (this.current_ as Record<string, unknown>)[key] = newValue;
      this.propSignalFor_(key).value = newValue as never;
      this.version_.value = this.version_.peek() + 1;
    });
  }

  get value(): Readonly<T> {
    // Reading version_ registers a whole-store dep (fires on any key change).
    // For fine-grained deps, consumers use lens() or map().
    // R8/F3: return the proxy (throws on set), not the raw mutable backing object.
    this.version_.value; // eslint-disable-line @typescript-eslint/no-unused-expressions

    return this.readonlyProxy_;
  }

  peek(): Readonly<T> {
    return this.readonlyProxy_;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    // Subscribe to the version_ signal — fires on any change to any key.
    return this.version_.subscribe(listener);
  };

  map<U>(fn: (value: Readonly<T>) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  filter<U extends T>(predicate: (value: Readonly<T>) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: Readonly<T>) => boolean): ComputedSignal<T | undefined>;
  filter(predicate: (value: Readonly<T>) => boolean): ComputedSignal<T | undefined> {
    return computed(() => {
      const v = this.value;

      return predicate(v) ? (v as T) : undefined;
    });
  }

  patch(partial: Partial<T>): void {
    if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) {
      throw new StateError('INVALID_STORE', 'store.patch() requires a plain object partial.');
    }

    const keys = Object.keys(partial) as Array<keyof T & string>;

    if (keys.length === 0) return;

    batch(() => {
      let changed = false;

      for (const key of keys) {
        const newValue = (partial as Record<string, unknown>)[key];
        const current = (this.current_ as Record<string, unknown>)[key];

        if (!Object.is(current, newValue)) {
          (this.current_ as Record<string, unknown>)[key] = newValue;
          this.propSignalFor_(key).value = newValue as never;
          changed = true;
        }
      }

      if (changed) {
        this.version_.value = this.version_.peek() + 1;
      }
    });
  }

  // F2: renamed from update() to replace() to avoid confusion with signal.update(fn).
  // R10: replaced new Set([...Object.keys(a), ...Object.keys(b)]) (3 allocations)
  //      with two sequential for...of loops over Object.keys() (zero extra allocation).
  replace(fn: (state: Readonly<T>) => T): void {
    const current = this.current_;
    const next = fn(this.readonlyProxy_);

    // Same reference → no change.
    if (next === current) return;

    batch(() => {
      let changed = false;

      for (const key of Object.keys(current)) {
        const newVal = (next as Record<string, unknown>)[key];

        if (!Object.is((current as Record<string, unknown>)[key], newVal)) {
          (this.current_ as Record<string, unknown>)[key] = newVal;
          this.propSignalFor_(key).value = newVal as never;
          changed = true;
        }
      }

      for (const key of Object.keys(next)) {
        if (Object.prototype.hasOwnProperty.call(current, key)) continue;

        const newVal = (next as Record<string, unknown>)[key];

        (this.current_ as Record<string, unknown>)[key] = newVal;
        this.propSignalFor_(key).value = newVal as never;
        changed = true;
      }

      if (changed) {
        this.version_.value = this.version_.peek() + 1;
      }
    });
  }

  reset(): void {
    this.replace(() => structuredClone(this.initial_));
  }

  lens<P extends string>(path: P): Signal<PathValue<T, P>> {
    const cached = this.lensCache_.get(path);

    if (cached !== undefined) return cached as unknown as Signal<PathValue<T, P>>;

    const evict = (): void => {
      this.lensCache_.delete(path);
    };

    const parts = path.split('.');
    let lens: TopLevelLens<unknown> | NestedLens<T, unknown>;

    if (parts.length === 1) {
      const propSig = this.propSignalFor_(parts[0]!) as SignalImpl<PathValue<T, P>>;

      // R5: pass applyWrite_ closure instead of (store, key) pair.
      lens = new TopLevelLens<PathValue<T, P>>(
        propSig,
        (v) => this.applyTopLevelChange_(parts[0]!, v),
        evict,
      ) as unknown as TopLevelLens<unknown>;
    } else {
      lens = new NestedLens<T, PathValue<T, P>>(this, parts, evict) as unknown as NestedLens<T, unknown>;
    }

    this.lensCache_.set(path, lens);

    return lens as unknown as Signal<PathValue<T, P>>;
  }
}

export const store = <T extends object>(initial: T, options?: { name?: string }): Store<T> => {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
    throw new StateError('INVALID_STORE', 'store() requires a plain object initial state.');
  }

  return new StoreImpl(initial, options?.name) as unknown as Store<T>;
};
