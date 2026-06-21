import type { Flux, Operator, Unsubscribe } from '../types';

import { flux } from '../core';

/**
 * Merge multiple `Flux` streams into one, emitting values as they arrive.
 *
 * @example
 * merge(clicks$, keydowns$).subscribe(console.log);
 */
export function merge<T>(...sources: Flux<T>[]): Flux<T> {
  return flux<T>((observer) => {
    if (sources.length === 0) {
      observer.complete?.();

      return;
    }

    let completedCount = 0;
    const unsubs: Unsubscribe[] = [];

    for (const source of sources) {
      unsubs.push(
        source.subscribe({
          complete() {
            completedCount++;

            if (completedCount === sources.length) observer.complete?.();
          },
          error: observer.error,
          next: observer.next,
        }),
      );
    }

    return () => {
      for (const u of unsubs) u();
    };
  });
}

/**
 * Subscribe to each source sequentially — the next source only starts after
 * the previous one completes.
 *
 * @example
 * concat(of(1, 2), of(3, 4)); // emits 1, 2, 3, 4
 */
export function concat<T>(...sources: Flux<T>[]): Flux<T> {
  return flux<T>((observer) => {
    let index = 0;
    let currentUnsub: Unsubscribe | undefined;

    function subscribeNext(): void {
      if (index >= sources.length) {
        observer.complete?.();

        return;
      }

      currentUnsub = sources[index++]!.subscribe({
        complete() {
          currentUnsub = undefined;
          subscribeNext();
        },
        error: observer.error,
        next: observer.next,
      });
    }

    subscribeNext();

    return () => currentUnsub?.();
  });
}

/**
 * Combine the latest values from all sources into a tuple whenever any source emits.
 * Waits until all sources have emitted at least once before emitting.
 *
 * @example
 * combineLatest(a$, b$).subscribe(([a, b]) => console.log(a, b));
 */
export function combineLatest<T extends Flux<unknown>[]>(
  ...sources: T
): Flux<{ [K in keyof T]: T[K] extends Flux<infer V> ? V : never }> {
  type Out = { [K in keyof T]: T[K] extends Flux<infer V> ? V : never };

  return flux<Out>((observer) => {
    if (sources.length === 0) {
      observer.complete?.();

      return;
    }

    const latests = new Array(sources.length) as Out;
    const hasValue = new Array<boolean>(sources.length).fill(false);
    let completedCount = 0;
    const unsubs: Unsubscribe[] = [];

    sources.forEach((source, i) => {
      unsubs.push(
        source.subscribe({
          complete() {
            completedCount++;

            if (completedCount === sources.length) observer.complete?.();
          },
          error: observer.error,
          next(v) {
            latests[i] = v as Out[typeof i];
            hasValue[i] = true;

            if (hasValue.every(Boolean)) observer.next([...latests] as Out);
          },
        }),
      );
    });

    return () => {
      for (const u of unsubs) u();
    };
  });
}

/**
 * Emit from `source` combined with the latest values from `others` as a tuple.
 * Does not wait for others to emit — emits whenever `source` emits (if others have a value).
 *
 * @example
 * a$.pipe(withLatestFrom(b$)).subscribe(([a, b]) => console.log(a, b));
 */
export function withLatestFrom<T, U extends Flux<unknown>[]>(
  ...others: U
): Operator<T, [T, ...{ [K in keyof U]: U[K] extends Flux<infer V> ? V : never }]> {
  type Rest = { [K in keyof U]: U[K] extends Flux<infer V> ? V : never };
  type Out = [T, ...Rest];

  return (source) =>
    flux<Out>((observer) => {
      const latests = new Array(others.length) as Rest;
      const hasValue = new Array<boolean>(others.length).fill(false);
      const otherUnsubs: Unsubscribe[] = [];

      others.forEach((other, i) => {
        otherUnsubs.push(
          other.subscribe({
            next(v) {
              latests[i] = v as Rest[typeof i];
              hasValue[i] = true;
            },
          }),
        );
      });

      const sourceUnsub = source.subscribe({
        complete: observer.complete,
        error: observer.error,
        next(v) {
          if (hasValue.every(Boolean)) {
            observer.next([v, ...latests] as Out);
          }
        },
      });

      return () => {
        sourceUnsub();

        for (const u of otherUnsubs) u();
      };
    });
}

/**
 * Subscribe to all sources; emit the first value from whichever source emits first,
 * then unsubscribe from all others.
 *
 * @example
 * race(timedOut$, userClicked$).subscribe(console.log);
 */
export function race<T>(...sources: Flux<T>[]): Flux<T> {
  return flux<T>((observer) => {
    if (sources.length === 0) {
      observer.complete?.();

      return;
    }

    let winner = false;
    const unsubs: Unsubscribe[] = [];

    for (const source of sources) {
      unsubs.push(
        source.subscribe({
          complete() {
            if (!winner) {
              winner = true;
              observer.complete?.();

              for (const u of unsubs) u();
            }
          },
          error(err) {
            if (!winner) {
              winner = true;
              observer.error?.(err);

              for (const u of unsubs) u();
            }
          },
          next(v) {
            if (!winner) {
              winner = true;
              observer.next(v);

              for (const u of unsubs) u();
            }
          },
        }),
      );
    }

    return () => {
      for (const u of unsubs) u();
    };
  });
}

/**
 * Pair emissions by index across all sources. Emits a tuple when all sources
 * have each emitted their N-th value. Completes when any source completes.
 *
 * @example
 * zip(of(1, 2), of('a', 'b')); // emits [1,'a'], [2,'b']
 */
export function zip<T extends Flux<unknown>[]>(
  ...sources: T
): Flux<{ [K in keyof T]: T[K] extends Flux<infer V> ? V : never }> {
  type Out = { [K in keyof T]: T[K] extends Flux<infer V> ? V : never };

  return flux<Out>((observer) => {
    if (sources.length === 0) {
      observer.complete?.();

      return;
    }

    const buffers = sources.map(() => [] as unknown[]);
    const completed = new Array<boolean>(sources.length).fill(false);
    const unsubs: Unsubscribe[] = [];
    let done = false;

    function checkAndEmit(): void {
      if (done) return;

      while (buffers.every((b) => b.length > 0)) {
        const tuple = buffers.map((b) => b.shift()) as Out;

        observer.next(tuple);
      }

      if (buffers.some((b, i) => completed[i] && b.length === 0)) {
        done = true;
        observer.complete?.();

        for (const u of unsubs) u();
      }
    }

    sources.forEach((source, i) => {
      unsubs.push(
        source.subscribe({
          complete() {
            completed[i] = true;
            checkAndEmit();
          },
          error(err) {
            done = true;
            observer.error?.(err);

            for (const u of unsubs) u();
          },
          next(v) {
            buffers[i]!.push(v);
            checkAndEmit();
          },
        }),
      );
    });

    return () => {
      for (const u of unsubs) u();
    };
  });
}

/**
 * Wait for all sources to complete, then emit a single tuple of last values.
 * Similar to `Promise.all`.
 *
 * @example
 * forkJoin(fetch1$, fetch2$).subscribe(([r1, r2]) => console.log(r1, r2));
 */
export function forkJoin<T extends Flux<unknown>[]>(
  ...sources: T
): Flux<{ [K in keyof T]: T[K] extends Flux<infer V> ? V : never }> {
  type Out = { [K in keyof T]: T[K] extends Flux<infer V> ? V : never };

  return flux<Out>((observer) => {
    if (sources.length === 0) {
      observer.complete?.();

      return;
    }

    const results = new Array(sources.length) as Out;
    const completed = new Array<boolean>(sources.length).fill(false);
    const unsubs: Unsubscribe[] = [];

    sources.forEach((source, i) => {
      let lastValue: unknown;
      let hasValue = false;

      unsubs.push(
        source.subscribe({
          complete() {
            completed[i] = true;

            if (!hasValue) {
              observer.complete?.();

              for (const u of unsubs) u();

              return;
            }

            results[i] = lastValue as Out[typeof i];

            if (completed.every(Boolean)) {
              observer.next([...results] as Out);
              observer.complete?.();
            }
          },
          error: observer.error,
          next(v) {
            lastValue = v;
            hasValue = true;
          },
        }),
      );
    });

    return () => {
      for (const u of unsubs) u();
    };
  });
}
