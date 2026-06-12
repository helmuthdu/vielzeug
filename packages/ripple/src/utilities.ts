import type { ComputedSignal, ReactiveOptions, ReadonlySignal } from './types';

import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './symbols';
import { untrack } from './tracking';

export { untrack };

// ── Readonly wrapper ──────────────────────────────────────────────────────────
//
// Returns a thin delegation object instead of a full ComputedImpl — zero graph
// overhead. dispose() is a no-op: the wrapper does not own the source signal.
// All reads delegate to the source, registering the caller as a dep on the
// source directly rather than on an intermediary node.

/**
 * Wraps a signal or computed to produce a structurally read-only view.
 * The `value` setter and `update` are hidden. Delegates reads directly
 * to the source — no extra graph node, no allocation beyond the wrapper object.
 *
 * **Dispose semantics:** calling `dispose()` on the wrapper is a no-op — it does
 * not affect the underlying source signal. The caller retains ownership of the
 * source and is responsible for disposing it independently.
 *
 * Exception: if `source` is already a `ComputedSignal`, `readonly()` returns it
 * directly (no wrapper), so `dispose()` will dispose the computed as expected.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine — tracks dep on count
 * // readCount.value = 1; // TypeScript error — ComputedSignal has no setter
 * ```
 */
export const readonly = <T>(source: ReadonlySignal<T>): ComputedSignal<T> => {
  if (isComputed(source)) return source as ComputedSignal<T>;

  const noop = (): void => {};

  return {
    dispose: noop,
    filter: (pred: (value: T) => boolean) => source.filter(pred as (value: T) => boolean),
    [IS_COMPUTED]: true as const,
    [IS_SIGNAL]: true as const,
    map: <U>(fn: (v: T) => U, opts?: ReactiveOptions<U>) => source.map(fn, opts),
    peek: () => source.peek(),
    subscribe: (l: () => void) => source.subscribe(l),
    [Symbol.dispose]: noop,
    get value() {
      return source.value;
    },
  } as unknown as ComputedSignal<T>;
};

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
