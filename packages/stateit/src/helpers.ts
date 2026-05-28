import type { Subscription } from './types';

/** Sentinel used by `batch()` to distinguish "no error thrown" from `throw undefined`. */
export const _NONE: unique symbol = Symbol('stateit.none');

export const IS_SIGNAL: unique symbol = Symbol('stateit.is-signal');
export const IS_COMPUTED: unique symbol = Symbol('stateit.is-computed');
export const IS_STORE: unique symbol = Symbol('stateit.is-store');
export const UNINITIALIZED: unique symbol = Symbol('stateit.uninitialized');

export const toSubscription = (dispose: () => void): Subscription =>
  Object.assign(dispose, { dispose, [Symbol.dispose]: dispose }) as Subscription;

export const ensureError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

export const collectErrors = (items: Iterable<() => void>): unknown[] => {
  const errors: unknown[] = [];

  for (const fn of items) {
    try {
      fn();
    } catch (e) {
      errors.push(e);
    }
  }

  return errors;
};

export const runAll = (items: Iterable<() => void>, context: string): void => {
  const errors = collectErrors(items);

  if (errors.length === 1) throw errors[0];

  if (errors.length > 1) throw new AggregateError(errors, `[stateit] ${context}`);
};

export const rethrowWith = (error: unknown, cleanupErrors: unknown[], context: string): never => {
  const rootCause = ensureError(error);

  if (cleanupErrors.length === 0) throw rootCause;

  throw new AggregateError([rootCause, ...cleanupErrors.map(ensureError)], `[stateit] ${context}`, {
    cause: rootCause,
  });
};
