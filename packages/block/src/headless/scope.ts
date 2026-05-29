// ── Lifecycle → AbortSignal bridge ──────────────────────────────────────────

/**
 * Converts a framework cleanup hook to a standard `AbortSignal`.
 *
 * Call inside a craft `setup()` function and pass the returned signal to any
 * headless primitive that accepts `signal?: AbortSignal`. The signal is aborted
 * automatically when the framework triggers the registered `onCleanup` callback.
 *
 * @example
 * ```ts
 * define('bit-checkbox', {
 *   setup(props, { el, bind }) {
 *     const signal = toAbortSignal(onCleanup);
 *     const checkable = createCheckable({ signal, host: el, ... });
 *   },
 * });
 * ```
 */
export const toAbortSignal = (onCleanup: (fn: () => void) => void): AbortSignal => {
  const controller = new AbortController();

  onCleanup(() => controller.abort());

  return controller.signal;
};
