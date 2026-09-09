import { createSubscription } from './_subscription.js';
import type { Observer, Producer, Stream, SubscribeOptions, Subscription, Teardown } from './types.js';

/** Creates lazy work. Producer cleanup belongs to each individual subscription. */
export function stream<T>(producer: Producer<T>): Stream<T> {
  return {
    subscribe(observer: Observer<T> | ((value: T) => void), options?: SubscribeOptions): Subscription {
      const subscription = createSubscription(observer, options?.signal);

      if (subscription.subscription.closed) return subscription.subscription;

      try {
        subscription.add(producer(subscription.sink, subscription.signal));
      } catch (reason) {
        subscription.sink.error(reason);
      }

      return subscription.subscription;
    },
  };
}

/** Bridge a callback-based value subscription into a Flux stream. */
export function fromSubscribe<T>(subscribe: (listener: (value: T) => void) => Teardown): Stream<T> {
  return stream((sink) => subscribe(sink.next));
}

/** Bridge a snapshot/subscription state source into a Flux stream. */
export function fromStore<T>(source: { getSnapshot(): T; subscribe(listener: () => void): Teardown }): Stream<T> {
  return stream((sink, signal) => {
    let current: T;

    try {
      current = source.getSnapshot();
      sink.next(current);
      if (signal.aborted) return;
    } catch (reason) {
      sink.error(reason);
      return;
    }

    const teardown = source.subscribe(() => {
      try {
        current = source.getSnapshot();
        sink.next(current);
      } catch (reason) {
        sink.error(reason);
      }
    });

    if (signal.aborted) return teardown;

    try {
      const latest = source.getSnapshot();
      if (!Object.is(current, latest)) sink.next(latest);
    } catch (reason) {
      sink.error(reason);
    }

    return teardown;
  });
}
