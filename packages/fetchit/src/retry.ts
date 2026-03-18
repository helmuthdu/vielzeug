export const DEFAULT_RETRY = 1;

export type RetryOptions = {
  retry?: number | false;
  /**
   * Delay between retry attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to exponential backoff: 1 s → 2 s → … capped at 30 s.
   */
  retryDelay?: number | ((attempt: number) => number);
  /**
   * Return `false` to skip retrying for a specific error (e.g. 4xx HTTP errors).
   * `attempt` is 0-based (0 = deciding whether to retry after the 1st failure).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export function getRetryConfig(
  retryCount: number | false,
  userDelay: number | ((attempt: number) => number) | undefined,
  shouldRetry?: (error: unknown, attempt: number) => boolean,
) {
  // retry:false = "no retries" = exactly 1 total attempt (times: 1 in toolkit terms)
  // retry:n     = "n retries"  = n+1 total attempts
  const times = retryCount === false ? 1 : retryCount + 1;
  const base = { shouldRetry, times };

  if (typeof userDelay === 'function') return { ...base, retryDelay: userDelay };

  if (typeof userDelay === 'number') return { ...base, delay: userDelay };

  // Default: exponential backoff 1 s → 2 s → … capped at 30 s
  return { ...base, backoff: (_a: number, cur: number) => Math.min(cur * 2, 30_000), delay: 1000 };
}
