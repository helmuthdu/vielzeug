import type { ComputedSignal, ReactiveOptions, ReadonlySignal, Signal } from './types';

import { computed } from './computed';
import { IS_COMPUTED, IS_SIGNAL, IS_STORE } from './helpers';
import { signal } from './signal';
import { withTracking } from './tracking';
import { watch } from './watch';

// ── Tracking utilities ────────────────────────────────────────────────────────

/**
 * Runs `fn` without recording any reactive reads as dependencies of the enclosing
 * effect or computed. Useful when you need to read reactive state "silently".
 *
 * @example
 * ```ts
 * effect(() => {
 *   const a = count.value;           // tracked
 *   const b = untrack(() => name.value); // NOT tracked — no re-run when name changes
 * });
 * ```
 */
export const untrack = <T>(fn: () => T): T => withTracking(null, fn);

// ── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves after the current microtask queue drains.
 * Useful in tests and async coordination to let pending `effectAsync` runs settle.
 *
 * @example
 * ```ts
 * count.value = 10;
 * await tick();
 * // effectAsync handlers that depend on count have now started
 * ```
 */
export const tick = (): Promise<void> => Promise.resolve();

// ── Readonly wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps a signal (or computed) to produce a {@link ReadonlySignal} — a view that
 * forwards reads and subscriptions but hides the `value` setter.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * const readCount = readonly(count);
 * readCount.value; // fine
 * // readCount.value = 1; // TypeScript error
 * ```
 */
export const readonly = <T>(source: ReadonlySignal<T>): ReadonlySignal<T> =>
  Object.assign(
    {
      derive: <U>(fn: (v: T) => U, options?: ReactiveOptions<U>): ComputedSignal<U> => source.derive(fn, options),
      peek: () => source.peek(),
      subscribe: (listener: () => void) => source.subscribe(listener),
      get value() {
        return source.value;
      },
    },
    { [IS_SIGNAL]: true },
  ) as ReadonlySignal<T>;

// ── Type guards ───────────────────────────────────────────────────────────────

export const isSignal = <T = unknown>(value: unknown): value is ReadonlySignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_SIGNAL, unknown>)[IS_SIGNAL];

export const isComputed = <T = unknown>(value: unknown): value is ComputedSignal<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_COMPUTED, unknown>)[IS_COMPUTED];

export const isStore = <T extends object = object>(value: unknown): value is import('./types').Store<T> =>
  typeof value === 'object' && value !== null && !!(value as Record<typeof IS_STORE, unknown>)[IS_STORE];

// ── Memo ─────────────────────────────────────────────────────────────────────

/**
 * Creates a memoized derived value. `fn` is re-evaluated only when the array returned by
 * `deps` changes (each element compared with `Object.is`). Signals read inside `fn` do
 * **not** invalidate the memo — only changes to `deps` trigger re-evaluation.
 *
 * Use inside templates or expensive computations where you want to skip re-rendering when
 * a specific subset of reactive state changes:
 *
 * @example
 * ```ts
 * // Inside a craftit template — skips re-rendering when only unrelated signals change:
 * html`<li>${memo(() => [item.id], () => html`<span>${item.name}</span>`)}</li>`
 * ```
 */
export const memo = <T>(deps: () => readonly unknown[], fn: () => T): ReadonlySignal<T> => {
  let previousDeps: readonly unknown[] = [];
  let cached: T | undefined;
  let initialized = false;

  return computed(() => {
    const currentDeps = deps();
    const changed =
      !initialized ||
      currentDeps.length !== previousDeps.length ||
      currentDeps.some((d, i) => !Object.is(d, previousDeps[i]));

    if (changed) {
      cached = untrack(fn);
      previousDeps = currentDeps;
      initialized = true;
    }

    return cached as T;
  });
};

// ── Synced signal ─────────────────────────────────────────────────────────────

/**
 * Creates a locally-writable signal that stays in sync with an external
 * `ReadonlySignal` source. The optional `transform` function coerces the
 * input type (e.g. `T | undefined` → `boolean`).
 *
 * Returns a tuple of `[signal, stop]`. Call `stop()` to detach the watcher
 * when the signal is no longer needed.
 *
 * Use when a component needs to both reflect an externally-controlled value AND
 * allow internal mutations (e.g. a checkbox that can be toggled locally but also
 * reset by a parent).
 *
 * @example
 * ```ts
 * const [checked, stopSync] = syncedSignal(props.checked, (v) => Boolean(v));
 * // on cleanup:
 * stopSync();
 * ```
 */
export const syncedSignal = <TIn, TOut = TIn>(
  source: ReadonlySignal<TIn>,
  transform: (v: TIn) => TOut = (v) => v as unknown as TOut,
): [Signal<TOut>, () => void] => {
  const local = signal(transform(source.peek()));
  const stop = watch(source, (next) => {
    local.value = transform(next);
  });

  return [local, stop];
};
