import type { Disposable } from './types';

// ─── Disposable ──────────────────────────────────────────────────────────────

/**
 * Create a `Disposable` backed by an `AbortController`.
 * `dispose()` is idempotent — the signal aborts and `cleanup` runs at most once.
 * Pass the returned `disposalSignal` to `addEventListener` calls so removal happens
 * automatically on dispose, instead of pairing manual `removeEventListener` calls.
 */
export function createDisposable(cleanup?: () => void): Disposable {
  let disposed = false;
  const abortController = new AbortController();

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    abortController.abort();
    cleanup?.();
  };

  return {
    get disposalSignal() {
      return abortController.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    [Symbol.dispose]: dispose,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDisabled(disabled: boolean | undefined): boolean {
  return disabled === true;
}
