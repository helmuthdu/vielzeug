/**
 * Create a child `AbortController` that aborts as soon as `parent` does.
 * Handles the case where `parent` is already aborted at call time — a plain
 * `addEventListener('abort', ...)` would miss that, since the event already fired.
 *
 * @internal
 */
export function deriveAbortController(parent: AbortSignal): AbortController {
  const ctrl = new AbortController();

  if (parent.aborted) {
    ctrl.abort(parent.reason);
  } else {
    parent.addEventListener('abort', () => ctrl.abort(parent.reason), { once: true });
  }

  return ctrl;
}

/**
 * Sleep for `ms` milliseconds, aborting early when the signal fires.
 * Resolves (does not reject) on abort — callers check `signal.aborted`.
 *
 * @internal
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();

      return;
    }

    const id = setTimeout(resolve, ms);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Full-jitter exponential backoff in ms, capped at `maxMs`.
 * `attempt` is zero-based.
 *
 * @internal
 */
export function defaultReconnectDelay(attempt: number, maxMs = 30_000): number {
  const base = Math.min(1000 * 2 ** attempt, maxMs);

  return Math.random() * base;
}
