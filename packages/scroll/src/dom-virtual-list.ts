import { DEFAULT_ESTIMATE_SIZE, DEFAULT_OVERSCAN, type MeasurementCache, type Overscan } from './utils';
import {
  createVirtualizer,
  type ScrollToIndexOptions,
  type VirtualItem,
  type Virtualizer,
  type VirtualizerState,
  type VirtualKey,
} from './virtualizer';

export type {
  MeasurementCache,
  Overscan,
  ScrollToIndexOptions,
  VirtualItem,
  Virtualizer,
  VirtualizerState,
  VirtualKey,
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** A `VirtualItem` enriched with the corresponding data record. */
export type VirtualRenderItem<T> = VirtualItem & { readonly data: T };

/**
 * Recycle a DOM node by key. If the pool has a live node for `key`, it is
 * returned and reused; otherwise `create()` is called to produce a new one.
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

/**
 * R11: Controller extends Virtualizer so all methods (scrollToIndex, redraw,
 * scrollToOffset, etc.) are accessible directly on the controller without
 * needing to unwrap an inner virtualizer handle.
 *
 * `prepend` and `update` are omitted — use `setItems()` for item updates and
 * there is no direct `prepend` concept in DomVirtualList.
 */
export type DomVirtualListController<T> = Omit<Virtualizer, 'prepend' | 'update'> & {
  setItems: (items: T[]) => void;
};

export type VirtualScrollerOptions<T> = Omit<DomVirtualListOptions<T>, 'listElement' | 'scrollElement'> & {
  /** Additional CSS class names on the generated scroll container. */
  containerClass?: string;
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

    return index;
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

  /**
   * R10: Throw rather than silently produce `undefined as T`.
   * This catches bugs where `vi.index` is out of range for `currentItems`.
   */
  function toRenderItem(vi: VirtualItem): VirtualRenderItem<T> {
    const data = currentItems[vi.index];

    if (data === undefined) {
      throw new RangeError(
        `[scroll] toRenderItem: index ${vi.index} is out of range (currentItems.length=${currentItems.length})`,
      );
    }

    return { ...vi, data };
  }

  function handleChange(state: VirtualizerState): void {
    applyListSize(state.totalSize);

    pool.beginCycle();

    // R5: try/finally ensures endCycle() runs even if render() throws, keeping
    // the pool in a consistent state.
    try {
      options.render({
        items: state.items.map(toRenderItem),
        listEl,
        recycle: (key, create) => pool.acquire(key, create),
        stickyItems: state.stickyItems.map(toRenderItem),
        totalSize: state.totalSize,
      });
    } finally {
      pool.endCycle();
    }
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
      overscan: options.overscan ?? DEFAULT_OVERSCAN,
    });

    listEl.style.position = 'relative';
    listEl.style.contain = 'layout';
  }

  return {
    // ── Virtualizer passthrough (R11) ──────────────────────────────────────
    get count() {
      return virtualizer?.count ?? 0;
    },

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

    get items() {
      return virtualizer?.items ?? [];
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

    redraw() {
      if (isDestroyed) return;

      virtualizer?.redraw();
    },

    refresh() {
      if (isDestroyed) return;

      virtualizer?.refresh();
    },

    get scrollOffset() {
      return virtualizer?.scrollOffset ?? 0;
    },

    scrollToBottom(scrollOptions) {
      if (isDestroyed) return;

      virtualizer?.scrollToBottom(scrollOptions);
    },

    scrollToIndex(index, scrollOptions) {
      if (isDestroyed) return;

      virtualizer?.scrollToIndex(index, scrollOptions);
    },

    scrollToOffset(offset, scrollOptions) {
      if (isDestroyed) return;

      virtualizer?.scrollToOffset(offset, scrollOptions);
    },

    scrollToTop(scrollOptions) {
      if (isDestroyed) return;

      virtualizer?.scrollToTop(scrollOptions);
    },

    // ── DomVirtualList-specific ────────────────────────────────────────────
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

      const countChanged = items.length !== virtualizer.count;

      // Only count needs explicit update — estimateSize and getItemKey are
      // closures that already reflect the latest currentItems automatically.
      virtualizer.update({ count: items.length });

      // When count changed, update() already triggered rebuild + computeVisible().
      // Only force re-emission when count is unchanged (data changed, count same).
      if (!countChanged) {
        // R3: redraw() for stable keys (data changed, sizes preserved);
        //     invalidate() when no stable keys (measurements indexed by position
        //     are unreliable after items are replaced).
        if (options.getItemKey) {
          virtualizer.redraw();
        } else {
          virtualizer.invalidate();
        }
      } else if (!options.getItemKey) {
        // Count changed AND no stable keys: position-based measurements are now
        // stale. Clear them so the next render remeasures from fresh estimates.
        virtualizer.invalidate();
      }
    },

    get stickyItems() {
      return virtualizer?.stickyItems ?? [];
    },

    [Symbol.dispose]() {
      this.destroy();
    },

    get totalSize() {
      return virtualizer?.totalSize ?? 0;
    },
  };
}

// ─── F5: createVirtualScroller ────────────────────────────────────────────────

/**
 * High-level factory that creates the scroll container and inner list element,
 * appends them to `container`, and returns a fully wired `DomVirtualListController`.
 *
 * @example
 * ```ts
 * const list = createVirtualScroller(document.getElementById('root')!, {
 *   render({ items, listEl, recycle }) { … },
 * });
 * list.setItems(data);
 * ```
 */
export function createVirtualScroller<T>(
  container: HTMLElement,
  options: VirtualScrollerOptions<T>,
): DomVirtualListController<T> {
  const scrollEl = document.createElement('div');

  scrollEl.style.cssText = options.horizontal
    ? 'overflow: auto hidden; width: 100%; height: 100%;'
    : 'overflow: hidden auto; width: 100%; height: 100%;';

  if (options.containerClass) scrollEl.className = options.containerClass;

  const listEl = document.createElement('div');

  scrollEl.appendChild(listEl);
  container.appendChild(scrollEl);

  let ctrl: DomVirtualListController<T>;

  try {
    ctrl = createDomVirtualList<T>({
      ...options,
      listElement: listEl,
      scrollElement: scrollEl,
    });
  } catch (e) {
    // Remove the scroll container if construction fails so we don't leak DOM nodes.
    scrollEl.remove();
    throw e;
  }

  return {
    get count() {
      return ctrl.count;
    },
    destroy() {
      ctrl.destroy();
      scrollEl.remove();
    },
    invalidate() {
      ctrl.invalidate();
    },
    get items() {
      return ctrl.items;
    },
    measure(index: number, size: number) {
      ctrl.measure(index, size);
    },
    measureBatch(entries: Array<{ index: number; size: number }>) {
      ctrl.measureBatch(entries);
    },
    measureEl(index: number, el: HTMLElement) {
      return ctrl.measureEl(index, el);
    },
    redraw() {
      ctrl.redraw();
    },
    refresh() {
      ctrl.refresh();
    },
    get scrollOffset() {
      return ctrl.scrollOffset;
    },
    scrollToBottom(scrollOptions?: { behavior?: ScrollBehavior }) {
      ctrl.scrollToBottom(scrollOptions);
    },
    scrollToIndex(index: number, scrollOptions?: ScrollToIndexOptions) {
      ctrl.scrollToIndex(index, scrollOptions);
    },
    scrollToOffset(offset: number, scrollOptions?: { behavior?: ScrollBehavior }) {
      ctrl.scrollToOffset(offset, scrollOptions);
    },
    scrollToTop(scrollOptions?: { behavior?: ScrollBehavior }) {
      ctrl.scrollToTop(scrollOptions);
    },
    setItems(items: T[]) {
      ctrl.setItems(items);
    },
    get stickyItems() {
      return ctrl.stickyItems;
    },
    [Symbol.dispose]() {
      ctrl.destroy();
      scrollEl.remove();
    },
    get totalSize() {
      return ctrl.totalSize;
    },
  };
}
