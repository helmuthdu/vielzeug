/** A single attempt with no retries — use as the default `attempts` value. */
export const NO_RETRY = 1;

export type RetryOptions = {
  /** Total attempts. `1` means no retries. Defaults to `1`. */
  attempts?: number;
  /**
   * Delay between retry attempts in ms, or a zero-based function where
   * `attempt` is the number of failures so far (0 = waiting before the 2nd try).
   * Defaults to full-jitter exponential backoff: a random delay in
   * `[0, min(1 s × 2ⁿ, 30 s)]` where `n` is the zero-based attempt index.
   */
  retryDelay?: number | ((attempt: number) => number);
  /**
   * Return `false` to skip retrying for a specific error (e.g. 4xx HTTP errors).
   * `attempt` is 0-based (0 = deciding whether to retry after the 1st failure).
   */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

const DEFAULT_MAX_DELAY = 30_000;

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

function normalizeDelay(delayMs: number): number {
  return Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
}

function getDefaultRetryDelay(attempt: number): number {
  const cap = Math.min(1000 * Math.pow(2, attempt), DEFAULT_MAX_DELAY);

  return Math.random() * cap;
}

function getRetryDelay(attempt: number, userDelay?: number | ((attempt: number) => number)): number {
  if (typeof userDelay === 'function') {
    return normalizeDelay(userDelay(attempt));
  }

  if (typeof userDelay === 'number') {
    return normalizeDelay(userDelay);
  }

  return getDefaultRetryDelay(attempt);
}

export async function sleepWithAbort(delayMs: number, signal?: AbortSignal): Promise<void> {
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

  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) throw toError(signal.reason ?? new DOMException('Aborted', 'AbortError'));

    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1 || (shouldRetry && !shouldRetry(err, i))) throw err;

      const delay = getRetryDelay(i, userDelay);

      await sleepWithAbort(delay, signal);
    }
  }

  // TypeScript control flow: unreachable since maxAttempts >= 1.
  throw new Error('[fetchit] runWithRetry: unexpected exit');
}
