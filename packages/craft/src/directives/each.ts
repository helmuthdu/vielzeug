import {
  batch,
  computed,
  effect as rawEffect,
  type ReadonlySignal,
  signal,
  type Signal,
  untrack,
} from '@vielzeug/ripple';

import { CRAFTIT_ERRORS } from '../errors';
import { createDirectiveResult, type DirectiveResult, type HTMLResult } from '../types/bindings';
import { removeNodes, runAll } from '../utils/dom';

// ─── Types ────────────────────────────────────────────────────────────────────

type MaybeReactiveArray<T> = ReadonlySignal<T[]> | (() => T[]) | T[];

type ItemEntry<T> = {
  cleanups: (() => void)[];
  data: Signal<T>;
  index: Signal<number>;
  /** The key used to identify this entry. */
  key: string;
  nodes: Node[];
};

// ─── Item lifecycle ───────────────────────────────────────────────────────────

const createItem = <T>(
  item: T,
  index: number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => HTMLResult,
  parent: ParentNode,
  insertBefore: Node,
): ItemEntry<T> => {
  const dataSignal: Signal<T> = signal(item);
  const indexSignal: Signal<number> = signal(index);

  const result = render(dataSignal, indexSignal);
  const nodes = Array.from(result.fragment.childNodes);

  parent.insertBefore(result.fragment, insertBefore);

  const cleanups: (() => void)[] = [];

  result.apply((fn) => cleanups.push(fn));

  return { cleanups, data: dataSignal, index: indexSignal, key: '', nodes };
};

const removeItem = <T>(entry: ItemEntry<T>): void => {
  runAll(entry.cleanups);
  removeNodes(entry.nodes);
};

// ─── Reconciler ───────────────────────────────────────────────────────────────

/**
 * Reconciles the live item map (mutated in-place) against the next array.
 * Stale entries are removed and destroyed; new entries are created and inserted.
 * Existing entries are updated in-place via signal writes.
 * Returns the ordered list of entries matching nextList.
 */
const reconcileItems = <T>(
  itemsMap: Map<string, ItemEntry<T>>,
  next: T[],
  keyFn: (item: T, index: number) => string | number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => HTMLResult,
  parent: ParentNode,
  endMarker: Node,
): ItemEntry<T>[] => {
  const nextKeys: string[] = next.map((item, i) => String(keyFn(item, i)));
  const nextKeySet = new Set(nextKeys);

  // Detect duplicate keys
  const seen = new Set<string>();

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];

    if (seen.has(key)) throw new Error(CRAFTIT_ERRORS.eachDuplicateKey(key, i));

    seen.add(key);
  }

  // Remove stale entries from the map
  for (const [key, entry] of itemsMap) {
    if (!nextKeySet.has(key)) {
      removeItem(entry);
      itemsMap.delete(key);
    }
  }

  // Build the next ordered list: update existing items, create new ones
  const nextOrdered: ItemEntry<T>[] = [];

  for (let i = 0; i < next.length; i++) {
    const key = nextKeys[i];
    const existing = itemsMap.get(key);

    if (existing) {
      batch(() => {
        existing.data.value = next[i];
        existing.index.value = i;
      });
      nextOrdered.push(existing);
    } else {
      const entry = untrack(() => createItem(next[i], i, render, parent, endMarker));

      entry.key = key;
      itemsMap.set(key, entry);
      nextOrdered.push(entry);
    }
  }

  // DOM ordering: right-to-left pass — move any item not already adjacent to cursor.
  // O(n) DOM operations in the worst case; optimal for the typical small list sizes
  // encountered in UI components (tabs, options, menu items).
  let cursor: Node = endMarker;

  for (let j = nextOrdered.length - 1; j >= 0; j--) {
    const entry = nextOrdered[j];
    const firstNode = entry.nodes[0];

    if (firstNode && firstNode !== cursor.previousSibling) {
      for (const node of entry.nodes) parent.insertBefore(node, cursor);
    }

    cursor = firstNode ?? cursor;
  }

  return nextOrdered;
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders a keyed list of items as a `DirectiveResult`.
 *
 * Each item is rendered by the provided render function.
 * Items are reused by key when the list changes; only stale items are destroyed.
 *
 * @example
 * ```ts
 * html`${each(items, (item) => item.id, (item) => html`<li>${item}</li>`)}`
 * ```
 */
export function each<T>(
  list: MaybeReactiveArray<T>,
  keyFn: (item: T, index: number) => string | number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => HTMLResult,
  fallback?: () => HTMLResult,
): DirectiveResult {
  const listSignal = Array.isArray(list)
    ? ({
        get value() {
          return list as T[];
        },
      } as ReadonlySignal<T[]>)
    : typeof list === 'function'
      ? computed(list as () => T[])
      : list;

  return createDirectiveResult((anchor, registerCleanup) => {
    const parent = anchor.parentNode!;
    const endMarker = document.createComment('each/end');

    parent.insertBefore(endMarker, anchor.nextSibling);

    let itemsMap = new Map<string, ItemEntry<T>>();
    let itemsOrdered: ItemEntry<T>[] = [];
    let fallbackNodes: Node[] | null = null;
    let fallbackCleanups: (() => void)[] = [];

    const mountFallback = (): void => {
      if (!fallback) return;

      const result = fallback();
      const nodes = Array.from(result.fragment.childNodes);

      parent.insertBefore(result.fragment, endMarker);
      result.apply((fn) => fallbackCleanups.push(fn));
      fallbackNodes = nodes;
    };

    const clearFallback = (): void => {
      if (fallbackNodes) {
        runAll(fallbackCleanups);
        removeNodes(fallbackNodes);
        fallbackNodes = null;
        fallbackCleanups = [];
      }
    };

    const sub = rawEffect(() => {
      const nextList = listSignal.value ?? [];

      if (nextList.length === 0) {
        for (const entry of untrack(() => itemsOrdered)) removeItem(entry);
        itemsMap = new Map();
        itemsOrdered = [];

        if (!fallbackNodes) untrack(mountFallback);

        return;
      }

      clearFallback();

      itemsOrdered = untrack(() => reconcileItems(itemsMap, nextList, keyFn, render, parent, endMarker));
    });

    registerCleanup(() => sub.dispose());
    registerCleanup(() => {
      clearFallback();
      for (const entry of itemsOrdered) removeItem(entry);
      endMarker.remove();
    });
  });
}
