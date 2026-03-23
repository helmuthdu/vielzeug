import { effect } from './effect';
import { type EqualityFn, type ReadonlySignal, type Subscription } from './types';

export type WatchOptions<T> = {
  /** Custom equality; suppresses the callback when old and new values are equal. Default: Object.is */
  equals?: EqualityFn<T>;
  /** Fire the callback immediately with the current value on subscribe. */
  immediate?: boolean;
  /**
   * Auto-unsubscribe after the first *change* invocation.
   * When combined with `immediate`, the immediate call does not count against this quota —
   * the callback may fire up to twice total.
   */
  once?: boolean;
};

/**
 * Watches a Signal and calls cb when its value changes. Returns a dispose handle.
 * Does not fire on initial subscription unless `{ immediate: true }` is passed.
 * To watch a derived slice, compose with `store.select()` or `computed()`:
 *
 * @example
 * const stop = watch(count, (next, prev) => console.log(prev, '->', next));
 * const stop = watch(userStore.select(s => s.name), (name) => ...);
 */
export const watch = <T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription => {
  const eq: EqualityFn<T> = options?.equals ?? Object.is;
  let prev = source.peek();

  if (options?.immediate) cb(prev, prev);

  // Use `let` so the stop reference is readable inside the callback without TDZ risk.
  let stop: Subscription;

  // eslint-disable-next-line prefer-const
  stop = effect(() => {
    const next = source.value;

    if (!eq(prev, next)) {
      const old = prev;

      prev = next;
      cb(next, old);

      if (options?.once) stop();
    }
  });

  return stop;
};

/**
 * Returns a Promise that resolves with the next value of `source` that satisfies the optional predicate.
 * Disposes automatically after one emission — no cleanup needed.
 * Pass `{ signal: AbortSignal }` to cancel early; the promise rejects with the abort reason.
 *
 * @example
 * const name = await nextValue(userStore.select(s => s.name));
 * const nonZero = await nextValue(count, v => v > 0, { signal: AbortSignal.timeout(5000) });
 */
export const nextValue = <T>(
  source: ReadonlySignal<T>,
  predicate?: (v: T) => boolean,
  options?: { signal?: AbortSignal },
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const signal = options?.signal;

    try {
      signal?.throwIfAborted();
    } catch (err) {
      reject(err);

      return;
    }

    const stop = watch(source, (v) => {
      if (!predicate || predicate(v)) {
        stop();
        signal?.removeEventListener('abort', onAbort);
        resolve(v);
      }
    });

    const onAbort = () => {
      stop();
      reject(signal!.reason);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
