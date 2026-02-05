import type { Fn } from '../types';
import { assert } from './assert';

export type ThrottleOptions = {
  leading?: boolean; // invoke at the start of the window
  trailing?: boolean; // invoke at the end with the last args
};

export type Throttled<T extends Fn> = ((this: ThisParameterType<T>, ...args: Parameters<T>) => void) & {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean; // whether there's a pending call that flush() would execute
};

/**
 * Throttles a function. By default, leading and trailing are both true (lodash-like behavior).
 * The function is invoked at the leading edge and trailing edge of the throttle period.
 *
 * Example:
 * const fn = () => ...
 * const t = throttle(fn, 700);
 * const leadingOnly = throttle(fn, 700, { trailing: false });
 */
export function throttle<T extends Fn>(
  fn: T,
  delay = 700,
  options: ThrottleOptions = { leading: true, trailing: true },
): Throttled<T> {
  assert(typeof fn === 'function', 'First argument must be a function', {
    args: { fn },
    type: TypeError,
  });
  assert(typeof delay === 'number' && delay >= 0, 'Delay must be a non-negative number', {
    args: { delay },
    type: TypeError,
  });

  const leading = options.leading ?? true;
  const trailing = options.trailing ?? false;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: ThisParameterType<T> | undefined;
  let lastResult: ReturnType<T> | undefined;

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const invoke = (now: number) => {
    lastInvokeTime = now;
    clearTimer();
    if (!lastArgs) return undefined;
    const args = lastArgs;
    const ctx = lastThis as ThisParameterType<T>;
    lastArgs = undefined;
    lastThis = undefined;
    // biome-ignore lint/suspicious/noExplicitAny: -
    lastResult = fn.apply(ctx as any, args);
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
      timer = setTimeout(timerExpired, remaining(now));
    } else {
      clearTimer();
    }
  };

  const throttled = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();
    if (lastInvokeTime === 0 && !leading) {
      // If leading is false, start the window now but don't invoke immediately
      lastInvokeTime = now;
    }

    lastArgs = args;
    lastThis = this;

    const rem = remaining(now);

    if (rem <= 0) {
      // Window elapsed: invoke now
      invoke(now);
    } else if (trailing && !timer) {
      // Schedule trailing call if not already scheduled
      timer = setTimeout(timerExpired, rem);
    }
  } as Throttled<T>;

  throttled.cancel = () => {
    clearTimer();
    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = 0;
  };

  throttled.flush = () => {
    if (!lastArgs) return undefined;
    const now = Date.now();
    return invoke(now) as ReturnType<T> | undefined;
  };

  // Pending if a trailing call is scheduled OR there are queued args.
  throttled.pending = () => lastArgs !== undefined || timer !== undefined;

  return throttled;
}
