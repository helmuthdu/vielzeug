import { type ReadonlySignal, signal, type Signal, untrack, watch } from '@vielzeug/ripple';

// ── syncedSignal ──────────────────────────────────────────────────────────────

/**
 * Creates a local writable `Signal<T>` that stays in sync with an external
 * `ReadonlySignal<T>`. The watcher subscription is disposed when `signal` aborts.
 *
 * Initialised synchronously via `untrack` so the first render never reads a
 * stale value. The optional `transform` coerces each incoming value (e.g.
 * `Boolean`, `String`).
 *
 * @example
 * ```ts
 * const value = syncedSignal(options.value, options.signal, (v) => String(v ?? ''));
 * ```
 */
export const syncedSignal = <TIn, TOut = TIn>(
  source: ReadonlySignal<TIn>,
  abortSignal: AbortSignal,
  transform: (value: TIn) => TOut = (v) => v as unknown as TOut,
): Signal<TOut> => {
  const local = signal<TOut>(untrack(() => transform(source.value)));
  const sub = watch(source, (v) => {
    local.value = transform(v);
  });

  abortSignal.addEventListener('abort', () => sub.dispose(), { once: true });

  return local;
};
