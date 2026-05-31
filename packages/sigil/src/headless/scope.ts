// ── Lifecycle → AbortSignal bridge ──────────────────────────────────────────

/**
 * Creates a standard `AbortSignal` tied to the component's craft lifecycle.
 *
 * Call once at the top of a craft `setup()` function and pass the returned
 * signal to any headless primitive that accepts `signal?: AbortSignal`. The
 * signal is aborted automatically when the component is torn down.
 *
 * @example
 * ```ts
 * define('bit-checkbox', {
 *   setup(props, { el, bind }) {
 *     const signal = componentSignal(onCleanup);
 *     const checkable = createCheckable({ signal, host: el, ... });
 *   },
 * });
 * ```
 */
export const componentSignal = (onCleanup: (fn: () => void) => void): AbortSignal => {
  const controller = new AbortController();

  onCleanup(() => controller.abort());

  return controller.signal;
};
