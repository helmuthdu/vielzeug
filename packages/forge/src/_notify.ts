import type { Unsubscribe } from './types.js';

export interface Notifier<T> {
  add(listener: (value: T) => void): Unsubscribe;
  call(listener: () => void): void;
  clear(): void;
  notify(value: T): void;
}

function rethrowAsync(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

export function createNotifier<T>(onError?: (error: unknown) => void): Notifier<T> {
  const listeners = new Set<(value: T) => void>();
  const pending: T[] = [];
  let notifying = false;

  function reportError(error: unknown): void {
    if (!onError) {
      rethrowAsync(error);
      return;
    }

    try {
      onError(error);
    } catch (reporterError) {
      rethrowAsync(reporterError);
    }
  }

  const call = (listener: () => void): void => {
    try {
      listener();
    } catch (error) {
      reportError(error);
    }
  };

  return {
    add(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    call,
    clear() {
      listeners.clear();
      pending.length = 0;
    },
    notify(value) {
      pending.push(value);
      if (notifying) return;

      notifying = true;
      try {
        while (pending.length > 0) {
          const next = pending.shift()!;
          for (const listener of [...listeners]) {
            if (listeners.has(listener)) call(() => listener(next));
          }
        }
      } finally {
        notifying = false;
      }
    },
  };
}
