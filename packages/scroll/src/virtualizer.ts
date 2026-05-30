import {
  createScrollAdapter,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  normalizeOverscan,
  resolveEstimateFn,
  toNonNegativeInt,
  toPositiveNumber,
  type MeasurementCache,
  type Overscan,
  type ScrollTarget,
  type VirtualKey,
} from './utils';

export {
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type MeasurementCache,
  type Overscan,
  type ScrollTarget,
  type VirtualKey,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VirtualItem {
  end: number;
  index: number;
  size: number;
  start: number;
}

export interface VirtualizerState {
  readonly items: VirtualItem[];
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
}

export interface VirtualizerOptions {
  count: number;
  estimateSize?: number | ((index: number) => number);
  gap?: number;
  getItemKey?: (index: number) => VirtualKey;
  horizontal?: boolean;
  initialOffset?: number;
  /** External measurement cache for scroll restoration or SSR pre-measurement. */
  measurementCache?: MeasurementCache;
  onChange?: (state: VirtualizerState) => void;
  /** Zero-allocation alternative to onChange for range-based consumers (prefetch, analytics). */
  onRangeChange?: (first: number, last: number) => void;
  overscan?: Overscan;
  sticky?: (index: number) => boolean;
}

/**
 * Options accepted by `update()`. Structural layout options only —
 * callbacks and immutable boot options are excluded.
 */
export type VirtualizerUpdateOptions = Partial<
  Omit<VirtualizerOptions, 'horizontal' | 'initialOffset' | 'measurementCache' | 'onChange' | 'onRangeChange'>
>;

export interface ScrollToIndexOptions {
  align?: 'auto' | 'center' | 'end' | 'start';
  behavior?: ScrollBehavior;
  /** Called when the scroll animation completes (or immediately for instant scrolls). */
  onComplete?: () => void;
}

export interface Virtualizer {
  readonly count: number;
  readonly items: VirtualItem[];
  readonly scrollOffset: number;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  /** Attach a ResizeObserver to `el` and auto-measure `index` on resize. Returns a disconnect fn. */
  measureEl: (index: number, el: HTMLElement) => () => void;
  /** Prepend `additionalCount` items at the top while keeping the viewport visually stable. */
  prepend: (additionalCount: number) => void;
  refresh: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  update: (next: VirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}

// ─── Implementation ────────────────────────────────────────────────────────────

export function createVirtualizer(target: ScrollTarget, options: VirtualizerOptions): Virtualizer {
  const horizontal = !!options.horizontal;
  const defaultItemKey = (index: number): VirtualKey => index;

  let count = toNonNegativeInt(options.count);
  let estimateFn = resolveEstimateFn(options.estimateSize, DEFAULT_ESTIMATE_SIZE);
  let gap = toNonNegativeInt(options.gap ?? 0);
  let getItemKey = options.getItemKey ?? defaultItemKey;
  let overscan = normalizeOverscan(options.overscan, DEFAULT_OVERSCAN);
  let stickyFn: ((index: number) => boolean) | null = options.sticky ?? null;

  // Callbacks fixed at construction — not swappable via update() (R7).
  const onChange = options.onChange;
  const onRangeChange = options.onRangeChange;

  // External or internal measurement cache (R: MeasurementCache future improvement).
  const measuredByKey: MeasurementCache = options.measurementCache ?? new Map();

  let items: VirtualItem[] = [];
  let stickyItems: VirtualItem[] = [];
  let totalSize = 0;
  let scrollOffset = 0;
  let offsets: number[] = [];
  let viewportSize = 0;
  let prevRenderStart = -1;
  let prevRenderEnd = -1;
  let prevTotalSize = -1;
  let prevScrollOffset = -1;
  let pendingBuild = false;
  let minChangedIndex = Infinity;
  let destroyed = false;

  // ─── Offset helpers ──────────────────────────────────────────────────────────

  function sizeAt(index: number): number {
    return measuredByKey.get(getItemKey(index)) ?? estimateFn(index);
  }

  function startAt(index: number): number {
    return offsets[index] ?? 0;
  }

  function endAt(index: number): number {
    return startAt(index) + sizeAt(index);
  }

  function clampScrollOffset(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;
    const maxOffset = Math.max(0, totalSize - viewportSize);

    return Math.min(maxOffset, Math.max(0, safe));
  }

  // ─── Offset table ────────────────────────────────────────────────────────────

  /**
   * Full O(n) rebuild. Pass `forceEmit: true` to invalidate dedup guards so
   * computeVisible() always emits after this call (R10).
   */
  function rebuildOffsets(forceEmit = false): void {
    if (forceEmit) {
      prevRenderStart = -1;
      prevRenderEnd = -1;
      prevScrollOffset = -1;
    }

    const next: number[] = [0];
    let pos = 0;

    for (let i = 0; i < count; i++) {
      pos += sizeAt(i) + (i < count - 1 ? gap : 0);
      next.push(pos);
    }

    offsets = next;
    totalSize = pos;
  }

  /**
   * Incremental O(count - fromIndex) rebuild — used after measurement.
   * Always forces re-emit since measurements produce layout changes.
   */
  function rebuildOffsetsFrom(fromIndex: number): void {
    if (!Number.isFinite(fromIndex) || fromIndex >= count) return;

    prevRenderStart = -1;
    prevRenderEnd = -1;
    prevScrollOffset = -1;

    let pos = offsets[fromIndex] ?? 0;

    for (let i = fromIndex; i < count; i++) {
      offsets[i] = pos;
      pos += sizeAt(i) + (i < count - 1 ? gap : 0);
    }

    offsets[count] = pos;
    totalSize = pos;
  }

  // ─── Visible range ───────────────────────────────────────────────────────────

  function findFirstVisible(offsetStart: number): number {
    let lo = 0;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (endAt(mid) <= offsetStart) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  function findLastVisible(offsetEnd: number, firstVisible: number): number {
    let lo = firstVisible;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (startAt(mid) < offsetEnd) lo = mid;
      else hi = mid - 1;
    }

    return lo;
  }

  function itemFromIndex(index: number): VirtualItem {
    const start = startAt(index);
    const size = sizeAt(index);

    return { end: start + size, index, size, start };
  }

  // ─── Sticky items ────────────────────────────────────────────────────────────

  function computeStickyItems(): VirtualItem[] {
    if (!stickyFn || count === 0 || scrollOffset <= 0) return [];

    // Binary search: last index whose natural start is strictly above the viewport top.
    let lastAbove = -1;
    let lo = 0;
    let hi = count - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;

      if (startAt(mid) < scrollOffset) {
        lastAbove = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (lastAbove < 0) return [];

    let activeIdx = -1;

    for (let i = lastAbove; i >= 0; i--) {
      if (stickyFn(i)) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx === -1) return [];

    const activeSize = sizeAt(activeIdx);
    let nextStickyStart = Infinity;

    for (let i = activeIdx + 1; i < count; i++) {
      if (stickyFn(i)) {
        nextStickyStart = startAt(i);
        break;
      }
    }

    const pinnedStart = Math.min(scrollOffset, nextStickyStart - activeSize);

    return [{ end: pinnedStart + activeSize, index: activeIdx, size: activeSize, start: pinnedStart }];
  }

  // ─── Compute and emit ─────────────────────────────────────────────────────────

  function computeVisible(): void {
    if (destroyed) return;

    if (count === 0 || viewportSize <= 0) {
      if (prevRenderStart !== -1 || prevTotalSize !== totalSize) {
        prevRenderStart = -1;
        prevRenderEnd = -1;
        prevTotalSize = totalSize;
        prevScrollOffset = -1;

        items = [];
        stickyItems = [];

        if (onRangeChange) onRangeChange(-1, -1);

        if (onChange) onChange({ items, stickyItems, totalSize });
      }

      return;
    }

    const start = scrollOffset;
    const end = start + viewportSize;
    const firstVisible = findFirstVisible(start);
    const lastVisible = findLastVisible(end, firstVisible);
    const renderStart = Math.max(0, firstVisible - overscan.start);
    const renderEnd = Math.min(count - 1, lastVisible + overscan.end);

    // Sticky recomputes on every scroll pixel — bypass dedup in that case.
    const stickyScrolled = stickyFn !== null && scrollOffset !== prevScrollOffset;
    const rangeChanged = renderStart !== prevRenderStart || renderEnd !== prevRenderEnd;
    const sizeChanged = prevTotalSize !== totalSize;

    if (!rangeChanged && !sizeChanged && !stickyScrolled) return;

    prevRenderStart = renderStart;
    prevRenderEnd = renderEnd;
    prevTotalSize = totalSize;
    prevScrollOffset = scrollOffset;

    // Zero-allocation range notification — fires before items array is built (R: onRangeChange).
    if ((rangeChanged || sizeChanged) && onRangeChange) {
      onRangeChange(renderStart, renderEnd);
    }

    // Always build items for v.items getter and onChange consumers.
    const nextItems: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      nextItems.push(itemFromIndex(i));
    }

    items = nextItems;
    stickyItems = stickyFn ? computeStickyItems() : [];

    if (onChange) onChange({ items, stickyItems, totalSize });
  }

  // ─── Measurement (R2) ────────────────────────────────────────────────────────

  /** Returns true if the measurement was new/changed. Updates minChangedIndex. */
  function recordMeasurement(index: number, size: number): boolean {
    if (!Number.isFinite(index)) return false;

    const i = Math.floor(index);

    if (i < 0 || i >= count) return false;

    const s = toPositiveNumber(size, -1);

    if (s <= 0) return false;

    const key = getItemKey(i);

    if (measuredByKey.get(key) === s) return false;

    measuredByKey.set(key, s);

    if (i < minChangedIndex) minChangedIndex = i;

    return true;
  }

  function scheduleBuild(): void {
    if (pendingBuild) return;

    pendingBuild = true;
    queueMicrotask(() => {
      pendingBuild = false;

      const fromIdx = minChangedIndex;

      minChangedIndex = Infinity;
      rebuildOffsetsFrom(fromIdx);
      computeVisible();
    });
  }

  // ─── Option updates ───────────────────────────────────────────────────────────

  function applyOptions(next: VirtualizerUpdateOptions): void {
    let needsRebuild = false;
    let needsCompute = false;

    if (next.count !== undefined) {
      const nextCount = toNonNegativeInt(next.count);

      if (nextCount !== count) {
        count = nextCount;
        needsRebuild = true;
      }
    }

    if ('estimateSize' in next) {
      estimateFn = resolveEstimateFn(next.estimateSize, DEFAULT_ESTIMATE_SIZE);
      measuredByKey.clear();
      needsRebuild = true;
    }

    if (next.gap !== undefined) {
      const nextGap = toNonNegativeInt(next.gap);

      if (nextGap !== gap) {
        gap = nextGap;
        needsRebuild = true;
      }
    }

    if ('getItemKey' in next) {
      const nextKey = next.getItemKey ?? defaultItemKey;

      if (nextKey !== getItemKey) {
        getItemKey = nextKey;
        measuredByKey.clear();
        needsRebuild = true;
      }
    }

    if (next.overscan !== undefined) {
      const nextOverscan = normalizeOverscan(next.overscan, DEFAULT_OVERSCAN);

      if (nextOverscan.start !== overscan.start || nextOverscan.end !== overscan.end) {
        overscan = nextOverscan;
        needsCompute = true;
      }
    }

    if ('sticky' in next) {
      const nextStickyFn = next.sticky ?? null;

      if (nextStickyFn !== stickyFn) {
        stickyFn = nextStickyFn;
        prevRenderStart = -1; // force re-emit to flush updated stickyItems
      }

      needsCompute = true;
    }

    if (needsRebuild) rebuildOffsets(true);

    if (needsCompute || needsRebuild) computeVisible();
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  function measure(index: number, size: number): void {
    if (destroyed) return;

    if (recordMeasurement(index, size)) scheduleBuild();
  }

  function measureBatch(entries: Array<{ index: number; size: number }>): void {
    if (destroyed) return;

    let changed = false;

    for (const { index, size } of entries) {
      if (recordMeasurement(index, size)) changed = true;
    }

    if (changed) scheduleBuild();
  }

  /** Attach a ResizeObserver to `el`. Returns a disconnect function. */
  function measureEl(index: number, el: HTMLElement): () => void {
    if (destroyed) return () => {};

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = horizontal ? entry.contentRect.width : entry.contentRect.height;

        measure(index, size);
      }
    });

    ro.observe(el);

    return () => ro.disconnect();
  }

  function invalidate(): void {
    if (destroyed) return;

    measuredByKey.clear();
    minChangedIndex = Infinity; // cancel any pending incremental rebuild
    rebuildOffsets(true);
    computeVisible();
  }

  function refresh(): void {
    if (destroyed) return;

    rebuildOffsets(true); // force re-emit — caller knows content changed
    computeVisible();
  }

  /**
   * Prepend `additionalCount` items at the top while keeping the viewport
   * visually stable (R: bidirectional/prepend future improvement).
   */
  function prepend(additionalCount: number): void {
    if (destroyed) return;

    const n = toNonNegativeInt(additionalCount);

    if (n === 0) return;

    count += n;
    rebuildOffsets(true);

    // startAt(n) = total height of the n prepended items — scroll down by that
    // amount so the user continues to see the same content.
    const prependedHeight = startAt(n);
    const newOffset = clampScrollOffset(scrollOffset + prependedHeight);

    axis.writeOffset(newOffset, 'auto');
    scrollOffset = newOffset;

    computeVisible();
  }

  function update(next: VirtualizerUpdateOptions): void {
    if (destroyed) return;

    applyOptions(next);
  }

  function scrollToIndex(index: number, opts: ScrollToIndexOptions = {}): void {
    if (destroyed || count <= 0) return;

    const safeIndex = Number.isFinite(index) ? Math.floor(index) : 0;
    const clampedIndex = Math.max(0, Math.min(safeIndex, count - 1));
    const align = opts.align ?? 'auto';
    const behavior = opts.behavior ?? 'auto';
    const itemStart = startAt(clampedIndex);
    const itemSize = sizeAt(clampedIndex);
    const itemEnd = itemStart + itemSize;

    let targetOffset: number;

    if (align === 'start') {
      targetOffset = itemStart;
    } else if (align === 'end') {
      targetOffset = itemEnd - viewportSize;
    } else if (align === 'center') {
      targetOffset = itemStart - (viewportSize - itemSize) / 2;
    } else {
      const visibleStart = scrollOffset;
      const visibleEnd = visibleStart + viewportSize;

      if (itemStart >= visibleStart && itemEnd <= visibleEnd) {
        // Already visible — still fire completion if requested.
        if (opts.onComplete) queueMicrotask(opts.onComplete);

        return;
      }

      targetOffset = itemStart < visibleStart ? itemStart : itemEnd - viewportSize;
    }

    axis.writeOffset(clampScrollOffset(targetOffset), behavior);

    if (opts.onComplete) {
      // Smooth scroll: use native scrollend event with microtask fallback.
      if (behavior === 'smooth' && 'onscrollend' in target) {
        (target as EventTarget).addEventListener('scrollend', opts.onComplete, { once: true });
      } else {
        queueMicrotask(opts.onComplete);
      }
    }
  }

  function scrollToOffset(offset: number, opts: { behavior?: ScrollBehavior } = {}): void {
    if (destroyed) return;

    axis.writeOffset(clampScrollOffset(offset), opts.behavior ?? 'auto');
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    adapter.detach();
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────────
  //
  // Function declarations for scroll/resize handlers are defined here first so
  // they can be passed to createScrollAdapter. The handlers close over `axis`,
  // which is const-assigned immediately after. Since event callbacks only fire
  // asynchronously, axis is always assigned before any handler runs.

  function handleScroll(): void {
    scrollOffset = clampScrollOffset(axis.readOffset());
    computeVisible();
  }

  function handleResize(): void {
    viewportSize = axis.readViewportSize();
    computeVisible();
  }

  const adapter = createScrollAdapter(target, handleScroll, handleResize);
  const axis = horizontal ? adapter.x : adapter.y;

  rebuildOffsets(true);

  if (options.initialOffset !== undefined) {
    axis.writeOffset(clampScrollOffset(options.initialOffset), 'auto');
  }

  scrollOffset = clampScrollOffset(axis.readOffset());
  viewportSize = axis.readViewportSize();

  computeVisible();

  return {
    get count() {
      return count;
    },
    destroy,
    invalidate,
    get items() {
      return items;
    },
    measure,
    measureBatch,
    measureEl,
    prepend,
    refresh,
    get scrollOffset() {
      return scrollOffset;
    },
    scrollToIndex,
    scrollToOffset,
    get stickyItems() {
      return stickyItems;
    },
    [Symbol.dispose]() {
      destroy();
    },
    get totalSize() {
      return totalSize;
    },
    update,
  };
}
