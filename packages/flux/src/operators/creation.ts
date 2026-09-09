import { assertDuration } from '../_numeric.js';
import { defaultScheduler } from '../_scheduler.js';
import { reportUnhandledError } from '../_subscription.js';
import { stream } from '../core.js';
import type { Stream } from '../types.js';

export type TimerOptions = {
  delay: number;
  interval?: number;
};

export function of<T>(...values: T[]): Stream<T> {
  return stream((sink) => {
    for (const value of values) sink.next(value);
    sink.complete();
  });
}

export function from<T>(source: AsyncIterable<T> | Iterable<T> | Promise<T>): Stream<T> {
  if (Symbol.asyncIterator in Object(source)) {
    return stream((sink, signal) => {
      const iterator = (source as AsyncIterable<T>)[Symbol.asyncIterator]();

      void (async () => {
        try {
          while (!signal.aborted) {
            const result = await iterator.next();

            if (result.done) {
              sink.complete();

              return;
            }

            sink.next(result.value);
          }
        } catch (reason) {
          if (!signal.aborted) sink.error(reason);
        }
      })();

      return () => {
        try {
          const returned = iterator.return?.();
          if (returned) void returned.catch(reportUnhandledError);
        } catch (reason) {
          reportUnhandledError(reason);
        }
      };
    });
  }

  if (typeof (source as Promise<T>).then === 'function') {
    return stream((sink, signal) => {
      void (source as Promise<T>).then(
        (value) => {
          if (!signal.aborted) {
            sink.next(value);
            sink.complete();
          }
        },
        (reason: unknown) => {
          if (!signal.aborted) sink.error(reason);
        },
      );
    });
  }

  return stream((sink, signal) => {
    const iterator = (source as Iterable<T>)[Symbol.iterator]();

    try {
      while (!signal.aborted) {
        const result = iterator.next();

        if (result.done) {
          sink.complete();

          return;
        }

        sink.next(result.value);
      }
    } catch (reason) {
      sink.error(reason);
    }

    return () => {
      iterator.return?.();
    };
  });
}

export function fromEvent<T = Event>(
  target: {
    addEventListener(type: string, listener: (event: T) => void): void;
    removeEventListener(type: string, listener: (event: T) => void): void;
  },
  type: string,
): Stream<T> {
  return stream((sink) => {
    const listener = (event: T): void => sink.next(event);

    target.addEventListener(type, listener);

    return () => target.removeEventListener(type, listener);
  });
}

export function interval(every: number): Stream<number> {
  assertDuration(every, 'Interval duration');

  return stream((sink) => {
    let index = 0;

    return defaultScheduler.repeat(() => sink.next(index++), every);
  });
}

export function timer(options: TimerOptions): Stream<number> {
  assertDuration(options.delay, 'Timer delay');

  if (options.interval !== undefined) assertDuration(options.interval, 'Timer interval');

  return stream((sink) => {
    let index = 0;
    let cancelInterval: (() => void) | undefined;
    const cancelDelay = defaultScheduler.delay(() => {
      sink.next(index++);

      if (options.interval === undefined) {
        sink.complete();

        return;
      }

      cancelInterval = defaultScheduler.repeat(() => sink.next(index++), options.interval);
    }, options.delay);

    return () => {
      cancelDelay();
      cancelInterval?.();
    };
  });
}
