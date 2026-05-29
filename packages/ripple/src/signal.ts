import type { ComputedSignal, ReactiveOptions, Signal, Subscription } from './types';

import { computed } from './computed';
import { IS_SIGNAL, toSubscription } from './helpers';
import { ReactiveNode } from './node';
import { notifyNodeChange } from './scheduling';

export class SignalImpl<T> extends ReactiveNode implements Signal<T> {
  private value_: T;
  private equals_: (a: T, b: T) => boolean;
  private disposed_ = false;
  [IS_SIGNAL] = true;

  constructor(initial: T, equals?: (a: T, b: T) => boolean, name?: string) {
    super(name);
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
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

    return super.subscribe(listener);
  };

  derive<U>(fn: (value: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> {
    return computed(() => fn(this.value), options);
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
