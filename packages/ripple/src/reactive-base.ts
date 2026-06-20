import type { Subscriber } from './types';

import { IS_COMPUTED, IS_SIGNAL } from './symbols';

// ── Global FinalizationRegistry (F1) ──────────────────────────────────────────
//
// When a ComputedBase node becomes garbage-collectible, the registry fires and
// removes the entry from its source's computedSubs_ map.  This lets orphaned
// computeds (created outside a scope/effect and never explicitly disposed) be
// reclaimed by the GC without manual lifecycle management.

type ComputedWeakEntry = {
  readonly key: ComputedBase<unknown>;
  readonly map: Map<ComputedBase<unknown>, WeakRef<ComputedBase<unknown>>>;
};

const computedSubRegistry = new FinalizationRegistry<ComputedWeakEntry>(({ key, map }) => {
  map.delete(key);
});

// ── ReactiveBase ──────────────────────────────────────────────────────────────

/**
 * Abstract base shared by SignalImpl and ComputedImpl.
 *
 * Centralises:
 * - Subscriber-set management (computed subs via WeakRef, effect subs directly)
 * - Version counter (used for dep-version cache invalidation in computed)
 * - The [IS_SIGNAL] brand marker
 */
export abstract class ReactiveBase<T> {
  version = 0;
  readonly name: string | undefined;
  [IS_SIGNAL] = true;

  // A single Map<computed, WeakRef> replaces the previous Set<WeakRef> + WeakMap pair.
  // O(1) add, remove, and lookup without keeping two structures in sync.
  private readonly computedSubs_ = new Map<ComputedBase<unknown>, WeakRef<ComputedBase<unknown>>>();
  private readonly effectSubs_ = new Set<Subscriber>();

  constructor(name?: string) {
    this.name = name;
  }

  /**
   * Registers a computed as a downstream subscriber.  Callers (trackSource in
   * tracking.ts) must ensure they only call this for genuinely NEW deps — i.e.
   * deps not already present in the previous dep list.  This guarantees each
   * computed is registered exactly once per source, keeping the WeakRef set
   * clean without needing a dedup scan.
   */
  addComputedSub(c: ComputedBase<unknown>): void {
    const ref = new WeakRef(c);

    this.computedSubs_.set(c, ref);
    computedSubRegistry.register(c, { key: c, map: this.computedSubs_ }, ref);
  }

  removeComputedSub(c: ComputedBase<unknown>): void {
    const ref = this.computedSubs_.get(c);

    if (ref === undefined) return;

    this.computedSubs_.delete(c);
    computedSubRegistry.unregister(ref);
  }

  addEffectSub(subscriber: Subscriber): void {
    this.effectSubs_.add(subscriber);
  }

  removeEffectSub(subscriber: Subscriber): void {
    this.effectSubs_.delete(subscriber);
  }

  protected clearSubscribers(): void {
    for (const ref of this.computedSubs_.values()) {
      computedSubRegistry.unregister(ref);
    }

    this.computedSubs_.clear();
    this.effectSubs_.clear();
  }

  hasSubscribers(): boolean {
    if (this.effectSubs_.size > 0) return true;

    for (const ref of this.computedSubs_.values()) {
      if (ref.deref() !== undefined) return true;
    }

    return false;
  }

  /**
   * Yields live downstream computed subscribers.
   * Dead WeakRefs (GC'd computeds) are pruned eagerly from the map on each traversal,
   * keeping the subscriber set compact without requiring manual dispose calls.
   */
  *computedSubs(): Generator<ComputedBase<unknown>> {
    for (const [key, ref] of this.computedSubs_) {
      const node = ref.deref();

      if (node !== undefined) {
        yield node;
      } else {
        this.computedSubs_.delete(key);
        computedSubRegistry.unregister(ref);
      }
    }
  }

  effectSubs(): ReadonlySet<Subscriber> {
    return this.effectSubs_;
  }

  abstract get value(): T;
  abstract peek(): T;
}

// ── Refreshable ──────────────────────────────────────────────────────────────

/**
 * Structural interface for lazy nodes that support dirty-flagging and
 * on-demand recompute. Used by tracking.ts to pull computed deps without
 * importing the concrete ComputedImpl class.
 */
export interface Refreshable {
  refreshIfDirty(): boolean;
}

// ── ComputedBase ──────────────────────────────────────────────────────────────

/**
 * Extension of ReactiveBase for derived (lazy) nodes that can be marked dirty
 * and refreshed on demand.  Exposes the two methods scheduling.ts needs without
 * importing the concrete ComputedImpl class (breaks the potential circular dep).
 */
export abstract class ComputedBase<T> extends ReactiveBase<T> implements Refreshable {
  [IS_COMPUTED] = true;
  lastPropEpoch_ = 0;

  abstract markDirty(): boolean;
  abstract refreshIfDirty(): boolean;
}
