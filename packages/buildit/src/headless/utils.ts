import { effect } from '@vielzeug/stateit';

// ── ARIA synchronisation utility ──────────────────────────────────────────────

/**
 * Drives a reactive effect that keeps a set of ARIA attributes in sync with
 * the current signal values. The effect re-runs whenever any getter reads a
 * signal whose value has changed.
 *
 * When `signal` is provided the effect is torn down automatically when the
 * signal's controller calls `abort()`. Without a signal call the returned
 * `stop` function for manual teardown.
 *
 * @param host     The element to update attributes on.
 * @param ariaMap  A record of `aria-*` attribute names → getter functions.
 *                 Return `null` or `undefined` to remove the attribute.
 * @param signal   Optional `AbortSignal`; when aborted, the effect is stopped.
 * @returns        A `stop` function that tears down the effect manually.
 *
 * @example
 * withAriaSync(host, {
 *   'aria-checked': () => checked.value ? 'true' : 'false',
 *   'aria-disabled': () => disabled.value ? 'true' : undefined,
 * }, signal);
 */
export const withAriaSync = (
  host: Element,
  ariaMap: Record<`aria-${string}`, () => string | null | undefined>,
  signal?: AbortSignal,
): (() => void) => {
  const entries = Object.entries(ariaMap) as [string, () => string | null | undefined][];

  const stop = effect(() => {
    for (const [attr, getter] of entries) {
      const value = getter();

      if (value != null) {
        host.setAttribute(attr, value);
      } else {
        host.removeAttribute(attr);
      }
    }
  });

  signal?.addEventListener('abort', stop, { once: true });

  return stop;
};
