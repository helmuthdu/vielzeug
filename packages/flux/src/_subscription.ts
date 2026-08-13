import type { Observer, Sink, Subscription, Teardown } from './types';

function reportUnhandledError(reason: unknown): void {
  const reportError = (globalThis as { reportError?: (value: unknown) => void }).reportError;

  if (reportError) {
    reportError(reason);

    return;
  }

  queueMicrotask(() => {
    throw reason;
  });
}

export function createSubscription<T>(
  observerOrNext: Observer<T> | ((value: T) => void),
  signal?: AbortSignal,
): { add(teardown: Teardown | undefined): void; signal: AbortSignal; sink: Sink<T>; subscription: Subscription } {
  const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;
  const controller = new AbortController();
  let closed = false;
  let teardown: Teardown | undefined;

  const unsubscribe = (): void => {
    if (closed) return;

    closed = true;
    controller.abort();
    signal?.removeEventListener('abort', unsubscribe);

    try {
      teardown?.();
    } catch (reason) {
      reportUnhandledError(reason);
    }
  };

  const sink: Sink<T> = {
    complete(): void {
      if (closed) return;

      try {
        observer.complete?.();
      } catch (reason) {
        reportUnhandledError(reason);
      }

      unsubscribe();
    },

    error(reason: unknown): void {
      if (closed) return;

      if (observer.error) {
        try {
          observer.error(reason);
        } catch (callbackError) {
          reportUnhandledError(callbackError);
        }
      } else {
        reportUnhandledError(reason);
      }

      unsubscribe();
    },

    next(value: T): void {
      if (closed) return;

      try {
        observer.next(value);
      } catch (reason) {
        unsubscribe();
        reportUnhandledError(reason);
      }
    },
  };

  const add = (nextTeardown: Teardown | undefined): void => {
    if (!nextTeardown) return;

    if (closed) {
      try {
        nextTeardown();
      } catch (reason) {
        reportUnhandledError(reason);
      }

      return;
    }

    teardown = nextTeardown;
  };

  if (signal?.aborted) {
    unsubscribe();
  } else {
    signal?.addEventListener('abort', unsubscribe, { once: true });
  }

  return {
    add,
    signal: controller.signal,
    sink,
    subscription: {
      get closed(): boolean {
        return closed;
      },
      [Symbol.dispose]: unsubscribe,
      unsubscribe,
    },
  };
}
