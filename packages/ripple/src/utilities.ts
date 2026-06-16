import type { ComputedOptions, ComputedSignal, ReadonlySignal } from './types';

import { computed } from './computed';
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
 * The `value` setter is hidden. Delegates reads directly to the source —
 * no extra graph node, no allocation beyond the wrapper object.
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
    get disposed() {
      return (source as unknown as { disposed?: boolean }).disposed ?? false;
    },
    [IS_COMPUTED]: true as const,
    [IS_SIGNAL]: true as const,
    get name() {
      return source.name;
    },
    peek: () => source.peek(),
    subscribe: (l: () => void) => source.subscribe(l),
    [Symbol.dispose]: noop,
    get value() {
      return source.value;
    },
  } as unknown as ComputedSignal<T>;
};

// ── selector() ────────────────────────────────────────────────────────────────
//
// Replaces per-instance .map() / .filter() methods, which polluted the reactive
// interfaces and caused name clashes with Array.prototype methods in mixed code.
// A standalone function keeps the public interface minimal and explicit.

/**
 * Creates a computed signal derived from a reactive source using a projection
 * and/or a filter predicate. Combines the old `map()` and `filter()` methods
 * into a single, general-purpose standalone utility.
 *
 * - `selector(source, project)` — like `source.map(project)`
 * - `selector(source, project, predicate)` — project then filter; returns `U | undefined`
 * - `selector(source, undefined, predicate)` — filter only; returns `T | undefined`
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const doubled = selector(count, (n) => n * 2);
 * const evenDoubled = selector(count, (n) => n * 2, (n) => n % 2 === 0);
 * const onlyEven = selector(count, undefined, (n) => n % 2 === 0);
 * ```
 */
export function selector<T, U>(
  source: ReadonlySignal<T>,
  project: (value: T) => U,
  options?: ComputedOptions<U>,
): ComputedSignal<U>;
export function selector<T, U>(
  source: ReadonlySignal<T>,
  project: (value: T) => U,
  predicate: (value: U) => boolean,
  options?: ComputedOptions<U | undefined>,
): ComputedSignal<U | undefined>;
export function selector<T>(
  source: ReadonlySignal<T>,
  project: undefined,
  predicate: (value: T) => boolean,
  options?: ComputedOptions<T | undefined>,
): ComputedSignal<T | undefined>;
export function selector<T, U = T>(
  source: ReadonlySignal<T>,
  project?: (value: T) => U,
  predicateOrOptions?: ((value: U) => boolean) | ComputedOptions<U>,
  options?: ComputedOptions<U | undefined>,
): ComputedSignal<U | U | undefined> {
  if (typeof predicateOrOptions === 'function') {
    const predicate = predicateOrOptions;
    const opts = options;

    if (project) {
      return computed(
        () => {
          const projected = project(source.value);

          return predicate(projected) ? projected : undefined;
        },
        opts as ComputedOptions<U | undefined>,
      );
    }

    return computed(
      () => {
        const v = source.value as unknown as U;

        return predicate(v) ? v : undefined;
      },
      opts as ComputedOptions<U | undefined>,
    );
  }

  if (project) {
    return computed(() => project(source.value), predicateOrOptions as ComputedOptions<U> | undefined);
  }

  return computed(() => source.value as unknown as U, predicateOrOptions as ComputedOptions<U> | undefined);
}

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
