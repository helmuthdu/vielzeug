import type { DepSource, DirtyComputed, TrackingCtx, Subscriber, Subscription } from './types';

import { toSubscription } from './helpers';
import { getTracking } from './tracking';

export class ReactiveNode implements DepSource {
  version = 0;
  readonly name: string | undefined;

  private computedSubs_ = new Set<DirtyComputed>();
  private subscribers_ = new Set<Subscriber>();

  constructor(name?: string) {
    this.name = name;
  }

  protected track(): void {
    const ctx: TrackingCtx | null = getTracking();

    if (ctx === null) return;

    if (ctx.computed !== null) {
      const owner = ctx.computed;

      this.computedSubs_.add(owner);

      // Register dep entry for version-based cache validation
      ctx.depCollector?.push({ source: this, version: this.version });
    } else if (ctx.effect !== null) {
      const owner = ctx.effect;

      this.subscribers_.add(owner);
      ctx.subscriptions?.add(() => this.subscribers_.delete(owner));
    }
  }

  addComputedSub(c: DirtyComputed): void {
    this.computedSubs_.add(c);
  }

  removeComputedSub(c: DirtyComputed): void {
    this.computedSubs_.delete(c);
  }

  clearSubscribers(): void {
    this.computedSubs_.clear();
    this.subscribers_.clear();
  }

  hasSubscribers(): boolean {
    return this.computedSubs_.size > 0 || this.subscribers_.size > 0;
  }

  computedSubs(): ReadonlySet<DirtyComputed> {
    return this.computedSubs_;
  }

  subscribers(): ReadonlySet<Subscriber> {
    return this.subscribers_;
  }

  subscribe(subscriber: Subscriber): Subscription {
    this.subscribers_.add(subscriber);

    return toSubscription(() => {
      this.subscribers_.delete(subscriber);
    });
  }
}
