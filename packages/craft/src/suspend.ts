import { effect, signal, untrack, type ReadonlySignal } from '@vielzeug/ripple';

import { onCleanup } from './runtime';
import { htmlResult, type HTMLResult } from './types/bindings';

export type SuspendOptions<T> = {
  /**
   * Template to render when the async function rejects.
   */
  error?: (err: unknown) => HTMLResult | string;
  /**
   * Template to render while the async function is pending.
   */
  fallback?: () => HTMLResult | string;
  /**
   * Render the resolved value as an HTMLResult.
   */
  render: (value: T) => HTMLResult | string;
};

const toHtmlResult = (v: HTMLResult | string): HTMLResult => (typeof v === 'string' ? htmlResult(v) : v);

/**
 * Run an async function and return a `ReadonlySignal<HTMLResult>` that transitions
 * through pending → settled states. Re-runs automatically when reactive dependencies
 * accessed inside `asyncFn` change.
 *
 * Use inside component setup functions. The signal starts as the `fallback` template
 * and updates to the rendered result when the promise resolves.
 *
 * @example
 * ```ts
 * define('my-profile', {
 *   setup(props) {
 *     const profile = suspend(
 *       () => fetchUser(props.userId.value),
 *       {
 *         fallback: () => html`<p>Loading…</p>`,
 *         error: (e) => html`<p>Error: ${String(e)}</p>`,
 *         render: (user) => html`<p>${user.name}</p>`,
 *       },
 *     );
 *     return html`<div>${profile}</div>`;
 *   }
 * });
 * ```
 */
export function suspend<T>(asyncFn: () => Promise<T>, options: SuspendOptions<T>): ReadonlySignal<HTMLResult> {
  const { error: onError, fallback, render } = options;
  const result = signal<HTMLResult>(fallback ? toHtmlResult(fallback()) : htmlResult(''));

  const stop = effect(() => {
    // Reading asyncFn() inside the effect body tracks its reactive dependencies.
    // When those deps change, the effect re-runs: we reset to fallback, start a new
    // fetch, and apply a cancelled guard to discard stale responses.
    let cancelled = false;

    if (fallback) result.value = untrack(() => toHtmlResult(fallback!()));

    asyncFn().then(
      (value) => {
        if (!cancelled) result.value = toHtmlResult(render(value));
      },
      (err) => {
        if (!cancelled) {
          if (onError) {
            result.value = toHtmlResult(onError(err));
          } else {
            console.error('[craft] suspend() rejected:', err);
          }
        }
      },
    );

    return () => {
      cancelled = true;
    };
  });

  onCleanup(stop);

  return result;
}
