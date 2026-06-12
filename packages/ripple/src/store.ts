import type { ComputedSignal, PathValue, ReactiveOptions, Signal, Store, Subscription } from './types';

import { computed } from './computed';
import { getDevToolsHook } from './devtools-hook';
import { StateError } from './error';
import { registerSignal } from './registry';
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

// ── LensSignal ────────────────────────────────────────────────────────────────
//
// A unified writable Signal that delegates reads to an inner ReadonlySignal
// and writes to an injected callback.  Replaces the old TopLevelLens +
// NestedLens pair — same interface, one class to update when Signal<T> changes.
//
// R9: consolidated from two lens classes into one.
// R4: batch() lives at write sites (NestedLens path), not inside applyTopLevelChange_.

class LensSignal<V> implements Signal<V> {
  declare [IS_SIGNAL]: true;

  private source_: Signal<V> | ComputedSignal<V>;
  private write_: (v: V) => void;
  private evict_: () => void;
  private disposeSource_: (() => void) | undefined;

  constructor(
    source: Signal<V> | ComputedSignal<V>,
    write: (v: V) => void,
    evict: () => void,
    disposeSource?: () => void,
  ) {
    this[IS_SIGNAL] = true;
    this.source_ = source;
    this.write_ = write;
    this.evict_ = evict;
    this.disposeSource_ = disposeSource;
  }

  get value(): V {
    return this.source_.value;
  }

  set value(next: V) {
    this.write_(next);
  }

  peek(): V {
    return this.source_.peek();
  }

  update(fn: (current: V) => V): void {
    this.value = fn(this.peek());
  }

  subscribe(listener: () => void): Subscription {
    return this.source_.subscribe(listener);
  }

  map<U>(fn: (value: V) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return this.source_.map(fn, options);
  }

  filter<U extends V>(predicate: (value: V) => value is U): ComputedSignal<U | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined>;
  filter(predicate: (value: V) => boolean): ComputedSignal<V | undefined> {
    return this.source_.filter(predicate);
  }

  dispose(): void {
    this.evict_();
    this.disposeSource_?.();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── StoreImpl ─────────────────────────────────────────────────────────────────
//
// Fine-grained reactive store.
//
// Internal layout:
// - current_: mutable backing object — NEVER exposed directly, internal writes only
// - readonlyProxy_: Proxy over current_ that throws on set/delete — returned by .value / .peek()
// - propSignals_: per-top-level-key SignalImpl, lazily created on first lens/read
// - version_: whole-store monotonic counter (bumped on any change, used by subscribe())
//
// R3: StoreImpl is a standalone class — does not extend ReactiveBase.
// R4: applyTopLevelChange_() has NO batch() wrapper — callers that need atomicity
//     (patch, replace, reset) already wrap with an outer batch(). The only other
//     write path (nested lens write) wraps at the call site, not here.
// R10: The readonlyProxy_ is shallowly protected — top-level set/delete throws,
//      but nested object properties are plain references. See store.value JSDoc.

export class StoreImpl<T extends object> {
  declare [IS_SIGNAL]: true;
  declare [IS_STORE]: true;

  readonly name: string | undefined;

  private current_: T;
  private readonly initial_: T;
  private readonly lensCache_: Map<string, LensSignal<unknown>>;
  private readonly propSignals_: Map<string, SignalImpl<unknown>>;
  private readonly readonlyProxy_: Readonly<T>;
  private readonly version_: SignalImpl<number>;

  private readonly onMutation_?: (key: string, newValue: unknown) => void;

  constructor(initial: T, name?: string, onMutation?: (key: string, newValue: unknown) => void) {
    this[IS_SIGNAL] = true;
    this[IS_STORE] = true;
    this.name = name;

    if (name !== undefined) registerSignal(this, name);

    this.onMutation_ = onMutation;
    this.current_ = structuredClone(initial);
    this.initial_ = structuredClone(initial);
    this.lensCache_ = new Map();
    this.propSignals_ = new Map();
    this.version_ = new SignalImpl(0, undefined, name ? `${name}.version` : undefined);

    // Shallow proxy: throws on any top-level mutation attempt.
    // All external reads go through this proxy; internal writes use this.current_ directly.
    // NOTE: nested objects are plain references — mutations on nested properties
    // bypass reactivity. Use store.lens('a.b') or store.replace() to update nested state.
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
      sig = new SignalImpl(
        (this.current_ as Record<string, unknown>)[key],
        undefined,
        this.name !== undefined ? `${this.name}.${key}` : key,
      );
      this.propSignals_.set(key, sig);
    }

    return sig;
  }

  /** @internal Called by nested lens write to update the store through a path. */
  setPath_(parts: string[], value: unknown): void {
    const [rootKey, ...rest] = parts;
    const rootVal = (this.current_ as Record<string, unknown>)[rootKey!];
    const newRootVal = setNestedValue(rootVal, rest, value);

    this.applyTopLevelChange_(rootKey!, newRootVal);
  }

  /**
   * @internal Apply a change to a top-level key and propagate to prop signal + version.
   * R4: No batch() wrapper — callers that need atomicity must wrap themselves.
   */
  applyTopLevelChange_(key: string, newValue: unknown): void {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new StateError('INVALID_STORE', `Unsafe key "${key}" rejected to prevent prototype pollution.`);
    }

    const current = (this.current_ as Record<string, unknown>)[key];

    if (Object.is(current, newValue)) return;

    (this.current_ as Record<string, unknown>)[key] = newValue;
    this.propSignalFor_(key).value = newValue as never;
    this.version_.value = this.version_.peek() + 1;
    this.onMutation_?.(key, newValue);
  }

  /**
   * Returns the current store state.
   *
   * The returned object is **shallowly protected**: direct assignment to top-level
   * properties throws a `StateError`. However, nested objects are plain references —
   * mutations on nested properties bypass reactivity entirely and will NOT notify effects.
   *
   * Use `store.lens('a.b')`, `store.patch()`, or `store.replace()` to update nested state.
   *
   * Reading `.value` in an effect or computed registers a whole-store dependency
   * (fires on any key change). For fine-grained dependencies, use `store.lens()` or `store.map()`.
   */
  get value(): Readonly<T> {
    this.version_.value; // eslint-disable-line @typescript-eslint/no-unused-expressions

    return this.readonlyProxy_;
  }

  peek(): Readonly<T> {
    return this.readonlyProxy_;
  }

  readonly subscribe = (listener: () => void): Subscription => {
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
      for (const key of keys) {
        this.applyTopLevelChange_(key, (partial as Record<string, unknown>)[key]);
      }
    });

    getDevToolsHook()?.mutate?.({ kind: 'patch', name: this.name });
  }

  replace(fn: (state: Readonly<T>) => T): void {
    const current = this.current_;
    const snapshot = { ...current } as Readonly<T>;
    const next = fn(snapshot);

    if (next === snapshot) return;

    batch(() => {
      for (const key of Object.keys(current)) {
        this.applyTopLevelChange_(key, (next as Record<string, unknown>)[key]);
      }

      for (const key of Object.keys(next)) {
        if (Object.prototype.hasOwnProperty.call(current, key)) continue;

        this.applyTopLevelChange_(key, (next as Record<string, unknown>)[key]);
      }
    });

    getDevToolsHook()?.mutate?.({ kind: 'replace', name: this.name });
  }

  reset(): void {
    const current = this.current_;
    const next = structuredClone(this.initial_);

    batch(() => {
      for (const key of Object.keys(current)) {
        this.applyTopLevelChange_(key, (next as Record<string, unknown>)[key]);
      }
    });

    getDevToolsHook()?.mutate?.({ kind: 'reset', name: this.name });
  }

  lens<P extends string>(path: P): Signal<PathValue<T, P>> {
    const cached = this.lensCache_.get(path);

    if (cached !== undefined) return cached as unknown as Signal<PathValue<T, P>>;

    const evict = (): void => {
      this.lensCache_.delete(path);
    };

    const parts = path.split('.');

    if (parts.length > 32) {
      throw new StateError('INVALID_STORE', `Lens path exceeds maximum depth of 32 segments: "${path}".`);
    }

    for (const part of parts) {
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        throw new StateError('INVALID_STORE', `Unsafe path segment "${part}" in lens path "${path}".`);
      }
    }

    let lens: LensSignal<unknown>;

    if (parts.length === 1) {
      // Top-level lens: backed directly by the per-property signal.
      const propSig = this.propSignalFor_(parts[0]!) as SignalImpl<PathValue<T, P>>;

      lens = new LensSignal<PathValue<T, P>>(
        propSig,
        (v) => {
          this.applyTopLevelChange_(parts[0]!, v);
          getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
        },
        evict,
        // propSig lifecycle is owned by the store — do not dispose it
      ) as unknown as LensSignal<unknown>;
    } else {
      // Nested lens: backed by a derived computed over the root property signal.
      // R9: write path uses batch() here (was previously inside applyTopLevelChange_).
      const readComputed = computed(
        () => getNestedValue(this.propSignalFor_(parts[0]!).value, parts.slice(1)) as PathValue<T, P>,
      );

      lens = new LensSignal<PathValue<T, P>>(
        readComputed,
        (v) => {
          const current = readComputed.peek();

          if (Object.is(current, v)) return;

          batch(() => this.setPath_(parts, v));
          getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
        },
        evict,
        () => readComputed.dispose(),
      ) as unknown as LensSignal<unknown>;
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
