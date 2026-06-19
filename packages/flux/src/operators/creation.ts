import type { Flux } from '../types';

import { flux } from '../core';

/**
 * Creates a `Flux` that emits each argument in order, then completes.
 *
 * @example
 * of(1, 2, 3).subscribe(console.log); // 1, 2, 3
 */
export function of<T>(...values: T[]): Flux<T> {
  return flux<T>((observer) => {
    for (const v of values) {
      observer.next(v);
    }

    observer.complete?.();
  });
}

/**
 * Converts an `Iterable`, `AsyncIterable`, or `Promise` into a `Flux`.
 *
 * @example
 * from([1, 2, 3]).subscribe(console.log);
 * from(fetch('/api/data').then((r) => r.json())).subscribe(console.log);
 */
export function from<T>(source: AsyncIterable<T> | Iterable<T> | Promise<T>): Flux<T> {
  if (source instanceof Promise) {
    return flux<T>((observer) => {
      let cancelled = false;

      source
        .then((v) => {
          if (!cancelled) {
            observer.next(v);
            observer.complete?.();
          }
        })
        .catch((err) => {
          if (!cancelled) observer.error?.(err);
        });

      return () => {
        cancelled = true;
      };
    });
  }

  if (Symbol.asyncIterator in source) {
    const asyncSrc = source as AsyncIterable<T>;

    return flux<T>((observer) => {
      let cancelled = false;

      (async () => {
        try {
          for await (const v of asyncSrc) {
            if (cancelled) break;

            observer.next(v);
          }

          if (!cancelled) observer.complete?.();
        } catch (err) {
          if (!cancelled) observer.error?.(err);
        }
      })();

      return () => {
        cancelled = true;
      };
    });
  }

  const iterSrc = source as Iterable<T>;

  return flux<T>((observer) => {
    try {
      for (const v of iterSrc) {
        observer.next(v);
      }

      observer.complete?.();
    } catch (err) {
      observer.error?.(err);
    }
  });
}

/**
 * Emits an incrementing integer (starting at 0) every `ms` milliseconds.
 *
 * @example
 * const ticks = interval(1000); // 0, 1, 2, ... every second
 */
export function interval(ms: number): Flux<number> {
  return flux<number>((observer) => {
    let i = 0;
    const id = setInterval(() => observer.next(i++), ms);

    return () => clearInterval(id);
  });
}

/**
 * After an initial `delay` ms, emits `0`, then (if `intervalMs` is provided)
 * emits incrementing values every `intervalMs` ms.
 *
 * @example
 * timer(1000).subscribe(console.log);          // emits 0 after 1s, then completes
 * timer(1000, 500).subscribe(console.log);     // emits 0 after 1s, then 1, 2, 3... every 500ms
 */
export function timer(delay: number, intervalMs?: number): Flux<number> {
  return flux<number>((observer) => {
    let count = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const timeoutId = setTimeout(() => {
      observer.next(count++);

      if (intervalMs !== undefined) {
        intervalId = setInterval(() => observer.next(count++), intervalMs);
      } else {
        observer.complete?.();
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);

      if (intervalId !== undefined) clearInterval(intervalId);
    };
  });
}

/** A `Flux` that completes immediately without emitting any values. */
export function empty<T = never>(): Flux<T> {
  return flux<T>((observer) => {
    observer.complete?.();
  });
}

/** A `Flux` that never emits, errors, or completes. */
export function never<T = never>(): Flux<T> {
  return flux<T>(() => {});
}

/** A `Flux` that immediately errors with the given value. */
export function throwError<T = never>(errorFactory: (() => unknown) | unknown): Flux<T> {
  return flux<T>((observer) => {
    const err = typeof errorFactory === 'function' ? (errorFactory as () => unknown)() : errorFactory;

    observer.error?.(err);
  });
}

/**
 * Creates a `Flux` from a DOM `EventTarget` or Node.js `EventEmitter`-like
 * object, emitting each time the named event fires.
 *
 * @example
 * fromEvent(document, 'click').subscribe((e) => console.log(e));
 */
export function fromEvent<T = Event>(
  target: {
    addEventListener(type: string, listener: (event: T) => void): void;
    removeEventListener(type: string, listener: (event: T) => void): void;
  },
  eventName: string,
): Flux<T> {
  return flux<T>((observer) => {
    const handler = (event: T): void => observer.next(event);

    target.addEventListener(eventName, handler);

    return () => target.removeEventListener(eventName, handler);
  });
}
