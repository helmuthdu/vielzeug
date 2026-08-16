import { link } from '../_link';
import { stream } from '../core';
import type { Stream, Subscription } from '../types';

type StreamValue<T> = T extends Stream<infer Value> ? Value : never;
type StreamValues<T extends readonly Stream<unknown>[]> = { [Key in keyof T]: StreamValue<T[Key]> };

export function merge<T>(...sources: Stream<T>[]): Stream<T> {
  return stream((sink, signal) => {
    if (sources.length === 0) {
      sink.complete();

      return;
    }

    let completed = 0;
    const subscriptions: Subscription[] = [];

    for (const source of sources) {
      const subscription = link(
        source,
        {
          complete() {
            completed++;

            if (completed === sources.length) sink.complete();
          },
          error: sink.error,
          next: sink.next,
        },
        signal,
      );

      subscriptions.push(subscription);

      if (signal.aborted) break;
    }

    return () =>
      subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
  });
}

export function concat<T>(...sources: Stream<T>[]): Stream<T> {
  return stream((sink, signal) => {
    let index = 0;
    let current: Subscription | undefined;

    const subscribeNext = (): void => {
      if (signal.aborted) return;

      const source = sources[index++];

      if (!source) {
        sink.complete();

        return;
      }

      const subscription = link(
        source,
        {
          complete: subscribeNext,
          error: sink.error,
          next: sink.next,
        },
        signal,
      );

      current = subscription.closed ? undefined : subscription;
    };

    subscribeNext();

    return () => current?.unsubscribe();
  });
}

export function combineLatest<T extends readonly Stream<unknown>[]>(...sources: T): Stream<StreamValues<T>> {
  return stream((sink, signal) => {
    if (sources.length === 0) {
      sink.complete();

      return;
    }

    const values = new Array<unknown>(sources.length);
    const ready = new Array<boolean>(sources.length).fill(false);
    const subscriptions: Subscription[] = [];
    let completed = 0;

    for (const [index, source] of sources.entries()) {
      if (signal.aborted) break;

      const subscription = link(
        source,
        {
          complete() {
            if (!ready[index]) {
              sink.complete();

              return;
            }

            completed++;

            if (completed === sources.length) sink.complete();
          },
          error: sink.error,
          next(value) {
            values[index] = value;
            ready[index] = true;

            if (ready.every(Boolean)) sink.next([...values] as StreamValues<T>);
          },
        },
        signal,
      );

      subscriptions.push(subscription);
    }

    return () =>
      subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
  });
}
