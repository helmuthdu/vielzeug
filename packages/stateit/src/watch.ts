import type { CleanupFn, ReadonlySignal, Subscription, WatchOptions } from './types';

import { effect } from './effect';
import { withTracking } from './tracking';

/**
 * Watches a reactive source and calls `callback` whenever it changes.
 *
 * `immediate` defaults to `false` — the callback is **not** called on creation, only on
 * subsequent changes (aligns with Vue watch, Angular effects, and general library conventions).
 *
 * If `immediate: true`, the callback is invoked once synchronously on creation with
 * `prev = undefined`.
 *
 * The callback may return a cleanup function that is called before the next invocation
 * or when the watcher is stopped. Non-function truthy return values are silently ignored
 * (unlike `effect()` which throws on them — watch callbacks commonly return `Array.push`
 * results etc.).
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const stop = watch(count, (next, prev) => console.log(next, prev));
 * count.value = 1; // logs: 1 0
 * stop();
 * ```
 */
export const watch = <T>(
  source: ReadonlySignal<T> | (() => T),
  callback: (value: T, prev: T | undefined) => CleanupFn | void,
  options?: WatchOptions<T>,
): Subscription => {
  const read: () => T = typeof source === 'function' ? source : () => source.value;
  const equals = options?.equals ?? Object.is;
  const immediate = options?.immediate ?? false;

  let prev: T | undefined = undefined;
  let firstRun = true;
  let pendingCleanup: CleanupFn | undefined;

  const invokeCallback = (next: T, p: T | undefined): void => {
    pendingCleanup?.();
    pendingCleanup = undefined;

    const returned = withTracking(null, () => callback(next, p));

    if (typeof returned === 'function') pendingCleanup = returned;
    // Non-function returns (e.g. Array.push result) are silently ignored
  };

  return effect((): CleanupFn => {
    const next = read(); // dependency tracked here

    if (firstRun) {
      firstRun = false;

      if (immediate) {
        invokeCallback(next, undefined);
      }

      prev = next;
    } else {
      // Check equality — skip callback if value hasn't semantically changed
      if (!equals(prev as T, next)) {
        invokeCallback(next, prev);
        prev = next;
      }
    }

    // Return a cleanup function to effect so it runs on re-runs/dispose
    return () => {
      pendingCleanup?.();
      pendingCleanup = undefined;
    };
  });
};
