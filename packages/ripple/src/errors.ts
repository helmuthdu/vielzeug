import type { CleanupFn } from './types';

import { StateError } from './error';

// ── Error utilities ───────────────────────────────────────────────────────────

export const ensureError = (error: unknown): Error =>
  error instanceof Error ? error : new StateError('INVALID_CLEANUP', String(error));

/**
 * Runs each fn in `fns`, collecting any thrown errors. Does NOT re-throw.
 * Callers use the returned array to aggregate and rethrow with context.
 */
export const collectErrors = (fns: Iterable<CleanupFn>): Error[] => {
  const errors: Error[] = [];

  for (const fn of fns) {
    try {
      fn();
    } catch (e) {
      errors.push(ensureError(e));
    }
  }

  return errors;
};

/**
 * Runs all `fns`, collecting errors.
 * - Single error: re-throws the original error directly (preserves type + stack).
 * - Multiple errors: wraps in AggregateError with the given context label.
 */
export const runAll = (fns: Iterable<CleanupFn>, context: string): void => {
  const errors = collectErrors(fns);

  if (errors.length === 1) throw errors[0]!;

  if (errors.length > 0) {
    throw new AggregateError(errors, `[ripple] ${context}`);
  }
};

/**
 * Re-throws `primary`, augmented with any extra errors as an AggregateError.
 * If `extras` is empty, throws `primary` directly (preserves original type + stack).
 * Otherwise, `primary` is set as the `.cause` so callers can identify the root failure.
 */
export const rethrowWith = (primary: unknown, extras: Error[], context: string): never => {
  if (extras.length === 0) throw primary;

  throw new AggregateError([ensureError(primary), ...extras], `[ripple] ${context}`, {
    cause: ensureError(primary),
  });
};
