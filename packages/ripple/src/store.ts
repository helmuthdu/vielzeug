import type { PathValue, Readable, Signal, Store, Subscription } from './types';

import { computed } from './computed';
import { getDevToolsHook } from './devtools-hook';
import { RippleInvalidStoreError } from './errors';
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
    throw new RippleInvalidStoreError('Cannot write to a nested path through a null or non-object intermediate value.');
  }

  const [key, ...rest] = parts;
  const currentObj = obj as Record<string, unknown>;

  return { ...currentObj, [key!]: setNestedValue(currentObj[key!], rest, value) } as T;
};

// ── LensSignal ───────────────────────────────────────────────────────────────
//
// A unified writable Signal that delegates reads to an inner Reactive<V>
// and writes to an injected callback.  Replaces the old TopLevelLens +
// NestedLens pair — same interface, one class to update when Signal<T> changes.

type LensOptions<V> = {
  disposeSource?: () => void;
  evict: () => void;
  name?: string;
  source: Readable<V>;
  write: (v: V) => void;
};

class LensSignal<V> implements Signal<V> {
  [IS_SIGNAL] = true as const;

  private source_: Readable<V>;
  private write_: (v: V) => void;
  private evict_: () => void;
  private disposeSource_: (() => void) | undefined;
  private name_: string | undefined;

  get name(): string | undefined {
    return this.name_ ?? this.source_.name;
  }

  constructor(opts: LensOptions<V>) {
    this.source_ = opts.source;
    this.write_ = opts.write;
    this.evict_ = opts.evict;
    this.disposeSource_ = opts.disposeSource;
    this.name_ = opts.name;
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

  subscribe(listener: () => void): Subscription {
    return this.source_.subscribe(listener);
  }

  get disposed(): boolean {
    return this.source_.disposed;
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
// - readonlyProxy_: Proxy over current_ that throws on set/delete — returned by .peek()
// - propSignals_: per-top-level-key SignalImpl, lazily created on first lens/read
// - version_: whole-store monotonic counter (bumped on any change, used by subscribe())
//
// StoreImpl is a standalone class — does not extend ReactiveBase.
// applyTopLevelChange_() has NO batch() wrapper — callers that need atomicity
// (patch, replace, reset, and both lens write paths) wrap with batch() at their
// own call sites; the method itself stays free of any scheduling concern.

export class StoreImpl<T extends object> implements Store<T> {
  [IS_SIGNAL] = true as const;
  [IS_STORE] = true as const;

  readonly name: string | undefined;

  private current_: T;
  private disposed_: boolean;
  private readonly initial_: T;
  private readonly lensCache_: Map<string, LensSignal<unknown>>;
  private readonly propSignals_: Map<string, SignalImpl<unknown>>;
  private readonly readonlyProxy_: Readonly<T>;
  private readonly version_: SignalImpl<number>;

  constructor(initial: T, name?: string) {
    this.name = name;
    this.current_ = structuredClone(initial);
    this.disposed_ = false;
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
        throw new RippleInvalidStoreError(
          `Direct deletion from store.value is not allowed. Use store.patch() or store.lens(). (key: "${String(key)}")`,
        );
      },
      set(_target, key): never {
        throw new RippleInvalidStoreError(
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
      throw new RippleInvalidStoreError(`Unsafe key "${key}" rejected to prevent prototype pollution.`);
    }

    const current = (this.current_ as Record<string, unknown>)[key];

    if (Object.is(current, newValue)) return;

    (this.current_ as Record<string, unknown>)[key] = newValue;
    this.propSignalFor_(key).value = newValue as never;
    this.version_.value = this.version_.peek() + 1;
  }

  /**
   * Returns the current state as a tracked read — registers the store as a dependency
   * inside `effect()` / `computed()`. Any mutation re-runs the subscriber.
   * For untracked one-off reads, use `peek()` instead.
   */
  get value(): Readonly<T> {
    void this.version_.value;

    return this.readonlyProxy_;
  }

  /**
   * Returns a frozen deep snapshot of the current state.
   * The returned object reflects state at call time — it does not update as the store mutates.
   * Nested objects are cloned (not aliased), so mutating nested properties on the snapshot
   * does not affect the live store state.
   * Use for serialization or one-off reads outside reactive contexts.
   * For reactive reads, use `store.lens(path)` instead.
   */
  peek(): Readonly<T> {
    return Object.freeze(structuredClone(this.current_)) as Readonly<T>;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    return this.version_.subscribe(listener);
  };

  patch(partial: Partial<T>): void {
    if (typeof partial !== 'object' || partial === null || Array.isArray(partial)) {
      throw new RippleInvalidStoreError('store.patch() requires a plain object partial.');
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
    const snapshot = structuredClone(this.current_) as Readonly<T>;
    const next = fn(snapshot);

    if (next === snapshot) return;

    batch(() => {
      for (const key of Object.keys(snapshot)) {
        this.applyTopLevelChange_(key, (next as Record<string, unknown>)[key]);
      }

      for (const key of Object.keys(next)) {
        if (Object.hasOwn(snapshot as Record<string, unknown>, key)) continue;

        this.applyTopLevelChange_(key, (next as Record<string, unknown>)[key]);
      }
    });

    getDevToolsHook()?.mutate?.({ kind: 'replace', name: this.name });
  }

  reset(): void {
    const initial = this.initial_ as Record<string, unknown>;

    batch(() => {
      for (const key of Object.keys(this.current_)) {
        this.applyTopLevelChange_(key, initial[key]);
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
      throw new RippleInvalidStoreError(`Lens path exceeds maximum depth of 32 segments: "${path}".`);
    }

    for (const part of parts) {
      if (part === '') {
        throw new RippleInvalidStoreError(`Empty path segment in lens path "${path}". Check for consecutive dots.`);
      }

      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        throw new RippleInvalidStoreError(`Unsafe path segment "${part}" in lens path "${path}".`);
      }
    }

    let lens: LensSignal<unknown>;

    if (parts.length === 1) {
      // Top-level lens: backed directly by the per-property signal.
      const propSig = this.propSignalFor_(parts[0]!) as SignalImpl<PathValue<T, P>>;

      lens = new LensSignal<PathValue<T, P>>({
        evict,
        // propSig lifecycle is owned by the store — do not dispose it
        source: propSig,
        write: (v) => {
          batch(() => this.applyTopLevelChange_(parts[0]!, v));
          getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
        },
      }) as unknown as LensSignal<unknown>;
    } else {
      // Nested lens: backed by a derived computed over the root property signal.
      // Write path uses batch() here so nested lens writes remain atomic.
      const readComputed = computed(
        () => getNestedValue(this.propSignalFor_(parts[0]!).value, parts.slice(1)) as PathValue<T, P>,
      );

      lens = new LensSignal<PathValue<T, P>>({
        disposeSource: () => readComputed.dispose(),
        evict,
        name: this.name ? `${this.name}.${path}` : path,
        source: readComputed,
        write: (v) => {
          const current = readComputed.peek();

          if (Object.is(current, v)) return;

          batch(() => this.setPath_(parts, v));
          getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
        },
      }) as unknown as LensSignal<unknown>;
    }

    this.lensCache_.set(path, lens);

    return lens as unknown as Signal<PathValue<T, P>>;
  }

  get disposed(): boolean {
    return this.disposed_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    for (const lens of [...this.lensCache_.values()]) {
      lens.dispose();
    }

    this.lensCache_.clear();

    for (const sig of this.propSignals_.values()) {
      sig.dispose();
    }

    this.propSignals_.clear();
    this.version_.dispose();
    getDevToolsHook()?.dispose?.({ kind: 'store', name: this.name });
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export const store = <T extends object>(initial: T, options?: { name?: string }): Store<T> => {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) {
    throw new RippleInvalidStoreError('store() requires a plain object initial state.');
  }

  return new StoreImpl(initial, options?.name) as unknown as Store<T>;
};
