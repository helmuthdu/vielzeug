import type { Signal, SignalOptions, Subscription } from './types';

import { getDevToolsHook } from './devtools-hook';
import { ReactiveBase } from './reactive-base';
import { notifyNodeChange } from './scheduling';
import { SubscriptionImpl } from './subscription';
import { tickRevision, trackSource } from './tracking';

export class SignalImpl<T> extends ReactiveBase<T> implements Signal<T> {
  private value_: T;
  private equals_: (a: T, b: T) => boolean;
  private disposed_: boolean;

  constructor(initial: T, equals?: (a: T, b: T) => boolean, name?: string) {
    super(name);
    this.value_ = initial;
    this.equals_ = equals ?? Object.is;
    this.disposed_ = false;
  }

  get value(): T {
    if (!this.disposed_) trackSource(this);

    return this.value_;
  }

  set value(next: T) {
    if (this.disposed_) return;

    if (this.equals_(this.value_, next)) return;

    const oldValue = this.value_;

    this.value_ = next;
    this.version = tickRevision();

    getDevToolsHook()?.write?.({ name: this.name, newValue: next, oldValue });
    notifyNodeChange(this);
  }

  peek(): T {
    return this.value_;
  }

  readonly subscribe = (listener: () => void): Subscription => {
    if (this.disposed_) {
      const noop = new SubscriptionImpl(() => {});

      noop.dispose();

      return noop;
    }

    this.addEffectSub(listener);

    return new SubscriptionImpl(() => {
      this.removeEffectSub(listener);
    });
  };

  /**
   * Marks the signal as permanently inert. After disposal:
   * - reads still return the last known value (but no longer track dependencies)
   * - writes are silently ignored
   * - new subscriptions are immediately unsubscribed
   * - all existing subscriber and computed-subscriber references are dropped
   */
  get disposed(): boolean {
    return this.disposed_;
  }

  dispose(): void {
    if (this.disposed_) return;

    this.disposed_ = true;
    this.clearSubscribers();
    getDevToolsHook()?.dispose?.({ kind: 'signal', name: this.name });
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

export const signal = <T>(initial: T, options?: SignalOptions<T>): Signal<T> =>
  new SignalImpl(initial, options?.equals, options?.name);
