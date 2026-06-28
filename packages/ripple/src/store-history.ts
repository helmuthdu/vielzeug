import type { HistoryEntry, Store, StoreWithHistory } from './types';

import { signal } from './signal';
import { store } from './store';
import { isStore } from './utilities';

const snapshot = <T extends object>(state: Readonly<T>, label?: string): HistoryEntry<T> => ({
  label,
  state: Object.freeze(structuredClone({ ...state })) as Readonly<T>,
});

/**
 * Wraps a store (or creates one from an initial value) with explicit snapshot history
 * for undo/redo / time-travel.
 *
 * **Ownership:** if called with an initial value, the adapter creates and owns
 * the underlying store — `dispose()` will also dispose it. If called with an
 * existing `Store<T>`, the adapter does NOT own it — `dispose()` leaves the
 * store alive.
 *
 * History is **explicit** — call `push()` or `pushNamed()` after mutations you want
 * to be undoable. This gives you full control over snapshot granularity: you can
 * batch multiple mutations before pushing, or avoid pushing for programmatic
 * operations like server sync or reset-and-reload.
 *
 * This is a pure external adapter — it does not access any store internals.
 *
 * @example
 * ```ts
 * const h = storeWithHistory({ count: 0 }, { maxHistory: 10 });
 *
 * h.patch({ count: 1 });
 * h.push();          // save checkpoint
 * h.patch({ count: 2 });
 * h.pushNamed('increment');
 *
 * h.undo();          // back to { count: 1 }
 * h.redo();          // forward to { count: 2 }
 * h.historyAt(0);    // { label: undefined, state: { count: 0 } }
 * h.canUndo;         // true
 *
 * // Wrap an existing store:
 * const existingStore = store({ x: 0 });
 * const h2 = storeWithHistory(existingStore);
 * h2.dispose(); // existingStore is NOT disposed
 * ```
 */
export const storeWithHistory = <T extends object>(
  storeOrInitial: Store<T> | T,
  options?: { maxHistory?: number; name?: string },
): StoreWithHistory<T> => {
  const maxHistory = options?.maxHistory ?? 50;
  const ownsStore = !isStore(storeOrInitial);
  const base: Store<T> = ownsStore ? store(storeOrInitial as T, { name: options?.name }) : (storeOrInitial as Store<T>);

  const snapshots: HistoryEntry<T>[] = [snapshot(base.peek())];

  // cursor is a reactive signal so canUndo/canRedo participate in the reactive graph.
  const cursor = signal(0, { name: options?.name ? `${options.name}.cursor` : undefined });

  let disposed = false;

  const pushSnapshot = (label?: string): void => {
    if (disposed) return;

    snapshots.splice(cursor.peek() + 1);
    snapshots.push(snapshot(base.peek(), label));

    if (snapshots.length > maxHistory) {
      snapshots.splice(0, snapshots.length - maxHistory);
    }

    cursor.value = snapshots.length - 1;
  };

  const undo = (): void => {
    if (disposed || cursor.peek() <= 0) return;

    cursor.value = cursor.peek() - 1;
    base.replace(() => snapshots[cursor.peek()]!.state as T);
  };

  const redo = (): void => {
    if (disposed || cursor.peek() >= snapshots.length - 1) return;

    cursor.value = cursor.peek() + 1;
    base.replace(() => snapshots[cursor.peek()]!.state as T);
  };

  const historyAt = (index: number): HistoryEntry<T> | undefined => {
    if (index < 0 || index >= snapshots.length) return undefined;

    return snapshots[index];
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    cursor.dispose();

    if (ownsStore) base.dispose();
  };

  // Explicit delegation: all Store<T> methods are forwarded directly to base.
  // History-specific properties are defined inline.
  const adapter: StoreWithHistory<T> = {
    get canRedo() {
      return cursor.value < snapshots.length - 1;
    },
    // History-specific
    get canUndo() {
      return cursor.value > 0;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    historyAt,
    get historyLength() {
      return snapshots.length;
    },
    lens: <P extends string>(path: P) => base.lens(path),
    // Store<T> delegation
    get name() {
      return base.name;
    },
    patch: (partial) => base.patch(partial),
    peek: () => base.peek(),
    push: () => pushSnapshot(),
    pushNamed: (label: string) => pushSnapshot(label),
    redo,
    replace: (fn) => base.replace(fn),
    reset: () => base.reset(),
    get store() {
      return base;
    },
    subscribe: (listener) => base.subscribe(listener),
    [Symbol.dispose]: dispose,
    undo,
    get value() {
      return base.value;
    },
  };

  return adapter;
};
