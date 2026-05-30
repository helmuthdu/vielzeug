import type { ComputedSignal, ReadonlySignal, ReactiveOptions } from './types';

import { computed } from './computed';
import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './symbols';
import { withTracking } from './tracking';

// ── Tracking utilities ────────────────────────────────────────────────────────

/**
 * Runs `fn` without recording any reactive reads as dependencies of the enclosing
 * effect or computed. Useful when you need to read reactive state "silently".
 *
 * @example
 * ```ts
 * effect(() => {
 *   const a = count.value;              // tracked
 *   const b = untrack(() => name.value); // NOT tracked — no re-run when name changes
 * });
 * ```
 */
export const untrack = <T>(fn: () => T): T => withTracking(null, fn);

// ── Readonly wrapper (R2) ─────────────────────────────────────────────────────
//
// Returns a thin delegation object instead of a full ComputedImpl — zero graph
// overhead. No disposal needed. All reads delegate to the source, registering
// the caller as a dep on the source directly rather than on an intermediary node.

/**
 * Wraps a signal or computed to produce a structurally read-only view.
 * The `value` setter and `update`/`dispose` are hidden. Delegates reads directly
 * to the source — no extra graph node, no allocation beyond the wrapper object.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine — tracks dep on count
 * // readCount.value = 1; // TypeScript error — ComputedSignal has no setter
 * ```
 */
export const readonly = <T>(source: ReadonlySignal<T>): ComputedSignal<T> =>
  ({
    dispose: () => {},
    filter: (pred: (value: T) => boolean) =>
      computed(() => {
        const v = source.value;

        return pred(v) ? v : undefined;
      }),
    [IS_COMPUTED]: true as const,
    [IS_SIGNAL]: true as const,
    map: <U>(fn: (v: T) => U, opts?: ReactiveOptions<U>) => computed(() => fn(source.value), opts),
    peek: () => source.peek(),
    subscribe: (l: () => void) => source.subscribe(l),
    [Symbol.dispose]: () => {},
    get value() {
      return source.value;
    },
  }) as unknown as ComputedSignal<T>;

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
