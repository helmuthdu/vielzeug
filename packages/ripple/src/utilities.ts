import type { Computed, Readable, Signal } from './types';

import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './symbols';
import { untrack } from './tracking';

export { untrack };

// ── Readonly wrapper ──────────────────────────────────────────────────────────
//
// readonly() returns Readable<T> — no dispose() because the wrapper does not
// own the source. Callers retain ownership and must dispose the source themselves.
// The [IS_SIGNAL] brand is set so isReactive(readonly(s)) and isSignal(readonly(s))
// both return true (it is reactive, not IS_COMPUTED, not IS_STORE).
// [IS_COMPUTED] is intentionally NOT set — the wrapper is not a Computed<T>
// and does not have dispose().

/**
 * Wraps a reactive value to produce a structurally read-only view.
 * The `value` setter is hidden. Delegates reads directly to the source —
 * no extra reactive graph node, no extra subscription.
 *
 * The caller retains ownership of the source and is responsible for disposing it.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine — tracks dep on count
 * // readCount.value = 1; // TypeScript error — Readable has no setter
 * ```
 */
export const readonly = <T>(source: Readable<T>): Readable<T> => {
  const wrapper = {
    get disposed(): boolean {
      return source.disposed;
    },
    [IS_SIGNAL]: true as const,
    get name(): string | undefined {
      return source.name;
    },
    peek(): T {
      return source.peek();
    },
    subscribe(listener: () => void) {
      return source.subscribe(listener);
    },
    get value(): T {
      return source.value;
    },
  };

  return wrapper as unknown as Readable<T>;
};

// ── Type guards ───────────────────────────────────────────────────────────────

/**
 * Returns `true` for any reactive value that implements `Readable<T>` — including
 * `signal()`, `computed()`, `store()`, and `readonly()` wrappers.
 *
 * This is the broad "is this value reactive?" check. Use `isSignal` for writable-only
 * signals, or `isComputed` to narrow to computed values.
 *
 * @example
 * ```ts
 * isReactive(signal(0))            // true
 * isReactive(computed(() => 1))    // true
 * isReactive(store({ x: 0 }))     // true
 * isReactive(readonly(signal(0)))  // true
 * isReactive({})                   // false
 * ```
 */
export const isReactive = <T = unknown>(value: unknown): value is Readable<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

/**
 * Returns `true` only for writable `Signal<T>` values — excludes `computed()` and `store()`.
 * `readonly()` wrappers of a signal still report `true` since they carry the same
 * `IS_SIGNAL` brand as their source (they are not `IS_COMPUTED`/`IS_STORE`).
 *
 * Use `isReactive` for the broad "is this reactive?" check.
 *
 * @example
 * ```ts
 * isSignal(signal(0))            // true
 * isSignal(computed(() => 1))    // false — computed excluded
 * isSignal(store({ x: 0 }))     // false — store excluded
 * isSignal(readonly(signal(0)))  // true — readonly has IS_SIGNAL, not IS_COMPUTED/IS_STORE
 * isSignal({})                   // false
 * ```
 */
export const isSignal = <T = unknown>(value: unknown): value is Signal<T> =>
  isReactive(value) &&
  !(value as unknown as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED] &&
  !(value as unknown as Record<typeof IS_STORE, unknown>)[IS_STORE];

export const isComputed = <T = unknown>(value: unknown): value is Computed<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
