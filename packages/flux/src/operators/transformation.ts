import { link } from '../_link';
import { assertPositiveInteger } from '../_numeric';
import { tryCall } from '../_safe';
import { stream } from '../core';
import { FluxCapacityError } from '../errors';
import type { Operator, Stream, Subscription } from '../types';

export type FlattenOptions = {
  /** Maximum concurrently active inner subscriptions. Use `Infinity` for unbounded concurrency. */
  concurrency: number;
  /** Maximum queued outer values waiting for an inner subscription slot. Required when `concurrency` is finite. */
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

function flatten<A, B>(project: (value: A) => Stream<B>, options: FlattenOptions): Operator<A, B> {
  const unbounded = options.concurrency === Infinity;

  if (!unbounded) {
    assertPositiveInteger(options.concurrency, 'mergeMap concurrency');
    assertPositiveInteger(options.capacity, 'mergeMap capacity');
  }

  return (source) =>
    stream((sink, signal) => {
      const queue: A[] = [];
      const inners = new Set<Subscription>();
      let outerComplete = false;
      const outerRef: { current?: Subscription } = {};

      const finish = (): void => {
        if (outerComplete && inners.size === 0 && queue.length === 0) sink.complete();
      };

      const startInner = (value: A): void => {
        tryCall(() => {
          const innerRef: { current?: Subscription } = {};

          innerRef.current = link(
            project(value),
            {
              complete() {
                if (innerRef.current) inners.delete(innerRef.current);

                drain();
              },
              error: sink.error,
              next: sink.next,
            },
            signal,
          );

          if (!innerRef.current.closed) inners.add(innerRef.current);
          else drain();
        }, sink.error);
      };

      const drain = (): void => {
        if (signal.aborted) return;

        while (queue.length > 0 && (unbounded || inners.size < options.concurrency)) {
          const value = queue.shift()!;

          startInner(value);
        }

        finish();
      };

      outerRef.current = link(
        source,
        {
          complete() {
            outerComplete = true;
            finish();
          },
          error: sink.error,
          next(value) {
            if (!unbounded && queue.length >= options.capacity) {
              outerRef.current?.unsubscribe();
              sink.error(new FluxCapacityError(options.capacity, 'mergeMap buffer capacity exceeded'));

              return;
            }

            queue.push(value);
            drain();
          },
        },
        signal,
      );

      return () => {
        outerRef.current?.unsubscribe();
        for (const inner of inners) inner.unsubscribe();
        queue.length = 0;
      };
    });
}

export function mergeMap<A, B>(project: (value: A) => Stream<B>, options: FlattenOptions): Operator<A, B> {
  return flatten(project, options);
}

export function concatMap<A, B>(
  project: (value: A) => Stream<B>,
  options: Omit<FlattenOptions, 'concurrency'>,
): Operator<A, B> {
  return flatten(project, { capacity: options.capacity, concurrency: 1 });
}
