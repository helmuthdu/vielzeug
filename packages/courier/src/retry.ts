import { backoff } from '@vielzeug/arsenal';

/** A single attempt with no retries — use as the default `attempts` value. */
export const NO_RETRY = 1;

export type RetryOptions = {
  /**
   * Delay between retry attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to full-jitter exponential backoff: a random delay in
   * `[0, min(1 s × 2ⁿ, 30 s)]` where `n` is the zero-based attempt index.
   */
  delay?: number | ((attempt: number) => number);
  /**
   * Return `false` to skip retrying for a specific error (e.g. 4xx HTTP errors).
   * `attempt` is 0-based (0 = deciding whether to retry after the 1st failure).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Total number of attempts including the first. `1` means a single try with no retries. Defaults to `1`. */
  times?: number;
};

function getDefaultRetryDelay(attempt: number): number {
  return Math.random() * backoff(attempt);
}

/** Compute the inter-attempt delay from a courier RetryOptions configuration. */
export function resolveRetryDelay(attempt: number, userDelay?: number | ((attempt: number) => number)): number {
  if (typeof userDelay === 'function') {
    const ms = userDelay(attempt);

    return Number.isFinite(ms) ? Math.max(0, ms) : 0;
  }

  if (typeof userDelay === 'number') {
    return Number.isFinite(userDelay) ? Math.max(0, userDelay) : 0;
  }

  return getDefaultRetryDelay(attempt);
}
