import type { Store, StoreWithHistory } from './types';

import { signal } from './signal';
import { store } from './store';

const snapshot = <T extends object>(state: Readonly<T>): Readonly<T> =>
  Object.freeze(structuredClone({ ...state })) as Readonly<T>;

/**
 * Wraps an existing store (or creates one) with snapshot history for undo/redo / time-travel.
 *
 * History is recorded by subscribing to the store's change notifications.
 * Every mutation triggers a new snapshot, truncating any redo history ahead of the cursor.
 * History is stored as a circular buffer of `maxHistory` snapshots (default: 50).
 *
 * This is a pure external adapter — it does not access any store internals.
 *
 * @example
 * ```ts
 * const s = storeWithHistory({ count: 0 }, { maxHistory: 10 });
 *
 * s.store.patch({ count: 1 });
 * s.store.patch({ count: 2 });
 * s.undo();  // back to { count: 1 }
 * s.redo();  // forward to { count: 2 }
 * s.historyAt(0); // { count: 0 }
 * s.canUndo; // true
 * ```
 */
export const storeWithHistory = <T extends object>(
  initial: T,
  options?: { maxHistory?: number; name?: string },
): StoreWithHistory<T> => {
  const maxHistory = options?.maxHistory ?? 50;
  const base: Store<T> = store(initial, { name: options?.name });

  const snapshots: Readonly<T>[] = [snapshot(base.peek())];

  // cursor is a reactive signal so canUndo/canRedo participate in the reactive graph.
  const cursor = signal(0, { name: options?.name ? `${options.name}.cursor` : undefined });

  let pauseHistory = false;
  let disposed = false;

  const pushSnapshot = (): void => {
    if (pauseHistory || disposed) return;

    snapshots.splice(cursor.peek() + 1);
    snapshots.push(snapshot(base.peek()));

    if (snapshots.length > maxHistory) {
      snapshots.splice(0, snapshots.length - maxHistory);
    }

    cursor.value = snapshots.length - 1;
  };

  // Subscribe to the store — every change triggers a snapshot.
  const sub = base.subscribe(pushSnapshot);

  const undo = (): void => {
    if (cursor.peek() <= 0) return;

    cursor.value = cursor.peek() - 1;
    pauseHistory = true;

    try {
      base.replace(() => snapshots[cursor.peek()] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const redo = (): void => {
    if (cursor.peek() >= snapshots.length - 1) return;

    cursor.value = cursor.peek() + 1;
    pauseHistory = true;

    try {
      base.replace(() => snapshots[cursor.peek()] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const historyAt = (index: number): Readonly<T> | undefined => {
    if (index < 0 || index >= snapshots.length) return undefined;

    return snapshots[index];
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    sub.dispose();
    cursor.dispose();
    base.dispose();
  };

  return {
    get canRedo() {
      return cursor.value < snapshots.length - 1;
    },
    get canUndo() {
      return cursor.value > 0;
    },
    dispose,
    historyAt,
    get historyLength() {
      return snapshots.length;
    },
    redo,
    get store() {
      return base;
    },
    [Symbol.dispose]: dispose,
    undo,
  } as unknown as StoreWithHistory<T>;
};
