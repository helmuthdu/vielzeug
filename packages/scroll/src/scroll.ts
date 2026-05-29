export type VirtualKey = number | string;

export interface VirtualItem {
  end: number;
  index: number;
  size: number;
  start: number;
}

export type Overscan = { end?: number; start?: number };

export interface VirtualizerOptions {
  count: number;
  estimateSize?: number | ((index: number) => number);
  gap?: number;
  getItemKey?: (index: number) => VirtualKey;
  horizontal?: boolean;
  initialOffset?: number;
  onChange?: (items: VirtualItem[], totalSize: number) => void;
  onMeasure?: (index: number, oldSize: number | undefined, newSize: number) => void;
  onScrollEnd?: (offset: number) => void;
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  scrollEndDelay?: number;
}

export type VirtualizerUpdateOptions = Partial<Omit<VirtualizerOptions, 'horizontal' | 'initialOffset'>>;

export interface ScrollToIndexOptions {
  align?: 'auto' | 'center' | 'end' | 'start';
  behavior?: ScrollBehavior;
}

export interface Virtualizer {
  readonly count: number;
  readonly isScrolling: boolean;
  readonly items: VirtualItem[];
  readonly scrollOffset: number;
  readonly totalSize: number;
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  refresh: () => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  update: (next: VirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}

export const DEFAULT_ESTIMATE_SIZE = 36;
export const DEFAULT_OVERSCAN = 3;
export const DEFAULT_SCROLL_END_DELAY = 120;

type ScrollTarget = HTMLElement | Window;

type AxisIO = {
  attach: (onScroll: () => void, onResize: () => void) => () => void;
  readOffset: () => number;
  readViewportSize: () => number;
  writeOffset: (offset: number, behavior: ScrollBehavior) => void;
};

function toNonNegativeInt(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;

  return Math.max(0, Math.floor(value));
}

function toPositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;

  return value;
}

function normalizeEstimate(estimate: VirtualizerOptions['estimateSize']): number | ((index: number) => number) {
  if (typeof estimate === 'number') return toPositiveNumber(estimate, DEFAULT_ESTIMATE_SIZE);

  if (typeof estimate === 'function') return estimate;

  return DEFAULT_ESTIMATE_SIZE;
}

function createEstimateFn(estimate: number | ((index: number) => number)): (index: number) => number {
  if (typeof estimate === 'number') {
    return () => estimate;
  }

  return (index: number) => toPositiveNumber(estimate(index), DEFAULT_ESTIMATE_SIZE);
}

function normalizeOverscan(overscan: Overscan | undefined): { end: number; start: number } {
  return {
    end: toNonNegativeInt(overscan?.end ?? DEFAULT_OVERSCAN),
    start: toNonNegativeInt(overscan?.start ?? DEFAULT_OVERSCAN),
  };
}

function isWindowTarget(target: ScrollTarget): target is Window {
  return (
    (typeof Window !== 'undefined' && target instanceof Window) ||
    (typeof (target as Window).innerHeight === 'number' && typeof (target as Window).document === 'object')
  );
}

function createAxisIO(target: ScrollTarget, horizontal: boolean): AxisIO {
  if (isWindowTarget(target)) {
    return {
      attach(onScroll, onResize) {
        target.addEventListener('scroll', onScroll, { passive: true });
        target.addEventListener('resize', onResize, { passive: true });

        return () => {
          target.removeEventListener('scroll', onScroll);
          target.removeEventListener('resize', onResize);
        };
      },
      readOffset: horizontal ? () => target.scrollX : () => target.scrollY,
      readViewportSize: horizontal ? () => target.innerWidth : () => target.innerHeight,
      writeOffset: (offset, behavior) => {
        target.scrollTo(horizontal ? { behavior, left: offset } : { behavior, top: offset });
      },
    };
  }

  return {
    attach(onScroll, onResize) {
      const resizeObserver = new ResizeObserver(onResize);

      target.addEventListener('scroll', onScroll, { passive: true });
      resizeObserver.observe(target);

      return () => {
        target.removeEventListener('scroll', onScroll);
        resizeObserver.disconnect();
      };
    },
    readOffset: horizontal ? () => target.scrollLeft : () => target.scrollTop,
    readViewportSize: horizontal ? () => target.clientWidth : () => target.clientHeight,
    writeOffset: (offset, behavior) => {
      target.scrollTo(horizontal ? { behavior, left: offset } : { behavior, top: offset });
    },
  };
}

export function createVirtualizer(target: ScrollTarget, options: VirtualizerOptions): Virtualizer {
  const axis = createAxisIO(target, !!options.horizontal);

  const defaultItemKey = (index: number): VirtualKey => index;

  let count = toNonNegativeInt(options.count);
  let estimateSize = normalizeEstimate(options.estimateSize);
  let estimateFn = createEstimateFn(estimateSize);
  let gap = toNonNegativeInt(options.gap ?? 0);
  let getItemKey = options.getItemKey ?? defaultItemKey;
  let overscan = normalizeOverscan(options.overscan);
  let scrollEndDelay = toNonNegativeInt(options.scrollEndDelay ?? DEFAULT_SCROLL_END_DELAY, DEFAULT_SCROLL_END_DELAY);
  let onChange = options.onChange;
  let onMeasure = options.onMeasure;
  let onScrollEnd = options.onScrollEnd;
  let onScrollingChange = options.onScrollingChange;

  let items: VirtualItem[] = [];
  let totalSize = 0;
  let scrollOffset = 0;
  let isScrolling = false;
  const measuredByKey = new Map<VirtualKey, number>();
  let offsets: number[] = [];
  let viewportSize = axis.readViewportSize();
  let prevRenderStart = -1;
  let prevRenderEnd = -1;
  let prevTotalSize = -1;
  let pendingBuild = false;
  let destroyed = false;
  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

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

  function clearScrollEndTimer(): void {
    if (!scrollEndTimer) return;

    clearTimeout(scrollEndTimer);
    scrollEndTimer = null;
  }

  function setScrolling(next: boolean): void {
    if (isScrolling === next) return;

    isScrolling = next;
    onScrollingChange?.(next);
  }

  function scheduleScrollEnd(): void {
    clearScrollEndTimer();

    scrollEndTimer = setTimeout(() => {
      scrollEndTimer = null;
      setScrolling(false);
      onScrollEnd?.(scrollOffset);
    }, scrollEndDelay);
  }

  function onScroll(): void {
    scrollOffset = clampScrollOffset(axis.readOffset());
    setScrolling(true);
    scheduleScrollEnd();
    computeVisible();
  }

  function onResize(): void {
    viewportSize = axis.readViewportSize();
    computeVisible();
  }

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

    return {
      end: start + size,
      index,
      size,
      start,
    };
  }

  function emit(nextItems: VirtualItem[]): void {
    items = nextItems;
    onChange?.(nextItems, totalSize);
  }

  function syncScrollOffset(): void {
    const rawOffset = axis.readOffset();
    const nextOffset = clampScrollOffset(rawOffset);

    if (nextOffset === scrollOffset) return;

    scrollOffset = nextOffset;

    if (rawOffset !== nextOffset) axis.writeOffset(nextOffset, 'auto');
  }

  function rebuildOffsets(): void {
    prevRenderStart = -1;
    prevRenderEnd = -1;

    const next: number[] = [0];
    let pos = 0;

    for (let i = 0; i < count; i++) {
      pos += sizeAt(i) + (i < count - 1 ? gap : 0);
      next.push(pos);
    }

    offsets = next;
    totalSize = pos;
  }

  function computeVisible(): void {
    if (destroyed) return;

    syncScrollOffset();

    if (count === 0 || viewportSize <= 0) {
      if (prevRenderStart !== -1 || prevTotalSize !== totalSize) {
        prevRenderStart = -1;
        prevRenderEnd = -1;
        prevTotalSize = totalSize;
        emit([]);
      }

      return;
    }

    const start = scrollOffset;
    const end = start + viewportSize;
    const firstVisible = findFirstVisible(start);
    const lastVisible = findLastVisible(end, firstVisible);
    const renderStart = Math.max(0, firstVisible - overscan.start);
    const renderEnd = Math.min(count - 1, lastVisible + overscan.end);

    if (renderStart === prevRenderStart && renderEnd === prevRenderEnd && prevTotalSize === totalSize) return;

    prevRenderStart = renderStart;
    prevRenderEnd = renderEnd;
    prevTotalSize = totalSize;

    const nextItems: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      nextItems.push(itemFromIndex(i));
    }

    emit(nextItems);
  }

  function applyOptions(next: VirtualizerUpdateOptions): void {
    let needsRebuild = false;
    let needsCompute = false;

    if (next.count !== undefined) {
      const nextCount = toNonNegativeInt(next.count);

      if (nextCount !== count) {
        count = nextCount;
        needsRebuild = true;
        needsCompute = true;
      }
    }

    if (next.estimateSize !== undefined) {
      const normalizedEstimate = normalizeEstimate(next.estimateSize);

      if (normalizedEstimate !== estimateSize) {
        estimateSize = normalizedEstimate;
        estimateFn = createEstimateFn(estimateSize);
        measuredByKey.clear();
        needsRebuild = true;
        needsCompute = true;
      }
    }

    if (next.gap !== undefined) {
      const nextGap = toNonNegativeInt(next.gap);

      if (nextGap !== gap) {
        gap = nextGap;
        needsRebuild = true;
        needsCompute = true;
      }
    }

    if ('getItemKey' in next) {
      const nextKey = next.getItemKey ?? defaultItemKey;

      if (nextKey !== getItemKey) {
        getItemKey = nextKey;
        measuredByKey.clear();
        needsRebuild = true;
        needsCompute = true;
      }
    }

    if (next.overscan !== undefined) {
      const nextOverscan = normalizeOverscan(next.overscan);

      if (nextOverscan.start !== overscan.start || nextOverscan.end !== overscan.end) {
        overscan = nextOverscan;
        needsCompute = true;
      }
    }

    if (next.scrollEndDelay !== undefined) {
      const nextDelay = toNonNegativeInt(next.scrollEndDelay, DEFAULT_SCROLL_END_DELAY);

      if (nextDelay !== scrollEndDelay) scrollEndDelay = nextDelay;
    }

    if ('onChange' in next) onChange = next.onChange;

    if ('onMeasure' in next) onMeasure = next.onMeasure;

    if ('onScrollEnd' in next) onScrollEnd = next.onScrollEnd;

    if ('onScrollingChange' in next) onScrollingChange = next.onScrollingChange;

    if (needsRebuild) rebuildOffsets();

    if (needsCompute || needsRebuild) computeVisible();
  }

  function update(next: VirtualizerUpdateOptions): void {
    if (destroyed) return;

    applyOptions(next);
  }

  function measure(index: number, size: number): void {
    if (destroyed) return;

    if (!Number.isFinite(index)) return;

    const safeIndex = Math.floor(index);

    if (safeIndex < 0 || safeIndex >= count) return;

    const safeSize = toPositiveNumber(size, -1);

    if (safeSize <= 0) return;

    const key = getItemKey(safeIndex);
    const oldSize = measuredByKey.get(key);

    if (oldSize === safeSize) return;

    measuredByKey.set(key, safeSize);
    onMeasure?.(safeIndex, oldSize, safeSize);

    if (pendingBuild) return;

    pendingBuild = true;
    queueMicrotask(() => {
      pendingBuild = false;
      rebuildOffsets();
      computeVisible();
    });
  }

  function measureBatch(entries: Array<{ index: number; size: number }>): void {
    if (destroyed) return;

    let changed = false;

    for (const { index, size } of entries) {
      if (!Number.isFinite(index)) continue;

      const safeIndex = Math.floor(index);

      if (safeIndex < 0 || safeIndex >= count) continue;

      const safeSize = toPositiveNumber(size, -1);

      if (safeSize <= 0) continue;

      const key = getItemKey(safeIndex);
      const oldSize = measuredByKey.get(key);

      if (oldSize === safeSize) continue;

      measuredByKey.set(key, safeSize);
      onMeasure?.(safeIndex, oldSize, safeSize);
      changed = true;
    }

    if (!changed) return;

    if (pendingBuild) return; // microtask already queued — map changes will be included

    pendingBuild = true;
    queueMicrotask(() => {
      pendingBuild = false;
      rebuildOffsets();
      computeVisible();
    });
  }

  function invalidate(): void {
    if (destroyed) return;

    measuredByKey.clear();
    rebuildOffsets();
    computeVisible();
  }

  function refresh(): void {
    if (destroyed) return;

    rebuildOffsets();
    computeVisible();
  }

  function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (destroyed || count <= 0) return;

    const safeIndex = Number.isFinite(index) ? Math.floor(index) : 0;
    const clampedIndex = Math.max(0, Math.min(safeIndex, count - 1));
    const align = options.align ?? 'auto';
    const behavior = options.behavior ?? 'auto';
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

      if (itemStart >= visibleStart && itemEnd <= visibleEnd) return;

      targetOffset = itemStart < visibleStart ? itemStart : itemEnd - viewportSize;
    }

    axis.writeOffset(clampScrollOffset(targetOffset), behavior);
  }

  function scrollToOffset(offset: number, options: { behavior?: ScrollBehavior } = {}): void {
    if (destroyed) return;

    axis.writeOffset(clampScrollOffset(offset), options.behavior ?? 'auto');
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    clearScrollEndTimer();
    detachTarget();
  }

  rebuildOffsets();

  if (options.initialOffset !== undefined) {
    axis.writeOffset(clampScrollOffset(options.initialOffset), 'auto');
  }

  scrollOffset = clampScrollOffset(axis.readOffset());

  const detachTarget = axis.attach(onScroll, onResize);

  computeVisible();

  return {
    get count() {
      return count;
    },
    destroy,
    invalidate,
    get isScrolling() {
      return isScrolling;
    },
    get items() {
      return items;
    },
    measure,
    measureBatch,
    refresh,
    get scrollOffset() {
      return scrollOffset;
    },
    scrollToIndex,
    scrollToOffset,
    [Symbol.dispose]() {
      destroy();
    },
    get totalSize() {
      return totalSize;
    },
    update,
  };
}
