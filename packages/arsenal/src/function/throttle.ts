import type { Fn } from '../types';

export type ThrottleOptions = {
  leading?: boolean; // invoke at the start of the window
  trailing?: boolean; // invoke at the end with the last args
};

export type Throttled<T extends Fn> = ((...args: Parameters<T>) => void) & {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean; // whether there's a pending call that flush() would execute
};

/**
 * Throttles a function. By default, only the leading edge fires.
 * Pass `{ trailing: true }` to also invoke at the end of the throttle window.
 *
 * Example:
 * const fn = () => ...
 * const t = throttle(fn, 700);
 * const withTrailing = throttle(fn, 700, { trailing: true });
 */
export function throttle<T extends Fn>(
  fn: T,
  delay = 700,
  options: ThrottleOptions = { leading: true, trailing: false },
): Throttled<T> {
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? false;

  let timerId: number | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastResult: ReturnType<T> | undefined;

  const clearTimer = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const scheduleTimer = (delayMs: number) => {
    timerId = setTimeout(timerExpired, delayMs) as unknown as number;
  };

  const invoke = (now: number) => {
    lastInvokeTime = now;
    clearTimer();

    if (!lastArgs) return undefined;

    const args = lastArgs;

    lastArgs = undefined;
    lastResult = fn(...args) as ReturnType<T>;

    return lastResult;
  };

  const remaining = (now: number) => delay - (now - lastInvokeTime);

  const timerExpired = () => {
    const now = Date.now();

    if (lastArgs && remaining(now) <= 0) {
      // trailing edge invoke
      invoke(now);
    } else if (lastArgs) {
      // reschedule until a window elapses
      scheduleTimer(remaining(now));
    } else {
      clearTimer();
    }
  };

  return Object.assign(
    (...args: Parameters<T>): void => {
      const now = Date.now();

      if (lastInvokeTime === 0 && !leading) {
        // If leading is false, start the window now but don't invoke immediately
        lastInvokeTime = now;
      }

      lastArgs = args;

      const rem = remaining(now);

      if (rem <= 0) {
        // Window elapsed: invoke now
        invoke(now);
      } else if (trailing && !timerId) {
        // Schedule trailing call if not already scheduled
        scheduleTimer(rem);
      }
    },
    {
      cancel: () => {
        clearTimer();
        lastArgs = undefined;
        lastInvokeTime = 0;
      },
      flush: (): ReturnType<T> | undefined => {
        if (!lastArgs) return undefined;

        return invoke(Date.now()) as ReturnType<T> | undefined;
      },
      // Pending if a trailing call is scheduled OR there are queued args.
      pending: () => lastArgs !== undefined || timerId !== undefined,
    },
  );
}
