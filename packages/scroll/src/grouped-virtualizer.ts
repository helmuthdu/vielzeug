import type { Signal } from '@vielzeug/ripple';

import { resolveEstimateFn } from './_utils';
import { requireNonNegativeNumber, requirePositiveNumber, validateOverscan } from './_validation';
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
  type VirtualizerUpdateOptions,
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

/**
 * Options accepted by `GroupVirtualizer.update()`. Overrides are applied
 * together with the new sections on the next render cycle.
 *
 * Intentionally excludes `horizontal` (axis cannot change at runtime) and
 * `initialOffset` (one-time bootstrap).
 */
export interface GroupVirtualizerUpdateOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  measurementCache?: MeasurementCache;
  onChange?: ((state: GroupVirtualizerState<T>) => void) | undefined;
  onScrollEnd?: ((offset: number) => void) | undefined;
  onScrollingChange?: ((isScrolling: boolean) => void) | undefined;
  overscan?: Overscan;
  scrollEndDelay?: number;
}

export interface GroupVirtualizerOptions<T> {
  estimateHeaderSize?: number | ((section: GroupSection<T>, sectionIndex: number) => number);
  estimateItemSize?: number | ((item: T, itemIndex: number, sectionIndex: number) => number);
  getItemKey?: (item: T, itemIndex: number, sectionIndex: number) => VirtualKey;
  horizontal?: boolean;
  measurementCache?: MeasurementCache;
  /** Called after every render cycle with the new state. Replace through `update()`. */
  onChange?: (state: GroupVirtualizerState<T>) => void;
  /** Called when scrolling settles. Replace through `update()`. */
  onScrollEnd?: (offset: number) => void;
  /** Called when the scrolling state changes. Replace through `update()`. */
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  /**
   * Debounce delay (ms) for scroll-end detection. Defaults to 150.
   * See `VirtualizerOptions.scrollEndDelay` for details.
   */
  scrollEndDelay?: number;
  sections: Array<GroupSection<T>>;
  /** Optional signal factory for reactive state. */
  signal?: (init: GroupVirtualizerState<T>) => Signal<GroupVirtualizerState<T>>;
}

export interface GroupVirtualizer<T> {
  readonly count: number;
  readonly disposalSignal: AbortSignal;
  dispose: () => void;
  readonly disposed: boolean;
  invalidate: () => void;
  /** `true` while the user is actively scrolling; `false` once scroll has settled. */
  readonly isScrolling: boolean;
  readonly items: ReadonlyArray<GroupVirtualItem<T>>;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  measureEl: (index: number, el: HTMLElement) => () => void;
  refresh: () => void;
  readonly scrollOffset: number;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToItem: (sectionIndex: number, itemIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  scrollToSection: (sectionIndex: number, options?: ScrollToIndexOptions) => void;
  scrollToTop: (options?: { behavior?: ScrollBehavior }) => void;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  update: (sections: Array<GroupSection<T>>, opts?: GroupVirtualizerUpdateOptions<T>) => void;
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
  if (typeof options.estimateHeaderSize === 'number')
    requirePositiveNumber(options.estimateHeaderSize, 'estimateHeaderSize');

  if (typeof options.estimateItemSize === 'number') requirePositiveNumber(options.estimateItemSize, 'estimateItemSize');

  if (options.overscan !== undefined) validateOverscan(options.overscan);

  if (options.scrollEndDelay !== undefined) requireNonNegativeNumber(options.scrollEndDelay, 'scrollEndDelay');

  let sections = options.sections;
  let flat = buildFlatEntries(sections);

  function buildEstimateHeader(
    estimateHeaderSize: GroupVirtualizerOptions<T>['estimateHeaderSize'],
  ): (index: number) => number {
    return typeof estimateHeaderSize === 'function'
      ? (index: number) => {
          const entry = flat[index]!;

          return (estimateHeaderSize as (section: GroupSection<T>, sectionIndex: number) => number)(
            sections[entry.sectionIndex]!,
            entry.sectionIndex,
          );
        }
      : resolveEstimateFn(
          typeof estimateHeaderSize === 'number' ? estimateHeaderSize : undefined,
          DEFAULT_ESTIMATE_SIZE,
        );
  }

  let estimateHeaderFn = buildEstimateHeader(options.estimateHeaderSize);
  let estimateItemUserFn: ((item: T, itemIndex: number, sectionIndex: number) => number) | null =
    typeof options.estimateItemSize === 'function' ? options.estimateItemSize : null;
  let estimateItemFixedFn: ((index: number) => number) | null = estimateItemUserFn
    ? null
    : resolveEstimateFn(
        typeof options.estimateItemSize === 'number' ? options.estimateItemSize : undefined,
        DEFAULT_ESTIMATE_SIZE,
      );
  let userGetItemKey = options.getItemKey;

  function estimateFn(globalIndex: number): number {
    const entry = flat[globalIndex];

    if (!entry) return DEFAULT_ESTIMATE_SIZE;

    if (entry.isHeader) return estimateHeaderFn(globalIndex);

    if (estimateItemUserFn) return estimateItemUserFn(entry.item, entry.itemIndex, entry.sectionIndex);

    return estimateItemFixedFn!(globalIndex);
  }

  function getItemKey(globalIndex: number): VirtualKey {
    const entry = flat[globalIndex];

    if (!entry) return globalIndex;

    if (entry.isHeader) return `__header_${entry.sectionIndex}`;

    if (userGetItemKey) return userGetItemKey(entry.item, entry.itemIndex, entry.sectionIndex);

    return globalIndex;
  }

  let destroyed = false;
  let lastItems: Array<GroupVirtualItem<T>> = [];
  let onChange = options.onChange;
  let onScrollEnd = options.onScrollEnd;
  let onScrollingChange = options.onScrollingChange;

  // Optional signal for reactive state
  let stateSignal: Signal<GroupVirtualizerState<T>> | null = null;
  if (options.signal) {
    const initialState: GroupVirtualizerState<T> = { headers: [], items: [], stickyHeader: null, totalSize: 0 };
    stateSignal = options.signal(initialState);
  }

  // Helper to emit state to both callback and signal
  function emitState(state: GroupVirtualizerState<T>): void {
    if (stateSignal) stateSignal.value = state;
    onChange?.(state);
  }

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

      emitState(mapped);
    },
    onScrollEnd: (offset) => onScrollEnd?.(offset),
    onScrollingChange: (isScrolling) => onScrollingChange?.(isScrolling),
    overscan: options.overscan ?? DEFAULT_OVERSCAN,
    scrollEndDelay: options.scrollEndDelay,
    sticky: (i) => flat[i]?.isHeader ?? false,
  });

  const ac = new AbortController();

  function _dispose(): void {
    if (destroyed) return;

    destroyed = true;
    ac.abort();
    virtualizer.dispose();
  }

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
    get disposalSignal() {
      return ac.signal;
    },
    dispose: _dispose,
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
    [Symbol.dispose]: _dispose,
    get totalSize() {
      return virtualizer.totalSize;
    },
    /**
     * Replace all sections. Closures for estimateFn and getItemKey already
     * capture the live `flat`/`sections` references — only count is passed to
     * the underlying virtualizer to avoid discarding measured sizes on every
     * data refresh. `refresh()` rebuilds offsets while preserving the cache.
     */
    update(nextSections, opts?: GroupVirtualizerUpdateOptions<T>) {
      if (destroyed) return;

      if (opts) {
        if (typeof opts.estimateHeaderSize === 'number')
          requirePositiveNumber(opts.estimateHeaderSize, 'estimateHeaderSize');

        if (typeof opts.estimateItemSize === 'number') requirePositiveNumber(opts.estimateItemSize, 'estimateItemSize');

        if (opts.overscan !== undefined) validateOverscan(opts.overscan);

        if (opts.scrollEndDelay !== undefined) requireNonNegativeNumber(opts.scrollEndDelay, 'scrollEndDelay');

        if (Object.hasOwn(opts, 'onChange')) onChange = opts.onChange;

        if (Object.hasOwn(opts, 'onScrollEnd')) onScrollEnd = opts.onScrollEnd;

        if (Object.hasOwn(opts, 'onScrollingChange')) onScrollingChange = opts.onScrollingChange;

        // Apply option overrides before rebuilding flat entries.
        if (opts.estimateHeaderSize !== undefined) {
          estimateHeaderFn = buildEstimateHeader(opts.estimateHeaderSize);
        }

        if (opts.estimateItemSize !== undefined) {
          estimateItemUserFn = typeof opts.estimateItemSize === 'function' ? opts.estimateItemSize : null;
          estimateItemFixedFn = estimateItemUserFn
            ? null
            : resolveEstimateFn(
                typeof opts.estimateItemSize === 'number' ? opts.estimateItemSize : undefined,
                DEFAULT_ESTIMATE_SIZE,
              );
        }

        if (opts.getItemKey !== undefined) userGetItemKey = opts.getItemKey;
      }

      sections = nextSections;

      const prevCount = flat.length;

      flat = buildFlatEntries(sections);

      const virtUpdateOpts: VirtualizerUpdateOptions = { count: flat.length };

      if (opts?.measurementCache !== undefined) virtUpdateOpts.measurementCache = opts.measurementCache;

      if (opts?.overscan !== undefined) virtUpdateOpts.overscan = opts.overscan;

      if (opts?.scrollEndDelay !== undefined) virtUpdateOpts.scrollEndDelay = opts.scrollEndDelay;

      if (
        flat.length !== prevCount ||
        opts?.measurementCache !== undefined ||
        opts?.overscan !== undefined ||
        opts?.scrollEndDelay !== undefined
      ) {
        virtualizer.update(virtUpdateOpts);
      } else {
        virtualizer.refresh();
      }
    },
  };
}
