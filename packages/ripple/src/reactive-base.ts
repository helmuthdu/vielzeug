import type { Subscriber } from './types';

import { registerSignal } from './registry';
import { IS_COMPUTED, IS_SIGNAL } from './symbols';

// ── Global FinalizationRegistry (F1) ──────────────────────────────────────────
//
// When a ComputedBase node becomes garbage-collectible, the registry fires and
// removes the dead WeakRef from its source's computedSubs_ set.  This lets
// orphaned computeds (created outside a scope/effect and never explicitly
// disposed) be reclaimed by the GC without manual lifecycle management.

type ComputedWeakEntry = {
  readonly ref: WeakRef<ComputedBase<unknown>>;
  readonly set: Set<WeakRef<ComputedBase<unknown>>>;
};

const computedSubRegistry = new FinalizationRegistry<ComputedWeakEntry>(({ ref, set }) => {
  set.delete(ref);
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

  private readonly computedSubs_ = new Set<WeakRef<ComputedBase<unknown>>>();
  private readonly effectSubs_ = new Set<Subscriber>();

  constructor(name?: string) {
    this.name = name;

    if (name !== undefined) registerSignal(this, name);
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

    this.computedSubs_.add(ref);
    computedSubRegistry.register(c, { ref, set: this.computedSubs_ }, ref);
  }

  removeComputedSub(c: ComputedBase<unknown>): void {
    for (const ref of this.computedSubs_) {
      const node = ref.deref();

      if (node === undefined) {
        // Dead ref not yet cleaned by the registry — purge eagerly.
        this.computedSubs_.delete(ref);
      } else if (node === c) {
        this.computedSubs_.delete(ref);
        computedSubRegistry.unregister(ref);

        return;
      }
    }
  }

  addEffectSub(subscriber: Subscriber): void {
    this.effectSubs_.add(subscriber);
  }

  removeEffectSub(subscriber: Subscriber): void {
    this.effectSubs_.delete(subscriber);
  }

  protected clearSubscribers(): void {
    for (const ref of this.computedSubs_) {
      computedSubRegistry.unregister(ref);
    }

    this.computedSubs_.clear();
    this.effectSubs_.clear();
  }

  hasSubscribers(): boolean {
    if (this.effectSubs_.size > 0) return true;

    for (const ref of this.computedSubs_) {
      if (ref.deref() !== undefined) return true;
    }

    return false;
  }

  /**
   * Returns a live iterable of downstream computed subscribers, automatically
   * skipping any WeakRefs whose targets have already been collected.
   */
  computedSubs(): Iterable<ComputedBase<unknown>> {
    const set = this.computedSubs_;

    return {
      [Symbol.iterator](): Iterator<ComputedBase<unknown>> {
        const iter = set[Symbol.iterator]();

        return {
          next(): IteratorResult<ComputedBase<unknown>> {
            for (;;) {
              const { done, value: ref } = iter.next();

              if (done) return { done: true, value: undefined as unknown as ComputedBase<unknown> };

              const node = ref.deref();

              if (node !== undefined) return { done: false, value: node };
            }
          },
        };
      },
    };
  }

  effectSubs(): ReadonlySet<Subscriber> {
    return this.effectSubs_;
  }

  abstract get value(): T;
  abstract peek(): T;
}

// ── ComputedBase ──────────────────────────────────────────────────────────────

/**
 * Extension of ReactiveBase for derived (lazy) nodes that can be marked dirty
 * and refreshed on demand.  Exposes the two methods scheduling.ts needs without
 * importing the concrete ComputedImpl class (breaks the potential circular dep).
 */
export abstract class ComputedBase<T> extends ReactiveBase<T> {
  [IS_COMPUTED] = true;

  abstract markDirty(): boolean;
  abstract refreshIfDirty(): boolean;
}
