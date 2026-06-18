import { resolveEstimateFn } from './utils';
import {
  createVirtualizer,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type MeasurementCache,
  type Overscan,
  type ScrollTarget,
  type ScrollToIndexOptions,
  type VirtualItem,
  type VirtualizerState,
  type VirtualKey,
} from './virtualizer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupSection<T> {
  items: T[];
  label: string;
}

export interface GroupVirtualItem<T> extends VirtualItem {
  /** Item data. */
  data: T;
  /** Index within the section. */
  itemIndex: number;
  sectionIndex: number;
}

export interface GroupVirtualHeader extends VirtualItem {
  label: string;
  sectionIndex: number;
}

export interface GroupVirtualizerState<T> {
  readonly headers: GroupVirtualHeader[];
  readonly items: Array<GroupVirtualItem<T>>;
  readonly stickyHeader: GroupVirtualHeader | null;
  readonly totalSize: number;
}

export interface GroupVirtualizerOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  horizontal?: boolean;
  measurementCache?: MeasurementCache;
  /**
   * Called after every render cycle with the new state.
   * **Fixed at construction** \u2014 cannot be changed after creation.
   */
  onChange?: (state: GroupVirtualizerState<T>) => void;
  /**
   * Called when scrolling has settled. Fixed at construction.
   * See `VirtualizerOptions.onScrollEnd` for details.
   */
  onScrollEnd?: (offset: number) => void;
  /**
   * Called when the scrolling state changes. Fixed at construction.
   */
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  /**
   * Debounce delay (ms) for scroll-end detection. Defaults to 150.
   * See `VirtualizerOptions.scrollEndDelay` for details.
   */
  scrollEndDelay?: number;
  sections: Array<GroupSection<T>>;
}

export interface GroupVirtualizer<T> {
  readonly count: number;
  readonly disposed: boolean;
  /** `true` while the user is actively scrolling; `false` once scroll has settled. */
  readonly isScrolling: boolean;
  readonly items: ReadonlyArray<GroupVirtualItem<T>>;
  readonly scrollOffset: number;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  dispose: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  measureEl: (index: number, el: HTMLElement) => () => void;
  refresh: () => void;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToItem: (sectionIndex: number, itemIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  scrollToSection: (sectionIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToTop: (options?: { behavior?: ScrollBehavior }) => void;
  update: (sections: Array<GroupSection<T>>) => void;
  [Symbol.dispose]: () => void;
}

// ─── Flat entry map ───────────────────────────────────────────────────────────

type FlatHeader = { isHeader: true; itemIndex: -1; label: string; sectionIndex: number };
type FlatItem<T> = { isHeader: false; item: T; itemIndex: number; sectionIndex: number };
type FlatEntry<T> = FlatHeader | FlatItem<T>;

function buildFlatEntries<T>(sections: Array<GroupSection<T>>): FlatEntry<T>[] {
  const flat: FlatEntry<T>[] = [];

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s]!;

    flat.push({ isHeader: true, itemIndex: -1, label: section.label, sectionIndex: s });

    for (let i = 0; i < section.items.length; i++) {
      flat.push({ isHeader: false, item: section.items[i]!, itemIndex: i, sectionIndex: s });
    }
  }

  return flat;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function createGroupedVirtualizer<T>(
  target: ScrollTarget,
  options: GroupVirtualizerOptions<T>,
): GroupVirtualizer<T> {
  let sections = options.sections;
  let flat = buildFlatEntries(sections);

  const estimateHeader =
    typeof options.estimateHeaderSize === 'function'
      ? (index: number) => {
          const entry = flat[index]!;

          return (options.estimateHeaderSize as (section: GroupSection<T>, sectionIndex: number) => number)(
            sections[entry.sectionIndex]!,
            entry.sectionIndex,
          );
        }
      : resolveEstimateFn(
          typeof options.estimateHeaderSize === 'number' ? options.estimateHeaderSize : undefined,
          DEFAULT_ESTIMATE_SIZE,
        );

  const estimateItemFn: ((item: T, itemIndex: number, sectionIndex: number) => number) | null =
    typeof options.estimateItemSize === 'function' ? options.estimateItemSize : null;
  const estimateItemFixed = estimateItemFn
    ? null
    : resolveEstimateFn(
        typeof options.estimateItemSize === 'number' ? options.estimateItemSize : undefined,
        DEFAULT_ESTIMATE_SIZE,
      );

  function estimateFn(globalIndex: number): number {
    const entry = flat[globalIndex];

    if (!entry) return DEFAULT_ESTIMATE_SIZE;

    if (entry.isHeader) return estimateHeader(globalIndex);

    if (estimateItemFn) return estimateItemFn(entry.item, entry.itemIndex, entry.sectionIndex);

    return estimateItemFixed!(globalIndex);
  }

  function getItemKey(globalIndex: number): VirtualKey {
    const entry = flat[globalIndex];

    if (!entry) return globalIndex;

    if (entry.isHeader) return `__header_${entry.sectionIndex}`;

    if (options.getItemKey) return options.getItemKey(entry.item, entry.itemIndex, entry.sectionIndex);

    return globalIndex;
  }

  let destroyed = false;
  let lastItems: Array<GroupVirtualItem<T>> = [];

  function mapState(state: VirtualizerState): GroupVirtualizerState<T> {
    const items: Array<GroupVirtualItem<T>> = [];
    const headers: GroupVirtualHeader[] = [];
    let stickyHeader: GroupVirtualHeader | null = null;

    for (const vi of state.items) {
      const entry = flat[vi.index];

      if (!entry) continue;

      if (entry.isHeader) {
        headers.push({ ...vi, label: entry.label ?? '', sectionIndex: entry.sectionIndex });
      } else {
        items.push({ ...vi, data: entry.item, itemIndex: entry.itemIndex, sectionIndex: entry.sectionIndex });
      }
    }

    if (state.stickyItems.length > 0) {
      const svi = state.stickyItems[0]!;
      const entry = flat[svi.index];

      if (entry?.isHeader) {
        stickyHeader = { ...svi, label: entry.label ?? '', sectionIndex: entry.sectionIndex };
      }
    }

    lastItems = items;

    return { headers, items, stickyHeader, totalSize: state.totalSize };
  }

  const virtualizer = createVirtualizer(target, {
    count: flat.length,
    estimateSize: estimateFn,
    getItemKey,
    horizontal: options.horizontal,
    measurementCache: options.measurementCache,
    onChange: (state) => {
      const mapped = mapState(state);

      options.onChange?.(mapped);
    },
    onScrollEnd: options.onScrollEnd,
    onScrollingChange: options.onScrollingChange,
    overscan: options.overscan ?? DEFAULT_OVERSCAN,
    scrollEndDelay: options.scrollEndDelay,
    sticky: (i) => flat[i]?.isHeader ?? false,
  });

  // Build a flat-index lookup: [sectionIndex, itemIndex] → flat index.
  // Returns -1 when sectionIndex is out of range so callers can no-op safely.
  function flatIndexOf(sectionIndex: number, itemIndex?: number): number {
    if (sectionIndex < 0 || sectionIndex >= sections.length) return -1;

    let pos = 0;

    for (let s = 0; s < sections.length; s++) {
      if (s === sectionIndex) {
        if (itemIndex === undefined) return pos; // header

        return pos + 1 + itemIndex;
      }

      pos += 1 + sections[s]!.items.length;
    }

    return -1; // unreachable
  }

  return {
    get count() {
      return virtualizer.count;
    },
    dispose() {
      if (destroyed) return;

      destroyed = true;
      virtualizer.dispose();
    },
    get disposed() {
      return destroyed;
    },
    invalidate() {
      if (destroyed) return;

      virtualizer.invalidate();
    },
    get isScrolling() {
      return virtualizer.isScrolling;
    },
    get items() {
      return lastItems;
    },
    measure(index: number, size: number) {
      if (destroyed) return;

      virtualizer.measure(index, size);
    },
    measureBatch(entries: Array<{ index: number; size: number }>) {
      if (destroyed) return;

      virtualizer.measureBatch(entries);
    },
    measureEl(index: number, el: HTMLElement) {
      if (destroyed) return () => {};

      return virtualizer.measureEl(index, el);
    },
    refresh() {
      if (destroyed) return;

      virtualizer.refresh();
    },
    get scrollOffset() {
      return virtualizer.scrollOffset;
    },
    scrollToBottom(opts?: { behavior?: ScrollBehavior }) {
      if (destroyed) return;

      virtualizer.scrollToBottom(opts);
    },
    scrollToIndex(index: number, opts?: ScrollToIndexOptions) {
      if (destroyed) return;

      virtualizer.scrollToIndex(index, opts);
    },
    scrollToItem(sectionIndex, itemIndex, opts = {}) {
      if (destroyed) return;

      const globalIndex = flatIndexOf(sectionIndex, itemIndex);

      if (globalIndex < 0) return;

      virtualizer.scrollToIndex(globalIndex, opts);
    },
    scrollToOffset(offset: number, opts?: { behavior?: ScrollBehavior }) {
      if (destroyed) return;

      virtualizer.scrollToOffset(offset, opts);
    },
    scrollToSection(sectionIndex, opts = {}) {
      if (destroyed) return;

      const globalIndex = flatIndexOf(sectionIndex);

      if (globalIndex < 0) return;

      virtualizer.scrollToIndex(globalIndex, opts);
    },
    scrollToTop(opts?: { behavior?: ScrollBehavior }) {
      if (destroyed) return;

      virtualizer.scrollToTop(opts);
    },
    get stickyItems() {
      return virtualizer.stickyItems;
    },
    [Symbol.dispose]() {
      this.dispose();
    },
    get totalSize() {
      return virtualizer.totalSize;
    },
    /**
     * Replace all sections. Closures for estimateFn and getItemKey already
     * capture the live `flat`/`sections` references — only count is passed to
     * the underlying virtualizer to avoid discarding measured sizes on every
     * data refresh. `refresh()` rebuilds offsets while preserving the cache.
     */
    update(nextSections) {
      if (destroyed) return;

      sections = nextSections;

      const prevCount = flat.length;

      flat = buildFlatEntries(sections);

      if (flat.length !== prevCount) {
        // update() with a changed count triggers rebuild + re-emit internally.
        virtualizer.update({ count: flat.length });
      } else {
        // Count unchanged: closures already see new data, re-emit with refresh().
        virtualizer.refresh();
      }
    },
  };
}
