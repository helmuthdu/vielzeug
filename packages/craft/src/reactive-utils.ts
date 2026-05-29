import { type ReadonlySignal, type Signal, computed, signal, untrack, watch } from '@vielzeug/ripple';

/**
 * Creates a memoized derived value. `fn` is re-evaluated only when the array returned by
 * `deps` changes (each element compared with `Object.is`). Signals read inside `fn` do
 * **not** invalidate the memo — only changes to `deps` trigger re-evaluation.
 *
 * Use inside templates or expensive computations to skip re-rendering when only unrelated
 * reactive state changes:
 *
 * @example
 * ```ts
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

/**
 * Creates a locally-writable signal that stays in sync with an external
 * `ReadonlySignal` source. The optional `transform` function coerces the input type.
 *
 * Returns a tuple of `[signal, stop]`. Call `stop()` to detach the watcher when
 * the signal is no longer needed.
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
