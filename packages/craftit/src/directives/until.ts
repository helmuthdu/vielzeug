import { signal, type ReadonlySignal } from '@vielzeug/stateit';

import type { HTMLResult } from '../internal';

type UntilRenderable = string | HTMLResult;

/**
 * Renders a placeholder until a promise resolves, optionally rendering an error
 * state when it rejects.
 *
 * @param promise   The async work to await.
 * @param placeholder Content shown while pending (default: empty string).
 * @param onError   Optional callback called with the rejection reason; its
 *                  return value replaces the placeholder on failure.
 *                  When omitted the placeholder is kept on rejection.
 */
export const until = <T extends UntilRenderable>(
  promise: Promise<T>,
  placeholder: UntilRenderable = '',
  onError?: (err: unknown) => UntilRenderable,
): ReadonlySignal<UntilRenderable> => {
  const value = signal<UntilRenderable>(placeholder);

  promise
    .then((resolved) => {
      value.value = resolved;
    })
    .catch((err: unknown) => {
      value.value = onError ? onError(err) : placeholder;
    });

  return value;
};
