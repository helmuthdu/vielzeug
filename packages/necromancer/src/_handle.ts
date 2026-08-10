import type { AnimationGroup, AnimationHandle, AnimationResult } from './types';

function createResultPromise(animation: Animation, onSettled: () => void, reduced: boolean): Promise<AnimationResult> {
  return animation.finished.then(
    () => {
      onSettled();

      return { status: reduced ? 'reduced' : 'finished' };
    },
    (reason: unknown) => {
      onSettled();

      return { reason, status: 'cancelled' };
    },
  );
}

/** Wraps a native Animation with Necromancer's lifecycle contract. */
export function createAnimationHandle(animation: Animation, signal?: AbortSignal, reduced = false): AnimationHandle {
  let disposed = false;
  let disposeReason: unknown;
  let hasDisposeReason = false;
  let removeAbortListener: (() => void) | undefined;

  const result: Promise<AnimationResult> = createResultPromise(
    animation,
    () => {
      removeAbortListener?.();
      removeAbortListener = undefined;
    },
    reduced,
  ).then((outcome): AnimationResult => {
    if (disposed && hasDisposeReason && outcome.status === 'cancelled') {
      return { reason: disposeReason, status: 'cancelled' };
    }

    return outcome;
  });

  const dispose = (reason?: unknown): void => {
    if (disposed) return;

    disposed = true;
    disposeReason = reason;
    hasDisposeReason = reason !== undefined;
    removeAbortListener?.();
    removeAbortListener = undefined;
    animation.cancel();
  };

  if (signal) {
    const abort = () => dispose(signal.reason);

    signal.addEventListener('abort', abort, { once: true });
    removeAbortListener = () => signal.removeEventListener('abort', abort);
  }

  return {
    animation,
    dispose,
    get disposed() {
      return disposed;
    },
    result,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}

/** Combines child animation handles under one disposal owner. */
export function createAnimationGroup(handles: readonly AnimationHandle[], signal?: AbortSignal): AnimationGroup {
  let disposed = false;
  let removeAbortListener: (() => void) | undefined;

  const results: Promise<readonly AnimationResult[]> = Promise.all(handles.map((handle) => handle.result)).then(
    (childResults): readonly AnimationResult[] => {
      removeAbortListener?.();
      removeAbortListener = undefined;

      return childResults;
    },
  );

  const dispose = (reason?: unknown): void => {
    if (disposed) return;

    disposed = true;
    removeAbortListener?.();
    removeAbortListener = undefined;
    for (const handle of handles) handle.dispose(reason);
  };

  if (signal) {
    const abort = () => dispose(signal.reason);

    signal.addEventListener('abort', abort, { once: true });
    removeAbortListener = () => signal.removeEventListener('abort', abort);
  }

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    handles,
    results,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
