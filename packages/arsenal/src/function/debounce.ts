import type { Fn } from '../types';

export type Debounced<T extends Fn> = ((...args: Parameters<T>) => void) & {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
};

/**
 * Debounce a function (trailing). Use `flush` to invoke immediately,
 * `cancel` to clear, and `pending` to check if an invocation is scheduled.
 */
export function debounce<T extends Fn>(fn: T, delay = 300): Debounced<T> {
  let timerId: number | undefined;
  let lastArgs: Parameters<T> | undefined;

  const clearTimer = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const invoke = () => {
    clearTimer();

    if (!lastArgs) return undefined;

    const args = lastArgs;

    lastArgs = undefined;

    return fn(...args) as ReturnType<T>;
  };

  return Object.assign(
    (...args: Parameters<T>): void => {
      lastArgs = args;
      clearTimer();
      timerId = setTimeout(invoke, delay) as unknown as number;
    },
    {
      cancel: () => {
        clearTimer();
        lastArgs = undefined;
      },
      flush: (): ReturnType<T> | undefined => invoke(),
      pending: () => timerId !== undefined,
    },
  );
}
