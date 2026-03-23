import { signal } from '@vielzeug/stateit';

import type { HTMLResult } from '../core/internal';

type State = { done: false } | { done: true; value: string | HTMLResult };

/**
 * Renders `pendingFn` while a Promise is pending, then switches to the resolved
 * result. Lighter-weight alternative to `suspense()` for one-shot data loading
 * with no error/retry UI.
 *
 * Returns a reactive getter the engine tracks automatically — no manual signal
 * management needed at the call site.
 *
 * @param promise The promise to await. Should already resolve to a renderable value.
 * @param pendingFn Optional function called while the promise is pending.
 * @param onError Optional function called when the promise rejects. Receives the rejection reason.
 *
 * @example
 * import { until } from '@vielzeug/craftit/directives';
 *
 * const data = fetch('/api/user').then(r => r.json());
 *
 * html`${until(
 *   data.then(u => html`<p>Hello, ${u.name}!</p>`),
 *   () => html`<p>Loading…</p>`,
 *   (err) => html`<p>Error: ${String(err)}</p>`,
 * )}`
 */
export function until(
  promise: Promise<string | HTMLResult>,
  pendingFn?: () => string | HTMLResult,
  onError?: (err: unknown) => string | HTMLResult,
): () => string | HTMLResult {
  const state = signal<State>({ done: false });

  promise.then(
    (val) => {
      state.value = { done: true, value: val };
    },
    (err) => {
      if (onError) {
        state.value = { done: true, value: onError(err) };
      } else {
        state.value = { done: true, value: `Error: ${String(err)}` };
      }
    },
  );

  return () => (state.value.done ? state.value.value : (pendingFn?.() ?? ''));
}
