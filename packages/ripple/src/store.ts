import type { LensPath, PathValue, Readable, Signal, Store, Subscription } from './types';

import { deepFreeze, freezeValues } from './_deep-freeze';
import { computed } from './computed';
import { getDevToolsHook } from './devtools-hook';
import { RippleInvalidStoreError } from './errors';
import { batch } from './scheduling';
import { SignalImpl } from './signal';
import { SubscriptionImpl } from './subscription';
import { IS_SIGNAL, IS_STORE } from './symbols';

// ── Key safety ────────────────────────────────────────────────────────────────

/**
 * Rejects prototype-pollution-prone top-level keys. Called both as an upfront
 * validation pass (patch/replace — so a later unsafe key never leaves earlier,
 * safe keys partially applied) and defensively inside applyTopLevelChange_.
 */
const assertSafeKey = (key: string): void => {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new RippleInvalidStoreError(`Unsafe key "${key}" rejected to prevent prototype pollution.`);
  }
};

// ── Immutability ──────────────────────────────────────────────────────────────

/**
 * Deep-clones and deep-freezes `value` before it enters store state. Cloning first
 * guarantees the store never shares an object graph with anything the caller still
 * holds a reference to (freezing a caller's own live object in place would be a
 * surprising side effect); freezing after makes every nested mutation attempt on the
 * stored value throw a real `TypeError` instead of silently corrupting live state.
 */
const freezeClone = <T>(value: T): T => {
  try {
    return deepFreeze(structuredClone(value));
  } catch (error) {
    throw new RippleInvalidStoreError(
      'store state must be structured-cloneable (no functions, symbols, or non-cloneable class instances).',
      { cause: error instanceof Error ? error : undefined },
    );
  }
};

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
  // Own flag — top-level lenses don't own their source (the store does), so
  // `dispose()` can't rely on `source_.disposed` alone to reflect "was this
  // handle disposed?". Nested lenses still cascade into `source_.disposed`
  // via `disposeSource_`, so the getter below ORs both signals.
  private disposed_ = false;
  private readonly disposalController_ = new AbortController();
  // Cached at dispose() time — a top-level lens's source (the store's own prop
  // signal) outlives the lens handle, so once disposed this lens must stop
  // forwarding the store's live value and instead behave like a disposed signal:
  // reads return the last value seen, writes and new subscriptions are no-ops.
  private lastValue_: V | undefined;

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
    return this.disposed_ ? (this.lastValue_ as V) : this.source_.value;
  }

  set value(next: V) {
    if (this.disposed_) return;

    this.write_(next);
  }

  peek(): V {
    return this.disposed_ ? (this.lastValue_ as V) : this.source_.peek();
  }

  subscribe(listener: () => void): Subscription {
    if (this.disposed_) {
      const noop = new SubscriptionImpl(() => {});

      noop.dispose();

      return noop;
    }

    return this.source_.subscribe(listener);
  }

  get disposed(): boolean {
    return this.disposed_ || this.source_.disposed;
  }

  get disposalSignal(): AbortSignal {
    return this.disposalController_.signal;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.lastValue_ = this.source_.peek();
    this.disposed_ = true;
    this.disposalController_.abort();
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
  private readonly disposalController_ = new AbortController();
  private readonly initial_: T;
  private readonly lensCache_: Map<string, LensSignal<unknown>>;
  private readonly propSignals_: Map<string, SignalImpl<unknown>>;
  private readonly readonlyProxy_: Readonly<T>;
  private readonly version_: SignalImpl<number>;

  constructor(initial: T, name?: string) {
    this.name = name;
    // freezeValues() deep-freezes every top-level property value without freezing
    // current_/initial_ themselves — their own top-level slots stay assignable for
    // applyTopLevelChange_()/deleteTopLevelKey_(), while every value living in them
    // is immutable from the moment it enters store state.
    this.current_ = freezeValues(structuredClone(initial));
    this.disposed_ = false;
    this.initial_ = freezeValues(structuredClone(initial));
    this.lensCache_ = new Map();
    this.propSignals_ = new Map();
    this.version_ = new SignalImpl(0, undefined, name ? `${name}.version` : undefined);

    // Shallow proxy: throws on any top-level mutation attempt (set/delete traps).
    // All external reads go through this proxy; internal writes use this.current_ directly.
    // Nested objects need no proxy of their own — every value that enters store state is
    // deep-frozen (see freezeValues()/freezeClone() above), so `store.value.user.name = 'x'`
    // already throws a real TypeError at the nested object itself. Use store.lens('a.b') or
    // store.replace() for actual nested updates.
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
    assertSafeKey(key);

    const current = (this.current_ as Record<string, unknown>)[key];

    if (Object.is(current, newValue)) return;

    const safeValue = freezeClone(newValue);

    (this.current_ as Record<string, unknown>)[key] = safeValue;
    this.propSignalFor_(key).value = safeValue as never;
    this.version_.value = this.version_.peek() + 1;
  }

  /**
   * @internal Removes a top-level key entirely (as opposed to applyTopLevelChange_,
   * which can only ever assign a value — including `undefined` — never delete the key).
   * Companion used by applyFullState_ for keys absent from the target state.
   */
  deleteTopLevelKey_(key: string): void {
    if (!Object.hasOwn(this.current_ as object, key)) return;

    delete (this.current_ as Record<string, unknown>)[key];
    this.propSignalFor_(key).value = undefined as never;
    this.version_.value = this.version_.peek() + 1;
  }

  /**
   * @internal Applies `next` as the authoritative full top-level state: keys present in
   * `next` are set via applyTopLevelChange_, keys present in current_ but absent from
   * `next` are removed via deleteTopLevelKey_. Shared by replace() and reset() so both
   * can actually remove a key, not just null it out — see B1 in the ripple improvement plan.
   */
  applyFullState_(next: Record<string, unknown>): void {
    const current = this.current_ as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(current), ...Object.keys(next)]);

    for (const key of allKeys) assertSafeKey(key);

    batch(() => {
      for (const key of allKeys) {
        if (Object.hasOwn(next, key)) {
          this.applyTopLevelChange_(key, next[key]);
        } else {
          this.deleteTopLevelKey_(key);
        }
      }
    });
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
    return deepFreeze(structuredClone(this.current_)) as Readonly<T>;
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

    // Validate every key before mutating any — a key rejected mid-loop must not
    // leave earlier, safe keys partially applied (and un-notified — see batch()'s
    // error path, which clears the pending flush queue rather than replaying it).
    for (const key of keys) assertSafeKey(key);

    batch(() => {
      for (const key of keys) {
        this.applyTopLevelChange_(key, (partial as Record<string, unknown>)[key]);
      }
    });

    getDevToolsHook()?.mutate?.({ kind: 'patch', name: this.name });
  }

  replace(fn: (state: Readonly<T>) => T): void {
    const snapshot = deepFreeze(structuredClone(this.current_)) as Readonly<T>;
    const next = fn(snapshot);

    if (next === snapshot) return;

    this.applyFullState_(next as Record<string, unknown>);

    getDevToolsHook()?.mutate?.({ kind: 'replace', name: this.name });
  }

  reset(): void {
    this.applyFullState_(this.initial_ as Record<string, unknown>);

    getDevToolsHook()?.mutate?.({ kind: 'reset', name: this.name });
  }

  /**
   * Top-level lens: backed directly by the per-property signal — no extra graph node.
   * The store owns propSig's lifecycle, so this lens has no `disposeSource`.
   */
  private topLevelLens_<V>(key: string, path: string): LensSignal<V> {
    return new LensSignal<V>({
      evict: () => this.lensCache_.delete(path),
      source: this.propSignalFor_(key) as SignalImpl<V>,
      write: (v) => {
        batch(() => this.applyTopLevelChange_(key, v));
        getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
      },
    });
  }

  /**
   * Nested lens: backed by a derived `computed()` over the root property signal — the
   * lens owns that computed (disposeSource) since nothing else references it.
   * Write path batches the update so a nested lens write remains atomic.
   */
  private nestedLens_<V>(parts: string[], path: string): LensSignal<V> {
    const readComputed = computed(() => getNestedValue(this.propSignalFor_(parts[0]!).value, parts.slice(1)) as V);

    return new LensSignal<V>({
      disposeSource: () => readComputed.dispose(),
      evict: () => this.lensCache_.delete(path),
      name: this.name ? `${this.name}.${path}` : path,
      source: readComputed,
      write: (v) => {
        if (Object.is(readComputed.peek(), v)) return;

        batch(() => this.setPath_(parts, v));
        getDevToolsHook()?.mutate?.({ kind: 'lens', name: this.name, path });
      },
    });
  }

  /** Splits `path` on `.` and rejects empty/unsafe/too-deep segments before any lens is built. */
  private validatedLensParts_(path: string): string[] {
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

    return parts;
  }

  lens<P extends LensPath<T>>(path: P): Signal<PathValue<T, P>> {
    const cached = this.lensCache_.get(path);

    if (cached !== undefined) return cached as unknown as Signal<PathValue<T, P>>;

    const parts = this.validatedLensParts_(path);
    const lens =
      parts.length === 1
        ? this.topLevelLens_<PathValue<T, P>>(parts[0]!, path)
        : this.nestedLens_<PathValue<T, P>>(parts, path);

    this.lensCache_.set(path, lens as unknown as LensSignal<unknown>);

    return lens;
  }

  get disposed(): boolean {
    return this.disposed_;
  }

  get disposalSignal(): AbortSignal {
    return this.disposalController_.signal;
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
    this.disposalController_.abort();
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

  // Same guard as patch()/replace() — reject an unsafe top-level key (e.g. a real
  // own "__proto__" property from JSON.parse) before it ever enters store state.
  for (const key of Object.keys(initial)) assertSafeKey(key);

  return new StoreImpl(initial, options?.name) as unknown as Store<T>;
};
