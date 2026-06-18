import type { ComputedOptions, ComputedSignal, ReadonlySignal } from './types';

import { computed } from './computed';
import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './symbols';
import { untrack } from './tracking';

export { untrack };

// ── derive() ─────────────────────────────────────────────────────────────────
//
// Cleaner replacement for selector(source, project). Projects a reactive source
// into a new computed signal. No filter — use filter() for that.

/**
 * Creates a computed signal by projecting a reactive source through `project`.
 * Equivalent to `computed(() => project(source.value))` with options support.
 *
 * Prefer this over `selector(source, project)` for clarity.
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const doubled = derive(count, (n) => n * 2);
 * console.log(doubled.value); // 10
 * ```
 */
export const derive = <T, U>(
  source: ReadonlySignal<T>,
  project: (value: T) => U,
  options?: ComputedOptions<U>,
): ComputedSignal<U> => computed(() => project(source.value), options);

// ── filter() ─────────────────────────────────────────────────────────────────
//
// Returns source value when predicate holds, or undefined otherwise.
// Supports type-predicate overload for narrowing (T → U | undefined).

/**
 * Creates a computed signal that returns the source value when `predicate` is `true`,
 * or `undefined` when it is `false`. Supports type-predicate narrowing.
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const evens = filter(count, (n) => n % 2 === 0);
 * console.log(evens.value); // undefined (5 is odd)
 * count.value = 8;
 * console.log(evens.value); // 8
 * ```
 */
export function filter<T, U extends T>(
  source: ReadonlySignal<T>,
  predicate: (value: T) => value is U,
  options?: ComputedOptions<U | undefined>,
): ComputedSignal<U | undefined>;
export function filter<T>(
  source: ReadonlySignal<T>,
  predicate: (value: T) => boolean,
  options?: ComputedOptions<T | undefined>,
): ComputedSignal<T | undefined>;
export function filter<T>(
  source: ReadonlySignal<T>,
  predicate: (value: T) => boolean,
  options?: ComputedOptions<T | undefined>,
): ComputedSignal<T | undefined> {
  return computed(() => {
    const v = source.value;

    return predicate(v) ? v : undefined;
  }, options);
}

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
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine — tracks dep on count
 * // readCount.value = 1; // TypeScript error — ComputedSignal has no setter
 * ```
 */
export const readonly = <T>(source: ReadonlySignal<T>): ComputedSignal<T> => {
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
 * and/or a filter predicate.
 *
 * - `selector(source, project)` — project source to a new type
 * - `selector(source, project, predicate)` — project then filter; returns `U | undefined`
 *
 * For filter-only use cases, prefer `filter(source, predicate)` directly.
 *
 * @example
 * ```ts
 * const count = signal(5);
 * const doubled = selector(count, (n) => n * 2);
 * const evenDoubled = selector(count, (n) => n * 2, (n) => n % 2 === 0);
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
export function selector<T, U = T>(
  source: ReadonlySignal<T>,
  project: (value: T) => U,
  predicateOrOptions?: ((value: U) => boolean) | ComputedOptions<U>,
  options?: ComputedOptions<U | undefined>,
): ComputedSignal<U | U | undefined> {
  if (typeof predicateOrOptions === 'function') {
    const predicate = predicateOrOptions;
    const opts = options;

    return computed(
      () => {
        const projected = project(source.value);

        return predicate(projected) ? projected : undefined;
      },
      opts as ComputedOptions<U | undefined>,
    );
  }

  return computed(() => project(source.value), predicateOrOptions as ComputedOptions<U> | undefined);
}

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];
