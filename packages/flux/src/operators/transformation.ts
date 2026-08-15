import { link } from '../_link';
import { assertPositiveInteger } from '../_numeric';
import { tryCall } from '../_safe';
import { stream } from '../core';
import type { Operator, Stream, Subscription } from '../types';

export type ConcatMapOptions = {
  capacity: number;
};

export function map<A, B>(project: (value: A) => B): Operator<A, B> {
  return (source) =>
    stream(
      (sink, signal) =>
        link(
          source,
          {
            complete: sink.complete,
            error: sink.error,
            next(value) {
              tryCall(() => sink.next(project(value)), sink.error);
            },
          },
          signal,
        ).unsubscribe,
    );
}

export function filter<T>(predicate: (value: T) => boolean): Operator<T, T> {
  return (source) =>
    stream(
      (sink, signal) =>
        link(
          source,
          {
            complete: sink.complete,
            error: sink.error,
            next(value) {
              tryCall(() => {
                if (predicate(value)) sink.next(value);
              }, sink.error);
            },
          },
          signal,
        ).unsubscribe,
    );
}

export function scan<T, A>(reducer: (state: A, value: T) => A, initial: A): Operator<T, A> {
  return (source) =>
    stream((sink, signal) => {
      let state = initial;

      return link(
        source,
        {
          complete: sink.complete,
          error: sink.error,
          next(value) {
            tryCall(() => {
              state = reducer(state, value);
              sink.next(state);
            }, sink.error);
          },
        },
        signal,
      ).unsubscribe;
    });
}

export function switchMap<A, B>(project: (value: A) => Stream<B>): Operator<A, B> {
  return (source) =>
    stream((sink, signal) => {
      let outerComplete = false;
      let inner: Subscription | undefined;

      const finish = (): void => {
        if (outerComplete && !inner) sink.complete();
      };

      const outer = link(
        source,
        {
          complete() {
            outerComplete = true;
            finish();
          },
          error: sink.error,
          next(value) {
            inner?.unsubscribe();
            inner = undefined;

            tryCall(() => {
              const subscription = link(
                project(value),
                {
                  complete() {
                    inner = undefined;
                    finish();
                  },
                  error: sink.error,
                  next: sink.next,
                },
                signal,
              );

              inner = subscription.closed ? undefined : subscription;
            }, sink.error);
          },
        },
        signal,
      );

      return () => {
        outer.unsubscribe();
        inner?.unsubscribe();
      };
    });
}

export function mergeMap<A, B>(project: (value: A) => Stream<B>): Operator<A, B> {
  return (source) =>
    stream((sink, signal) => {
      let outerComplete = false;
      const inners = new Set<Subscription>();

      const finish = (): void => {
        if (outerComplete && inners.size === 0) sink.complete();
      };

      const outer = link(
        source,
        {
          complete() {
            outerComplete = true;
            finish();
          },
          error: sink.error,
          next(value) {
            tryCall(() => {
              const innerRef: { current?: Subscription } = {};

              innerRef.current = link(
                project(value),
                {
                  complete() {
                    if (innerRef.current) inners.delete(innerRef.current);

                    finish();
                  },
                  error: sink.error,
                  next: sink.next,
                },
                signal,
              );

              if (!innerRef.current.closed) inners.add(innerRef.current);
            }, sink.error);
          },
        },
        signal,
      );

      return () => {
        outer.unsubscribe();
        for (const inner of inners) inner.unsubscribe();
      };
    });
}

export function concatMap<A, B>(project: (value: A) => Stream<B>, options: ConcatMapOptions): Operator<A, B> {
  assertPositiveInteger(options.capacity, 'concatMap capacity');

  return (source) =>
    stream((sink, signal) => {
      const queue: A[] = [];
      let outerComplete = false;
      let inner: Subscription | undefined;
      const outerRef: { current?: Subscription } = {};

      const next = (): void => {
        if (inner || queue.length === 0) {
          if (outerComplete && !inner && queue.length === 0) sink.complete();

          return;
        }

        const value = queue.shift()!;

        tryCall(() => {
          const subscription = link(
            project(value),
            {
              complete() {
                inner = undefined;
                next();
              },
              error: sink.error,
              next: sink.next,
            },
            signal,
          );

          inner = subscription.closed ? undefined : subscription;

          if (!inner) next();
        }, sink.error);
      };

      outerRef.current = link(
        source,
        {
          complete() {
            outerComplete = true;
            next();
          },
          error: sink.error,
          next(value) {
            if (queue.length === options.capacity) {
              outerRef.current?.unsubscribe();
              sink.error(new RangeError('concatMap buffer capacity exceeded'));

              return;
            }

            queue.push(value);
            next();
          },
        },
        signal,
      );

      return () => {
        outerRef.current?.unsubscribe();
        inner?.unsubscribe();
        queue.length = 0;
      };
    });
}
