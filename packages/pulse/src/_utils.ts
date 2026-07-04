/**
 * Returns a signal that aborts as soon as any of the provided signals abort.
 * With a single argument, returns it directly (no allocation).
 * Cleanup listeners are registered to prevent leaks.
 *
 * @internal
 */
export function combineSignals(first: AbortSignal, ...rest: AbortSignal[]): AbortSignal {
  if (rest.length === 0) return first;

  return rest.reduce(mergeTwo, first);
}

function mergeTwo(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;

  if (b.aborted) return b;

  const ctrl = new AbortController();
  const onA = (): void => ctrl.abort(a.reason);
  const onB = (): void => ctrl.abort(b.reason);

  a.addEventListener('abort', onA, { once: true });
  b.addEventListener('abort', onB, { once: true });
  ctrl.signal.addEventListener(
    'abort',
    () => {
      a.removeEventListener('abort', onA);
      b.removeEventListener('abort', onB);
    },
    { once: true },
  );

  return ctrl.signal;
}

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
  const base = Math.min(1000 * Math.pow(2, attempt), maxMs);

  return Math.random() * base;
}
