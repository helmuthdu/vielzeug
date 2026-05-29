import type {
  ComputedSignal,
  DepSource,
  DirtyComputed,
  ReactiveNode,
  ReactiveOptions,
  Signal,
  Subscriber,
  Subscription,
} from './types';

import { computed } from './computed';
import { IS_SIGNAL, toSubscription } from './helpers';
import { notifyNodeChange } from './scheduling';
import { trackSource } from './tracking';

export class SignalImpl<T> implements Signal<T>, DepSource, ReactiveNode {
  version = 0;
  readonly name: string | undefined;
  [IS_SIGNAL] = true;

  private value_: T;
  private equals_: (a: T, b: T) => boolean;
  private disposed_ = false;
  private computedSubs_ = new Set<DirtyComputed>();
  private subscribers_ = new Set<Subscriber>();

  constructor(initial: T, equals?: (a: T, b: T) => boolean, name?: string) {
    this.name = name;
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
  }

  private track(): void {
    trackSource(this);
  }

  addComputedSub(c: DirtyComputed): void {
    this.computedSubs_.add(c);
  }

  removeComputedSub(c: DirtyComputed): void {
    this.computedSubs_.delete(c);
  }

  addEffectSub(subscriber: Subscriber): void {
    this.subscribers_.add(subscriber);
  }

  removeEffectSub(subscriber: Subscriber): void {
    this.subscribers_.delete(subscriber);
  }

  private clearSubscribers(): void {
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

  get value(): T {
    if (!this.disposed_) this.track();

    return this.value_;
  }

  set value(next: T) {
    if (this.disposed_) return;

    if (this.equals_(this.value_, next)) return;

    this.value_ = next;
    this.version++;
    notifyNodeChange(this);
  }

  peek(): T {
    return this.value_;
  }

  update(fn: (current: T) => T): void {
    this.value = fn(this.value_);
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) return toSubscription(() => {});

    this.subscribers_.add(listener);

    return toSubscription(() => {
      this.subscribers_.delete(listener);
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

  /**
   * Marks the signal as permanently inert. After disposal:
   * - reads still return the last known value (but no longer track dependencies)
   * - writes are silently ignored
   * - new subscriptions are immediately unsubscribed
   * - all existing subscriber and computed-subscriber references are dropped
   */
  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;
    this.clearSubscribers();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export const signal = <T>(initial: T, options?: ReactiveOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals, options?.name);
