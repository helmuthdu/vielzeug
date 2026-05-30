import { DEFAULT_ESTIMATE_SIZE, DEFAULT_OVERSCAN, type MeasurementCache, type Overscan } from './utils';
import {
  createVirtualizer,
  type ScrollToIndexOptions,
  type VirtualItem,
  type Virtualizer,
  type VirtualizerState,
  type VirtualKey,
} from './virtualizer';

export type { MeasurementCache, Overscan, ScrollToIndexOptions, VirtualItem, VirtualizerState, VirtualKey };

// ─── Types ────────────────────────────────────────────────────────────────────

/** A `VirtualItem` enriched with the corresponding data record. */
export type VirtualRenderItem<T> = VirtualItem & { readonly data: T };

/**
 * Recycle a DOM node by key. If the pool has a live node for `key`, it is
 * returned and reused; otherwise `create()` is called to produce a new one.
 *
 * Honest return type — callers that need a narrower element type cast explicitly
 * (e.g. `recycle('k', () => document.createElement('button')) as HTMLButtonElement`).
 */
export type RecycleFn = (key: VirtualKey, create: () => HTMLElement) => HTMLElement;

export type DomVirtualListRenderArgs<T> = {
  items: Array<VirtualRenderItem<T>>;
  listEl: HTMLElement;
  recycle: RecycleFn;
  /** Sticky items from the underlying virtualizer, enriched with data. */
  stickyItems: Array<VirtualRenderItem<T>>;
  totalSize: number;
};

export type DomVirtualListOptions<T> = {
  /** Custom teardown that clears listEl. Defaults to `listEl.textContent = ''`. */
  clear?: (listEl: HTMLElement) => void;
  estimateSize?: number | ((index: number, item: T) => number);
  gap?: number;
  getItemKey?: (index: number, item: T) => VirtualKey;
  horizontal?: boolean;
  listElement: HTMLElement;
  /** External measurement cache for scroll restoration. */
  measurementCache?: MeasurementCache;
  overscan?: Overscan;
  render: (args: DomVirtualListRenderArgs<T>) => void;
  scrollElement: HTMLElement | Window;
};

export type DomVirtualListController<T> = {
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  /** Attach a ResizeObserver to `el` and auto-measure `index` on resize. Returns disconnect fn. */
  measureEl: (index: number, el: HTMLElement) => () => void;
  /** Re-compute the visible range without clearing measurements. */
  refresh: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  setItems: (items: T[]) => void;
};

// ─── Node pool ────────────────────────────────────────────────────────────────

function createNodePool() {
  let live = new Map<VirtualKey, HTMLElement>();
  let nextLive = new Map<VirtualKey, HTMLElement>();
  const stale: HTMLElement[] = [];
  let inCycle = false;

  return {
    acquire(key: VirtualKey, create: () => HTMLElement): HTMLElement {
      if (!inCycle) return create();

      const existing = live.get(key);

      if (existing) {
        nextLive.set(key, existing);

        return existing;
      }

      const node = stale.pop() ?? create();

      nextLive.set(key, node);

      return node;
    },

    beginCycle(): void {
      nextLive = new Map();
      inCycle = true;
    },

    clear(): void {
      for (const node of live.values()) node.remove();

      live.clear();
      nextLive.clear();
      stale.length = 0;
      inCycle = false;
    },

    endCycle(): void {
      if (!inCycle) return;

      inCycle = false;

      for (const [key, node] of live) {
        if (!nextLive.has(key)) {
          node.remove();
          stale.push(node);
        }
      }

      live = nextLive;
    },
  };
}

// ─── Implementation ────────────────────────────────────────────────────────────

export function createDomVirtualList<T>(options: DomVirtualListOptions<T>): DomVirtualListController<T> {
  let currentItems: T[] = [];
  let isDestroyed = false;
  const listEl = options.listElement;

  // Pool must be declared before virtualizer since handleChange (passed as onChange)
  // is invoked during createVirtualizer initialization via computeVisible.
  const pool = createNodePool();

  // Virtualizer is lazily created on the first non-empty setItems call.
  let virtualizer: Virtualizer | null = null;

  function resolveKey(index: number): VirtualKey {
    const item = currentItems[index];

    if (item !== undefined && options.getItemKey) return options.getItemKey(index, item);

    return index; // index as fallback — no itemKeyRevision (R3)
  }

  function resolveEstimate(index: number): number {
    if (options.estimateSize === undefined) return DEFAULT_ESTIMATE_SIZE;

    if (typeof options.estimateSize === 'number') return options.estimateSize;

    const item = currentItems[index];

    return item !== undefined ? options.estimateSize(index, item) : DEFAULT_ESTIMATE_SIZE;
  }

  function applyListSize(totalSize: number): void {
    if (options.horizontal) {
      listEl.style.height = '';
      listEl.style.width = `${totalSize}px`;
    } else {
      listEl.style.height = `${totalSize}px`;
      listEl.style.width = '';
    }
  }

  function toRenderItem(vi: VirtualItem): VirtualRenderItem<T> {
    return { ...vi, data: currentItems[vi.index] as T };
  }

  function handleChange(state: VirtualizerState): void {
    applyListSize(state.totalSize);

    pool.beginCycle();

    options.render({
      items: state.items.map(toRenderItem),
      listEl,
      recycle: (key, create) => pool.acquire(key, create),
      stickyItems: state.stickyItems.map(toRenderItem),
      totalSize: state.totalSize,
    });

    pool.endCycle();
  }

  function clearAndReset(): void {
    pool.clear();

    if (options.clear) {
      options.clear(listEl);
    } else {
      listEl.textContent = '';
    }

    listEl.style.height = '';
    listEl.style.width = '';
    listEl.style.position = '';
    listEl.style.contain = '';
  }

  function spawnVirtualizer(): void {
    virtualizer = createVirtualizer(options.scrollElement, {
      count: currentItems.length,
      estimateSize: resolveEstimate,
      gap: options.gap,
      getItemKey: resolveKey,
      horizontal: options.horizontal,
      measurementCache: options.measurementCache,
      onChange: handleChange,
      overscan: options.overscan ?? { end: DEFAULT_OVERSCAN, start: DEFAULT_OVERSCAN },
    });

    listEl.style.position = 'relative';
    listEl.style.contain = 'layout';
  }

  return {
    destroy() {
      if (isDestroyed) return;

      isDestroyed = true;
      virtualizer?.destroy();
      virtualizer = null;
      clearAndReset();
    },

    invalidate() {
      if (isDestroyed) return;

      virtualizer?.invalidate();
    },

    measure(index, size) {
      if (isDestroyed) return;

      virtualizer?.measure(index, size);
    },

    measureBatch(entries) {
      if (isDestroyed) return;

      virtualizer?.measureBatch(entries);
    },

    measureEl(index, el) {
      if (isDestroyed) return () => {};

      return virtualizer?.measureEl(index, el) ?? (() => {});
    },

    refresh() {
      if (isDestroyed) return;

      virtualizer?.refresh();
    },

    scrollToIndex(index, scrollOptions) {
      if (isDestroyed) return;

      virtualizer?.scrollToIndex(index, scrollOptions);
    },

    setItems(items) {
      if (isDestroyed) return;

      currentItems = items;

      if (items.length === 0) {
        virtualizer?.destroy();
        virtualizer = null;
        clearAndReset();

        return;
      }

      if (!virtualizer) {
        spawnVirtualizer();

        return;
      }

      // Only count needs explicit update — estimateSize and getItemKey are
      // closures that already reflect the latest currentItems automatically.
      virtualizer.update({ count: items.length });

      if (options.getItemKey) {
        virtualizer.refresh(); // stable keys: preserve measurements
      } else {
        virtualizer.invalidate(); // no stable keys: reset measurements
      }
    },
  };
}
