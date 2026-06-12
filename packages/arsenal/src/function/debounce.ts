import type { Fn } from '../types';

export type DebounceOptions = {
  /** Invoke on the leading edge of the delay window. Default: `false`. */
  leading?: boolean;
  /** Invoke on the trailing edge of the delay window. Default: `true`. */
  trailing?: boolean;
};

export type Debounced<T extends Fn> = ((...args: Parameters<T>) => void) & {
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
};

/**
 * Debounces a function. By default only the trailing edge fires (after input settles).
 * Pass `{ leading: true }` to fire immediately on the first call instead.
 * Pass `{ leading: true, trailing: true }` to fire on both edges.
 *
 * Use `flush()` to invoke immediately, `cancel()` to clear, and `pending()` to check
 * whether an invocation is scheduled.
 *
 * @example
 * ```ts
 * // Trailing (default) — fires after input settles
 * const save = debounce(persist, 500);
 *
 * // Leading — fires on the first keystroke, then silences during the window
 * const submit = debounce(sendRequest, 500, { leading: true, trailing: false });
 * ```
 */
export function debounce<T extends Fn>(
  fn: T,
  delay = 300,
  options: DebounceOptions = { leading: false, trailing: true },
): Debounced<T> {
  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;

  let timerId: number | undefined;
  let lastArgs: Parameters<T> | undefined;
  let leadingFired = false;

  const clearTimer = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const invokeTrailing = () => {
    clearTimer();
    leadingFired = false;

    if (!lastArgs) return undefined;

    const args = lastArgs;

    lastArgs = undefined;

    return fn(...args) as ReturnType<T>;
  };

  return Object.assign(
    (...args: Parameters<T>): void => {
      lastArgs = args;

      if (leading && !leadingFired) {
        leadingFired = true;
        lastArgs = undefined;
        fn(...args);

        if (!trailing) {
          // Start the cooldown window; don't schedule a trailing call
          timerId = setTimeout(() => {
            timerId = undefined;
            leadingFired = false;
          }, delay) as unknown as number;

          return;
        }
      }

      // When leading-only, ignore calls within the cooldown window
      if (leading && !trailing && leadingFired) return;

      clearTimer();
      timerId = setTimeout(invokeTrailing, delay) as unknown as number;
    },
    {
      cancel: () => {
        clearTimer();
        lastArgs = undefined;
        leadingFired = false;
      },
      flush: (): ReturnType<T> | undefined => invokeTrailing(),
      pending: () => timerId !== undefined,
    },
  );
}
