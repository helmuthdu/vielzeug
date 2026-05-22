// ── Headless scope ────────────────────────────────────────────────────────────
//
// A lightweight lifecycle scope that bridges a framework's cleanup hook to the
// standard `AbortSignal` API used by all headless primitives.
//
// Usage:
// ```ts
// define('bit-checkbox', {
//   setup(props, { host, onCleanup }) {
//     const { signal } = createHeadlessScope(onCleanup);
//     const checkable = createCheckable({ signal, host: host.el, ... });
//   },
// });
// ```

export type HeadlessScope = {
  /**
   * Manual cleanup trigger — aborts the signal immediately. Equivalent to what
   * happens automatically when the framework calls the registered `onCleanup`
   * function. Safe to call multiple times.
   */
  cleanup: () => void;
  /**
   * `AbortSignal` that fires when the scope is torn down. Pass to any headless
   * primitive that accepts `signal?: AbortSignal` to wire automatic cleanup.
   */
  signal: AbortSignal;
};

/**
 * Creates a lifecycle-aware scope for headless primitives.
 *
 * Pass the returned `signal` to any headless primitive that accepts
 * `signal?: AbortSignal`. The signal is aborted — and all registered
 * primitives cleaned up — when the framework lifecycle calls the registered
 * `onCleanup` function.
 *
 * @example
 * ```ts
 * const { signal } = createHeadlessScope(onCleanup);
 * const overlay   = createOverlayControl({ signal, ... });
 * const optList   = createOptionList({ signal, ... });
 * // All torn down automatically when onCleanup fires.
 * ```
 */
export const createHeadlessScope = (onCleanup: (fn: () => void) => void): HeadlessScope => {
  const controller = new AbortController();

  onCleanup(() => controller.abort());

  return {
    cleanup: () => controller.abort(),
    signal: controller.signal,
  };
};
