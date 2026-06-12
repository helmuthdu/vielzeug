import type { StoreWithHistory } from './types';

import { SignalImpl } from './signal';
import { StoreImpl } from './store';

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
  // cursor_ is a reactive signal so that canUndo/canRedo participate in the reactive graph.
  // Reading h.canUndo inside an effect() will re-run when cursor changes.
  const cursor_ = new SignalImpl(0, undefined, options?.name ? `${options.name}.cursor` : undefined);
  let pauseHistory = false;

  // Push a new snapshot after every mutation, truncating redo history.
  const pushSnapshot = (state: Readonly<T>): void => {
    if (pauseHistory) return;

    // Truncate any redo states ahead of cursor
    snapshots.splice(cursor_.peek() + 1);
    // Spread through the proxy to get a plain object before cloning.
    // store.peek() returns a read-only Proxy; structuredClone fails on raw Proxies
    // in some environments (jsdom). Spreading copies enumerable own properties.
    snapshots.push(Object.freeze(structuredClone({ ...state })) as Readonly<T>);

    // Trim to maxHistory
    if (snapshots.length > maxHistory) {
      snapshots.splice(0, snapshots.length - maxHistory);
    }

    cursor_.value = snapshots.length - 1;
  };

  // Use the onMutation constructor callback to observe each top-level key change without
  // monkey-patching applyTopLevelChange_. patch/replace/reset already batch
  // all key changes internally, so we guard with `highLevelMutating` to push
  // only one snapshot per high-level operation rather than one per key.
  let highLevelMutating = false;

  const onMutation = (): void => {
    if (!highLevelMutating && !pauseHistory) {
      pushSnapshot(baseImpl.peek());
    }
  };

  const baseImpl = new StoreImpl(initial, options?.name, onMutation) as StoreImpl<T> & {
    patch: (partial: Partial<T>) => void;
    replace: (fn: (state: Readonly<T>) => T) => void;
    reset: () => void;
  };
  const base = baseImpl as unknown as StoreWithHistory<T>;

  const originalPatch = baseImpl.patch.bind(baseImpl);
  const originalReplace = baseImpl.replace.bind(baseImpl);
  const originalReset = baseImpl.reset.bind(baseImpl);

  const patch = (partial: Partial<T>): void => {
    highLevelMutating = true;

    try {
      originalPatch(partial);
    } finally {
      highLevelMutating = false;
    }

    pushSnapshot(baseImpl.peek());
  };

  const replace = (fn: (state: Readonly<T>) => T): void => {
    highLevelMutating = true;

    try {
      originalReplace(fn);
    } finally {
      highLevelMutating = false;
    }

    pushSnapshot(baseImpl.peek());
  };

  const reset = (): void => {
    highLevelMutating = true;

    try {
      originalReset();
    } finally {
      highLevelMutating = false;
    }

    pushSnapshot(baseImpl.peek());
  };

  const undo = (): void => {
    if (cursor_.peek() <= 0) return;

    cursor_.value = cursor_.peek() - 1;
    pauseHistory = true;

    try {
      originalReplace(() => snapshots[cursor_.peek()] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const redo = (): void => {
    if (cursor_.peek() >= snapshots.length - 1) return;

    cursor_.value = cursor_.peek() + 1;
    pauseHistory = true;

    try {
      originalReplace(() => snapshots[cursor_.peek()] as T);
    } finally {
      pauseHistory = false;
    }
  };

  const historyAt = (index: number): Readonly<T> | undefined => {
    if (index < 0 || index >= snapshots.length) return undefined;

    return snapshots[index];
  };

  const dispose = (): void => {
    cursor_.dispose();
  };

  // Use defineProperties so live getters (historyLength, canUndo, canRedo) are preserved
  // as accessors. Object.assign would evaluate them once at call time and freeze the value.
  Object.defineProperties(baseImpl, {
    canRedo: {
      configurable: true,
      enumerable: true,
      get: () => cursor_.value < snapshots.length - 1,
    },
    canUndo: {
      configurable: true,
      enumerable: true,
      get: () => cursor_.value > 0,
    },
    dispose: { configurable: true, enumerable: true, value: dispose, writable: true },
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
