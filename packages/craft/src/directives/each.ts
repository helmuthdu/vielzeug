import {
  batch,
  computed,
  effect as rawEffect,
  signal,
  untrack,
  type ReadonlySignal,
  type Signal,
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

// ─── LIS (Longest Increasing Subsequence) ────────────────────────────────────
// Used to identify the stable subset of existing items that don't need DOM movement.
// O(n log n) patience-sort implementation with predecessor backtracking.

const computeLISIndices = (arr: number[]): Set<number> => {
  const n = arr.length;

  if (n === 0) return new Set();

  const tails: number[] = []; // smallest tail value of any IS of length i+1
  const piles: number[] = []; // arr-index that produced tails[i]
  const parent: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const v = arr[i];
    let lo = 0;
    let hi = tails.length;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (tails[mid] < v) lo = mid + 1;
      else hi = mid;
    }

    tails[lo] = v;
    piles[lo] = i;

    if (lo > 0) parent[i] = piles[lo - 1];
  }

  // Backtrack to collect LIS element indices (indices into arr, not arr values)
  const result = new Set<number>();
  let idx = piles[tails.length - 1];

  while (idx !== -1) {
    result.add(idx);
    idx = parent[idx];
  }

  return result;
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

const reconcileItems = <T>(
  prevOrdered: ItemEntry<T>[],
  prevMap: Map<string, ItemEntry<T>>,
  next: T[],
  keyFn: (item: T, index: number) => string | number,
  render: (item: ReadonlySignal<T>, index: ReadonlySignal<number>) => HTMLResult,
  parent: ParentNode,
  endMarker: Node,
): { map: Map<string, ItemEntry<T>>; ordered: ItemEntry<T>[] } => {
  const nextKeys: string[] = next.map((item, i) => String(keyFn(item, i)));
  const nextKeySet = new Set(nextKeys);

  // Detect duplicate keys
  const seen = new Set<string>();

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];

    if (seen.has(key)) throw new Error(CRAFTIT_ERRORS.eachDuplicateKey(key, i));

    seen.add(key);
  }

  // Build previous-order map: key → index in prevOrdered
  const prevOrder = new Map<string, number>();

  for (let i = 0; i < prevOrdered.length; i++) prevOrder.set(prevOrdered[i].key, i);

  // Remove stale entries
  for (const [key, entry] of prevMap) {
    if (!nextKeySet.has(key)) {
      removeItem(entry);
      prevMap.delete(key);
    }
  }

  // Build the next ordered list: update existing items, create new ones
  const nextOrdered: ItemEntry<T>[] = [];

  for (let i = 0; i < next.length; i++) {
    const key = nextKeys[i];
    const existing = prevMap.get(key);

    if (existing) {
      batch(() => {
        existing.data.value = next[i];
        existing.index.value = i;
      });
      nextOrdered.push(existing);
    } else {
      const entry = untrack(() => createItem(next[i], i, render, parent, endMarker));

      entry.key = key;
      prevMap.set(key, entry);
      nextOrdered.push(entry);
    }
  }

  // LIS-based DOM ordering: only move items not in the longest stable subsequence.
  //
  // For each position j in nextOrdered that reuses an existing item, record that
  // item's old position (index in prevOrdered). Items whose old-positions form a
  // strictly increasing sequence are already in the right relative order and need
  // not be moved. We only move items outside this stable set.

  const reusedOldPositions: number[] = []; // old-order positions (in new-list traversal order)
  const reusedNewIndices: number[] = []; // their positions in nextOrdered

  for (let j = 0; j < nextOrdered.length; j++) {
    const oldPos = prevOrder.get(nextOrdered[j].key);

    if (oldPos !== undefined) {
      reusedOldPositions.push(oldPos);
      reusedNewIndices.push(j);
    }
  }

  // lisSet contains indices into reusedOldPositions/reusedNewIndices for stable items
  const lisSet = computeLISIndices(reusedOldPositions);
  const stayPut = new Set<number>(Array.from(lisSet).map((i) => reusedNewIndices[i]));

  // Process items right-to-left. cursor points to the reference node that the
  // current item should be inserted before. Items in stayPut update the cursor
  // without moving; items not in stayPut are moved before the cursor.
  let cursor: Node = endMarker;

  for (let j = nextOrdered.length - 1; j >= 0; j--) {
    const entry = nextOrdered[j];

    if (stayPut.has(j)) {
      // Item is stable — just update cursor to its first node
      cursor = entry.nodes[0] ?? cursor;
    } else {
      // Move all of this item's nodes before cursor
      for (const node of entry.nodes) parent.insertBefore(node, cursor);

      cursor = entry.nodes[0] ?? cursor;
    }
  }

  return { map: prevMap, ordered: nextOrdered };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders a keyed list of items as a `DirectiveResult`.
 *
 * Each item is rendered by the provided render function.
 * Items are reused by key when the list changes; only stale items are destroyed.
 * DOM reordering uses an LIS-based algorithm to minimise moves (F2).
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

      const result = untrack(() => reconcileItems(itemsOrdered, itemsMap, nextList, keyFn, render, parent, endMarker));

      itemsMap = result.map;
      itemsOrdered = result.ordered;
    });

    registerCleanup(() => sub.dispose());
    registerCleanup(() => {
      clearFallback();
      for (const entry of itemsOrdered) removeItem(entry);
      endMarker.remove();
    });
  });
}
