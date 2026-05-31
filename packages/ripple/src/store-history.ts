import type { StoreWithHistory } from './types';

import { store } from './store';

/**
 * Creates a reactive store with snapshot history for undo/redo / time-travel.
 *
 * History is stored as a circular buffer of `maxHistory` snapshots (default: 50).
 * Every mutation via `patch()`, `replace()`, or `lens()` pushes a new snapshot.
 * `undo()` / `redo()` jump through the history without re-running any logic.
 *
 * Snapshots are **shallow copies** — the same structural-sharing constraint as
 * the base store applies. Use `store.replace()` with immutable patterns to keep
 * history entries clean.
 *
 * @example
 * ```ts
 * const s = storeWithHistory({ count: 0 }, { maxHistory: 10 });
 *
 * s.patch({ count: 1 });
 * s.patch({ count: 2 });
 * s.undo();  // back to { count: 1 }
 * s.redo();  // forward to { count: 2 }
 * s.historyAt(0); // { count: 0 }
 * ```
 */
export const storeWithHistory = <T extends object>(
  initial: T,
  options?: { maxHistory?: number; name?: string },
): StoreWithHistory<T> => {
  const maxHistory = options?.maxHistory ?? 50;
  const snapshots: Readonly<T>[] = [Object.freeze(structuredClone({ ...initial }))];
  let cursor = 0; // index into snapshots[] pointing at current state
  let pauseHistory = false;

  const base = store(initial, options);

  // Push a new snapshot after every mutation, truncating redo history.
  const pushSnapshot = (state: Readonly<T>): void => {
    if (pauseHistory) return;

    // Truncate any redo states ahead of cursor
    snapshots.splice(cursor + 1);
    // Spread through the proxy to get a plain object before cloning.
    // store.peek() returns a read-only Proxy; structuredClone fails on raw Proxies
    // in some environments (jsdom). Spreading copies enumerable own properties.
    snapshots.push(Object.freeze(structuredClone({ ...state })) as Readonly<T>);

    // Trim to maxHistory
    if (snapshots.length > maxHistory) {
      snapshots.splice(0, snapshots.length - maxHistory);
    }

    cursor = snapshots.length - 1;
  };

  // Intercept patch/replace/reset to record history
  const originalPatch = base.patch.bind(base);
  const originalReplace = base.replace.bind(base);
  const originalReset = base.reset.bind(base);

  const patch = (partial: Partial<T>): void => {
    originalPatch(partial);
    pushSnapshot(base.peek());
  };

  const replace = (fn: (state: Readonly<T>) => T): void => {
    originalReplace(fn);
    pushSnapshot(base.peek());
  };

  const reset = (): void => {
    originalReset();
    pushSnapshot(base.peek());
  };

  const undo = (): void => {
    if (cursor <= 0) return;

    cursor--;
    pauseHistory = true;

    try {
      originalReplace(() => snapshots[cursor] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const redo = (): void => {
    if (cursor >= snapshots.length - 1) return;

    cursor++;
    pauseHistory = true;

    try {
      originalReplace(() => snapshots[cursor] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const historyAt = (index: number): Readonly<T> | undefined => {
    if (index < 0 || index >= snapshots.length) return undefined;

    return snapshots[index];
  };

  // Use defineProperties so the historyLength getter is preserved as a live accessor.
  // Object.assign would evaluate the getter once at call time and freeze the value.
  Object.defineProperties(base, {
    historyAt: { configurable: true, enumerable: true, value: historyAt, writable: true },
    historyLength: {
      configurable: true,
      enumerable: true,
      get: () => snapshots.length,
    },
    patch: { configurable: true, enumerable: true, value: patch, writable: true },
    redo: { configurable: true, enumerable: true, value: redo, writable: true },
    replace: { configurable: true, enumerable: true, value: replace, writable: true },
    reset: { configurable: true, enumerable: true, value: reset, writable: true },
    undo: { configurable: true, enumerable: true, value: undo, writable: true },
  });

  return base as unknown as StoreWithHistory<T>;
};
