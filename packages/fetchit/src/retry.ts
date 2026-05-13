export const DEFAULT_ATTEMPTS = 1;

export type RetryOptions = {
  /** Total attempts. `1` means no retries. Defaults to `1`. */
  attempts?: number;
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

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs));

    return;
  }

  if (signal.aborted) {
    throw toError(signal.reason ?? new DOMException('Aborted', 'AbortError'));
  }

  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(id);
      signal.removeEventListener('abort', onAbort);
      reject(toError(signal.reason ?? new DOMException('Aborted', 'AbortError')));
    };

    signal.addEventListener('abort', onAbort);
  });
}

/** Run fn up to attempts times, respecting shouldRetry and exponential backoff. Throws on final failure or if aborted. */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  attempts: number,
  userDelay: number | ((attempt: number) => number) | undefined,
  shouldRetry: ((error: unknown, attempt: number) => boolean) | undefined,
  signal?: AbortSignal,
): Promise<T> {
  const maxAttempts = Math.max(1, attempts);
  let lastError: unknown;

  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) throw toError(signal.reason ?? new DOMException('Aborted', 'AbortError'));

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (i === maxAttempts - 1) throw err;

      if (shouldRetry && !shouldRetry(err, i)) throw err;

      const delay = typeof userDelay === 'function' ? userDelay(i) : (userDelay ?? 1000 * Math.pow(2, i));

      await sleepWithAbort(Math.min(delay, 30_000), signal);
    }
  }

  throw lastError;
}
