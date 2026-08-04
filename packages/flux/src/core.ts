import type { Observer, Producer, Stream, SubscribeOptions, Subscription } from './types';

import { createSubscription } from './_subscription';

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
