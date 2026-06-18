import type { CleanupFn } from './types';

// ── StateError ────────────────────────────────────────────────────────────────

export type StateErrorCode =
  | 'COMPUTED_CYCLE'
  | 'DISPOSED_READ'
  | 'DISPOSED_SCOPE'
  | 'INFINITE_LOOP'
  | 'INVALID_CLEANUP'
  | 'INVALID_STORE';

export const StateErrorCode = {
  COMPUTED_CYCLE: 'COMPUTED_CYCLE',
  DISPOSED_READ: 'DISPOSED_READ',
  DISPOSED_SCOPE: 'DISPOSED_SCOPE',
  INFINITE_LOOP: 'INFINITE_LOOP',
  INVALID_CLEANUP: 'INVALID_CLEANUP',
  INVALID_STORE: 'INVALID_STORE',
} as const satisfies Record<StateErrorCode, StateErrorCode>;

export class StateError extends Error {
  readonly code: StateErrorCode;

  constructor(code: StateErrorCode, message: string) {
    super(`[@vielzeug/ripple/${code}] ${message}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
  }
}

// ── Error utilities ───────────────────────────────────────────────────────────

/**
 * Coerces any thrown value to an `Error`.
 * Non-Error throws (strings, numbers, etc.) are wrapped in a plain `Error`
 * with a descriptive message — they are NOT mis-branded as `StateError`.
 */
export const ensureError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(`[ripple] Non-Error thrown: ${String(error)}`);

/**
 * Runs each fn in `fns`, collecting any thrown errors. Does NOT re-throw.
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
