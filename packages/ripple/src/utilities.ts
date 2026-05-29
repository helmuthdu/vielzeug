import type { ComputedSignal, ReadonlySignal } from './types';

import { computed } from './computed';
import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './helpers';
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

// ── Readonly wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps a signal (or computed) to produce a {@link ComputedSignal} that is structurally
 * read-only — the `value` setter is hidden and `update`/`dispose` are not exposed.
 * Fully participates in the reactive graph and passes all type guards correctly.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine
 * // readCount.value = 1; // TypeScript error — ComputedSignal has no setter
 * ```
 */
export const readonly = <T>(source: ReadonlySignal<T>): ComputedSignal<T> => computed(() => source.value);

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
