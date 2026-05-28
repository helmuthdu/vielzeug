import type { ComputedSignal, DepEntry, DirtyComputed, ReactiveOptions, Subscriber, Subscription } from './types';

import { StateError } from './error';
import { IS_COMPUTED, IS_SIGNAL, UNINITIALIZED, ensureError } from './helpers';
import { ReactiveNode } from './node';
import { notifyNodeChange } from './scheduling';
import { getTracking, withTracking } from './tracking';

export class ComputedImpl<T> extends ReactiveNode implements ComputedSignal<T>, DirtyComputed {
  private value_: T | typeof UNINITIALIZED = UNINITIALIZED;
  private dirty_ = true;
  private computing_ = false;
  private disposed_ = false;
  private deps_: DepEntry[] = [];
  private compute_: () => T;
  private equals_: (a: unknown, b: unknown) => boolean;
  [IS_SIGNAL] = true;
  [IS_COMPUTED] = true;

  constructor(compute: () => T, equals?: (a: T, b: T) => boolean, name?: string) {
    super(name);
    this.compute_ = compute;
    this.equals_ = equals !== undefined ? (a, b) => equals(a as T, b as T) : Object.is;
  }

  markDirty(): boolean {
    if (this.disposed_ || this.dirty_) return false;

    this.dirty_ = true;

    return true;
  }

  refreshIfDirty(): boolean {
    if (!this.dirty_) return false;

    // Version fast-path: if all dep versions still match, the value cannot have changed.
    // Skip recompute — clear dirty flag and return false (no change).
    if (this.deps_.length > 0 && this.deps_.every((d) => d.source.version === d.version)) {
      this.dirty_ = false;

      return false;
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

      const next = withTracking(
        {
          cleanups: null,
          computed: this as unknown as DirtyComputed,
          depCollector: newDeps,
          effect: null,
          subscriptions: null,
        },
        this.compute_,
      );

      this.dirty_ = false;

      // Diff deps: remove subscriptions for sources that are no longer dependencies
      this.updateDeps(newDeps);

      const isNew = this.value_ === UNINITIALIZED;

      if (isNew || !this.equals_(this.value_ as T, next)) {
        this.value_ = next;
        this.version++;

        return true;
      }

      return false;
    } catch (error) {
      // Sources accessed before the throw remain in their computedSubs_ until the
      // next successful recompute or dispose(). The computed stays dirty and will retry.
      throw ensureError(error);
    } finally {
      this.computing_ = false;
    }
  }

  private updateDeps(newDeps: DepEntry[]): void {
    const oldDeps = this.deps_;

    // Fast path: same sources in same order — just refresh stored versions
    if (oldDeps.length === newDeps.length && oldDeps.every((d, i) => d.source === newDeps[i].source)) {
      for (let i = 0; i < newDeps.length; i++) {
        oldDeps[i].version = newDeps[i].version;
      }

      return;
    }

    // Slow path: deps changed — unsubscribe from dropped sources
    const newSources = new Set(newDeps.map((d) => d.source));

    for (const old of oldDeps) {
      if (!newSources.has(old.source)) {
        old.source.removeComputedSub(this as unknown as DirtyComputed);
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
    this.track();

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

    return super.subscribe(listener);
  };

  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;

    // Unsubscribe from all upstream sources
    for (const dep of this.deps_) {
      dep.source.removeComputedSub(this as unknown as DirtyComputed);
    }

    this.deps_ = [];
    this.clearSubscribers();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export const computed = <T>(compute: () => T, options?: ReactiveOptions<T>): ComputedSignal<T> => {
  const comp = new ComputedImpl(compute, options?.equals, options?.name);
  const ctx = getTracking();

  if (ctx !== null && ctx.cleanups !== null) {
    ctx.cleanups.push(() => comp.dispose());
  }

  return comp;
};
