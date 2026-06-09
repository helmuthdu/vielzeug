import type { DepEntry } from './tracking';
import type { ComputedSignal, ReactiveOptions, ReadonlySignal, Subscription } from './types';

import { getDevToolsHook } from './devtools-hook';
import { ensureError, StateError } from './error';
import { ComputedBase } from './reactive-base';
import { SubscriptionImpl } from './subscription';
import { UNINITIALIZED } from './symbols';
import { getRevision, getTracking, trackSource, untrack, withTracking } from './tracking';

export class ComputedImpl<T> extends ComputedBase<T> implements ComputedSignal<T> {
  private value_: T | typeof UNINITIALIZED;
  private dirty_: boolean;
  private computing_: boolean;
  private disposed_: boolean;
  private deps_: DepEntry[];
  private compute_: () => T;
  private equals_: (a: unknown, b: unknown) => boolean;
  private fallback_: ((error: unknown, lastValue: T | undefined) => T) | undefined;
  // F1: global revision at last successful compute — enables O(1) "nothing changed" fast-path.
  private maxRevision_: number;

  constructor(
    compute: () => T,
    equals?: (a: T, b: T) => boolean,
    name?: string,
    fallback?: (error: unknown, lastValue: T | undefined) => T,
  ) {
    super(name);
    this.value_ = UNINITIALIZED;
    this.dirty_ = true;
    this.computing_ = false;
    this.disposed_ = false;
    this.deps_ = [];
    this.maxRevision_ = -1;
    this.compute_ = compute;
    this.equals_ = equals !== undefined ? (a, b) => equals(a as T, b as T) : Object.is;
    this.fallback_ = fallback;
  }

  markDirty(): boolean {
    if (this.disposed_ || this.dirty_) return false;

    this.dirty_ = true;

    return true;
  }

  refreshIfDirty(): boolean {
    if (!this.dirty_) return false;

    // F1 — O(1) global revision fast-path:
    // If the global revision clock has not advanced past our recorded maximum,
    // no signal anywhere in the system has been written since our last compute.
    // No dep can have changed — clear dirty and skip the per-dep scan entirely.
    if (getRevision() <= this.maxRevision_) {
      this.dirty_ = false;

      return false;
    }

    // Per-dep scan: if all dep versions still match, value cannot have changed.
    // For computed deps, we must refresh them first — their version only updates
    // after recompute, so a stale-version check would incorrectly short-circuit.
    if (this.deps_.length > 0) {
      let allSame = true;

      for (const d of this.deps_) {
        const src = d.source;

        // Flush dirty computed deps before comparing versions (lazy pull chain).
        if ('refreshIfDirty' in src) {
          (src as import('./reactive-base').ComputedBase<unknown>).refreshIfDirty();
        }

        if (src.version !== d.version) {
          allSame = false;
          break;
        }
      }

      if (allSame) {
        this.dirty_ = false;
        this.maxRevision_ = getRevision();

        return false;
      }
    }

    return this.recompute();
  }

  private recompute(): boolean {
    if (this.computing_) {
      const label = this.name ? ` "${this.name}"` : '';

      throw new StateError('COMPUTED_CYCLE', `computed cycle detected${label}`);
    }

    this.computing_ = true;

    try {
      const newDeps: DepEntry[] = [];

      let next: T;

      getDevToolsHook()?.compute?.({ name: this.name });

      try {
        next = withTracking({ computed: this, depCollector: newDeps, kind: 'computed' }, this.compute_);
      } catch (error) {
        if (this.fallback_) {
          const lastValue = this.value_ !== UNINITIALIZED ? (this.value_ as T) : undefined;

          next = this.fallback_(error, lastValue);
        } else {
          // Sources accessed before the throw remain in their computedSubs_ until the
          // next successful recompute or dispose(). The computed stays dirty and will retry.
          throw ensureError(error);
        }
      }

      this.dirty_ = false;
      this.maxRevision_ = getRevision();

      // Diff deps: remove subscriptions for sources that are no longer dependencies.
      // Only subscribe to genuinely NEW deps — prevents duplicate WeakRef entries.
      this.updateDeps(newDeps);

      const isNew = this.value_ === UNINITIALIZED;

      if (isNew || !this.equals_(this.value_ as T, next)) {
        this.value_ = next;
        this.version++;

        return true;
      }

      return false;
    } finally {
      this.computing_ = false;
    }
  }

  private updateDeps(newDeps: DepEntry[]): void {
    const oldDeps = this.deps_;

    // Fast path: same sources in same order — just refresh stored versions
    if (oldDeps.length === newDeps.length && oldDeps.every((d, i) => d.source === newDeps[i].source)) {
      for (let i = 0; i < newDeps.length; i++) {
        oldDeps[i]!.version = newDeps[i]!.version;
      }

      return;
    }

    // Slow path: deps changed.
    // Build a set of OLD sources so we can detect which are genuinely NEW and
    // need a fresh addComputedSub call (WeakRef registration).
    const oldSourceSet = new Set(oldDeps.map((d) => d.source));
    const newSourceSet = new Set(newDeps.map((d) => d.source));

    // Unsubscribe from sources that are no longer dependencies
    for (const old of oldDeps) {
      if (!newSourceSet.has(old.source)) {
        old.source.removeComputedSub(this);
      }
    }

    // Subscribe to sources that are genuinely NEW (not in old deps)
    for (const dep of newDeps) {
      if (!oldSourceSet.has(dep.source)) {
        dep.source.addComputedSub(this);
      }
    }

    this.deps_ = newDeps;
  }

  get value(): T {
    if (this.disposed_) {
      const label = this.name ? ` "${this.name}"` : '';

      throw new StateError('DISPOSED_READ', `Cannot read disposed computed${label}`);
    }

    this.refreshIfDirty();
    trackSource(this);

    return this.value_ as T;
  }

  peek(): T {
    if (this.disposed_) {
      const label = this.name ? ` "${this.name}"` : '';

      throw new StateError('DISPOSED_READ', `Cannot read disposed computed${label}`);
    }

    this.refreshIfDirty();

    return this.value_ as T;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) {
      const label = this.name ? ` "${this.name}"` : '';

      throw new StateError('DISPOSED_READ', `Cannot subscribe to disposed computed${label}`);
    }

    this.refreshIfDirty();
    this.addEffectSub(listener);

    return new SubscriptionImpl(() => {
      this.removeEffectSub(listener);
    });
  };

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

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    // Unsubscribe from all upstream sources
    for (const dep of this.deps_) {
      dep.source.removeComputedSub(this);
    }

    this.deps_ = [];
    this.clearSubscribers();
    getDevToolsHook()?.dispose?.({ kind: 'computed', name: this.name });
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

// ── Utility type for the explicit-dep overload (F5) ──────────────────────────

type SignalValues<D extends readonly ReadonlySignal<unknown>[]> = {
  [K in keyof D]: D[K] extends ReadonlySignal<infer V> ? V : never;
};

// ── computed() ───────────────────────────────────────────────────────────────
//
// F5: second overload accepts an explicit dependency array so the computation
// function receives pre-read values with precise TypeScript types, without
// needing to call `.value` inside the body.

export function computed<T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T>;
export function computed<D extends readonly ReadonlySignal<unknown>[], T>(
  deps: readonly [...D],
  fn: (...values: SignalValues<D>) => T,
  options?: ReactiveOptions<T>,
): ComputedSignal<T>;
export function computed<T>(
  computeOrDeps: (() => T) | ReadonlyArray<ReadonlySignal<unknown>>,
  fnOrOptions?: ((...args: never[]) => T) | ReactiveOptions<T>,
  options?: ReactiveOptions<T>,
): ComputedSignal<T> {
  let comp: ComputedImpl<T>;

  if (typeof computeOrDeps === 'function') {
    const opts = fnOrOptions as ReactiveOptions<T> | undefined;

    comp = new ComputedImpl(computeOrDeps, opts?.equals, opts?.name, opts?.fallback);
  } else {
    const deps = computeOrDeps as ReadonlyArray<ReadonlySignal<unknown>>;
    const fn = fnOrOptions as (...args: unknown[]) => T;
    const opts = options;

    comp = new ComputedImpl(
      () => {
        const values = deps.map((d) => d.value); // tracked reads for explicit deps

        return untrack(() => fn(...values)); // fn runs untracked — no extra dep registration
      },
      opts?.equals,
      opts?.name,
      opts?.fallback,
    );
  }

  const ctx = getTracking();

  // Auto-dispose when created inside an effect or scope — they own the lifetime.
  if (ctx !== null && ctx.kind !== 'computed') {
    ctx.cleanups.push(() => comp.dispose());
  }

  return comp;
}
