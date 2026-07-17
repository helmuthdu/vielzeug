import type { SourceCore } from './core';

export type AsyncSearchCoordinator = Readonly<{
  cancel(): void;
  dispose(): void;
  schedule(run: () => void, delayMs: number): Promise<void>;
  settleIfIdle(pendingCount: number): void;
}>;

/**
 * Shared debounced-search promise orchestration for async sources.
 * Keeps search() promise lifecycles consistent across remote/cursor/infinite sources.
 */
export function createAsyncSearchCoordinator(core: SourceCore, notify: () => void): AsyncSearchCoordinator {
  let pendingResolve: (() => void) | null = null;

  const resolvePending = () => {
    if (pendingResolve) {
      pendingResolve();
      pendingResolve = null;
    }
  };

  return {
    cancel() {
      core.cancelTimer();
      resolvePending();
    },

    dispose() {
      resolvePending();
    },

    schedule(run, delayMs) {
      resolvePending();

      const promise = new Promise<void>((resolve) => {
        pendingResolve = resolve;
      });

      core.schedule(run, delayMs);
      notify();

      return promise;
    },

    settleIfIdle(pendingCount) {
      if (pendingCount === 0) resolvePending();
    },
  };
}
