import { type ReadonlySignal, type Signal, signal, untrack, watch } from '@vielzeug/ripple';

/**
 * Creates a locally-writable signal that stays in sync with an external
 * `ReadonlySignal` source. The optional `transform` function coerces the input type.
 *
 * Returns a tuple of `[signal, stop]`. Call `stop()` to detach the watcher when
 * the signal is no longer needed.
 *
 * Use when a component needs to both reflect an externally-controlled value AND
 * allow internal mutations — e.g. a checkbox that can be toggled locally but also
 * reset by a parent's prop.
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
  const local = signal<TOut>(transform(untrack(() => source.value)));
  const sub = watch(source, (next) => {
    local.value = transform(next);
  });

  return [local, () => sub.dispose()];
};
