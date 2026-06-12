// ── Craft adapter ─────────────────────────────────────────────────────────────
// Utilities that bridge Craft's component lifecycle with the headless
// primitives' `AbortSignal`-based lifecycle contract.

/**
 * Creates an `AbortSignal` tied to the component's Craft lifecycle.
 *
 * Call once at the top of a `setup()` function and pass the resulting signal
 * as the required `signal` option to any stateful headless primitive
 * (`createTextField`, `createCheckable`, `createOptionList`, etc.).
 *
 * When Craft disconnects the component, `onCleanup` fires, aborting the
 * signal and triggering cleanup in every primitive that received it.
 *
 * @example
 * ```ts
 * setup(props, { el }) {
 *   const signal = lifecycleSignal(onCleanup);
 *   const tf = createTextField({ ..., signal });
 * }
 * ```
 */
export const lifecycleSignal = (onCleanup: (fn: () => void) => void): AbortSignal => {
  const controller = new AbortController();

  onCleanup(() => controller.abort());

  return controller.signal;
};
