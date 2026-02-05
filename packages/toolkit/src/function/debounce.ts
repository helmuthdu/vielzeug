import type { Fn } from '../types';
import { assert } from './assert';

export type Debounced<T extends Fn> = ((this: ThisParameterType<T>, ...args: Parameters<T>) => void) & {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
};

/**
 * Debounce a function (trailing). Use `flush` to invoke immediately,
 * `cancel` to clear, and `pending` to check if an invocation is scheduled.
 */
export function debounce<T extends Fn>(fn: T, delay = 300): Debounced<T> {
  assert(typeof fn === 'function', 'First argument must be a function', {
    args: { fn },
    type: TypeError,
  });
  assert(typeof delay === 'number' && delay >= 0, 'Delay must be a non-negative number', {
    args: { delay },
    type: TypeError,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: ThisParameterType<T> | undefined;
  let lastResult: ReturnType<T> | undefined;

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const invoke = () => {
    clearTimer();
    if (!lastArgs) return undefined; // nothing to invoke
    const args = lastArgs;
    const ctx = lastThis as ThisParameterType<T>;
    lastArgs = undefined;
    lastThis = undefined;
    // biome-ignore lint/suspicious/noExplicitAny: -
    lastResult = fn.apply(ctx as any, args);
    return lastResult;
  };

  const debounced = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    clearTimer();
    timer = setTimeout(invoke, delay);
  } as Debounced<T>;

  debounced.cancel = () => {
    clearTimer();
    lastArgs = undefined;
    lastThis = undefined;
  };

  debounced.flush = () => invoke() as ReturnType<T> | undefined;

  debounced.pending = () => timer !== undefined;

  return debounced;
}
