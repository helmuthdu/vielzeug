// Shared "abort the in-flight run before starting a new one" bookkeeping behind both
// `resource()` and `effectAsync()`. They stay separate public primitives — one is a
// derived *value* (`Computed<ResourceState<T>>`), the other a *side effect* handle
// (`AsyncSubscription`) — but both needed the identical controller-swap dance, so it's
// factored out once instead of duplicated.

/** A single "current" `AbortController`, replaced (and its predecessor aborted) on every `next()`. */
export type AbortSwap = {
  /** Aborts the current controller, if any. Idempotent — safe to call after `next()` was never called or after a prior `abort()`. */
  abort(): void;
  /** Aborts the previous controller (if any) and returns a fresh `AbortSignal` for the new run. */
  next(): AbortSignal;
};

export const createAbortSwap = (): AbortSwap => {
  let controller: AbortController | null = null;

  return {
    abort(): void {
      controller?.abort();
    },
    next(): AbortSignal {
      controller?.abort();
      controller = new AbortController();

      return controller.signal;
    },
  };
};
