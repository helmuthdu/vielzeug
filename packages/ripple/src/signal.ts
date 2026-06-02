import type { ComputedSignal, ReactiveOptions, Signal, SignalOptions, Subscription } from './types';

import { computed } from './computed';
import { getDevToolsHook } from './devtools';
import { StateError } from './error';
import { ReactiveBase } from './reactive-base';
import { notifyNodeChange } from './scheduling';
import { SubscriptionImpl } from './subscription';
import { tickRevision, trackSource } from './tracking';

export class SignalImpl<T> extends ReactiveBase<T> implements Signal<T> {
  private value_: T;
  private equals_: (a: T, b: T) => boolean;
  private disposed_: boolean;
  private batched_: boolean;
  private batchPending_: boolean;

  constructor(initial: T, equals?: (a: T, b: T) => boolean, name?: string, batched?: boolean) {
    super(name);
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
    this.batched_ = batched ?? false;
    this.disposed_ = false;
    this.batchPending_ = false;
  }

  get value(): T {
    if (!this.disposed_) trackSource(this);

    return this.value_;
  }

  set value(next: T) {
    if (this.disposed_) return;

    if (this.equals_(this.value_, next)) return;

    this.value_ = next;
    this.version = tickRevision();

    getDevToolsHook()?.onSignalWrite?.(this, this.name, next);

    if (this.batched_) {
      if (!this.batchPending_) {
        this.batchPending_ = true;
        queueMicrotask(() => {
          this.batchPending_ = false;
          notifyNodeChange(this);
        });
      }
    } else {
      notifyNodeChange(this);
    }
  }

  peek(): T {
    return this.value_;
  }

  update(fn: (current: T) => T): void {
    this.value = fn(this.value_);
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) {
      const label = this.name ? ` "${this.name}"` : '';

      throw new StateError('DISPOSED_READ', `Cannot subscribe to disposed signal${label}`);
    }

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

export const signal = <T>(initial: T, options?: SignalOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals, options?.name, options?.batched);
