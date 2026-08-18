import type { Unsubscribe } from './types';

export interface Notifier {
  add(listener: () => void): Unsubscribe;
  clear(): void;
  notify(): void;
}

function rethrowAsync(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

export function createNotifier(onError?: (error: unknown) => void): Notifier {
  const listeners = new Set<() => void>();

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

  return {
    add(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    clear() {
      listeners.clear();
    },
    notify() {
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch (error) {
          reportError(error);
        }
      }
    },
  };
}
