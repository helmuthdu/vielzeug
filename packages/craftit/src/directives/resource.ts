import { effect as signalEffect, type Signal, signal } from '@vielzeug/stateit';

import { CRAFTIT_ERRORS } from '../errors';
import { tryRegisterCleanup } from '../runtime';

export type ResourceState<T> = {
  /** Previous successful data, available while a reload is pending. */
  data: T | undefined;
  /** Rejection reason from the most recent failed fetch, or `undefined`. */
  error: unknown;
  /** `true` while the fetcher promise is in flight. */
  pending: boolean;
};

/**
 * Reactive async resource. Re-fetches whenever the `deps` getter returns a new value.
 * Previous data is preserved during reloads so the UI can show stale-while-revalidate UX.
 * In-flight requests are cancelled via `AbortController` when deps change.
 *
 * Must be called inside component `setup()` or another Craftit runtime scope.
 *
 * @example
 * ```ts
 * const user = resource(
 *   () => props.userId.value,
 *   (id, signal) => fetch(`/api/users/${id}`, { signal }).then(r => r.json()),
 * );
 *
 * return () => html`
 *   ${when(() => user.value.pending, () => html`<p>Loading…</p>`)}
 *   ${when(() => !!user.value.error, () => html`<p>Error</p>`)}
 *   ${when(() => !!user.value.data, () => html`<p>${user.value.data?.name}</p>`)}
 * `;
 * ```
 */
export function resource<Deps, T>(deps: () => Deps, fetcher: (deps: Deps, signal: AbortSignal) => Promise<T>) {
  const state: Signal<ResourceState<T>> = signal({ data: undefined, error: undefined, pending: true });
  let previousData: T | undefined;

  // Use raw stateit effect and register cleanup explicitly.
  const dispose = signalEffect(() => {
    const currentDeps = deps();
    const controller = new AbortController();

    state.value = { data: previousData, error: undefined, pending: true };

    fetcher(currentDeps, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          previousData = data;
          state.value = { data, error: undefined, pending: false };
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          state.value = { data: previousData, error, pending: false };
        }
      });

    return () => controller.abort();
  });

  if (!tryRegisterCleanup(dispose)) throw new Error(CRAFTIT_ERRORS.lifecycleOutsideSetup);

  return state;
}
