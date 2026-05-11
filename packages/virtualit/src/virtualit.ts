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
  onScrollEnd?: (offset: number) => void;
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  scrollEndDelay?: number;
}

export type VirtualizerUpdateOptions = Partial<VirtualizerOptions>;

export interface ScrollToIndexOptions {
  align?: 'start' | 'end' | 'center' | 'auto';
  behavior?: ScrollBehavior;
}

export interface Virtualizer {
  readonly count: number;
  readonly estimateSize: number | ((index: number) => number);
  readonly isScrolling: boolean;
  readonly items: VirtualItem[];
  readonly scrollOffset: number;
  readonly totalSize: number;
  destroy: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  update: (next: VirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}

export const DEFAULT_ESTIMATE_SIZE = 36;
export const DEFAULT_OVERSCAN = 3;
export const DEFAULT_SCROLL_END_DELAY = 120;

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

function isWindowTarget(target: HTMLElement | Window): target is Window {
  return 'innerHeight' in target && 'innerWidth' in target && !('clientHeight' in target);
}

export function createVirtualizer(target: HTMLElement | Window, options: VirtualizerOptions): Virtualizer {
  const isWindow = isWindowTarget(target);

  let count = toNonNegativeInt(options.count);
  let estimateSize = normalizeEstimate(options.estimateSize);
  let estimateFn = createEstimateFn(estimateSize);
  let gap = toNonNegativeInt(options.gap ?? 0);
  let getItemKey = options.getItemKey ?? ((index: number) => index);
  let horizontal = !!options.horizontal;
  let overscan = normalizeOverscan(options.overscan);
  let scrollEndDelay = toNonNegativeInt(options.scrollEndDelay ?? DEFAULT_SCROLL_END_DELAY, DEFAULT_SCROLL_END_DELAY);
  let onChange = options.onChange;
  let onScrollEnd = options.onScrollEnd;
  let onScrollingChange = options.onScrollingChange;

  let items: VirtualItem[] = [];
  let totalSize = 0;
  let scrollOffset = 0;
  let isScrolling = false;
  const measuredByKey = new Map<VirtualKey, number>();
  let offsets = new Float64Array(count + 1);
  let viewportSize = 0;
  let prevRenderStart = -1;
  let prevRenderEnd = -1;
  let prevTotalSize = -1;
  let pendingBuild = false;
  let destroyed = false;
  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

  let readViewportSize = () => 0;
  let readOffset = () => 0;
  let writeOffset = (_offset: number, _behavior: ScrollBehavior) => {};

  const resizeObserver = !isWindow
    ? new ResizeObserver(() => {
        viewportSize = readViewportSize();
        computeVisible();
      })
    : null;

  function configureAxisIO(): void {
    if (isWindow) {
      readViewportSize = horizontal ? () => target.innerWidth : () => target.innerHeight;
      readOffset = horizontal ? () => target.scrollX : () => target.scrollY;
      writeOffset = (offset, behavior) => {
        const clamped = clampScrollOffset(offset);

        target.scrollTo(horizontal ? { behavior, left: clamped } : { behavior, top: clamped });
      };

      return;
    }

    readViewportSize = horizontal ? () => target.clientWidth : () => target.clientHeight;
    readOffset = horizontal ? () => target.scrollLeft : () => target.scrollTop;
    writeOffset = (offset, behavior) => {
      const clamped = clampScrollOffset(offset);

      target.scrollTo(horizontal ? { behavior, left: clamped } : { behavior, top: clamped });
    };
  }

  function keyAt(index: number): VirtualKey {
    return getItemKey(index);
  }

  function sizeAt(index: number): number {
    return measuredByKey.get(keyAt(index)) ?? estimateFn(index);
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
    scrollOffset = readOffset();
    setScrolling(true);
    scheduleScrollEnd();
    computeVisible();
  }

  function onResize(): void {
    viewportSize = readViewportSize();
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

  function rebuildOffsets(): void {
    prevRenderStart = -1;
    prevRenderEnd = -1;

    const next = new Float64Array(count + 1);

    for (let i = 0; i < count; i++) {
      next[i + 1] = next[i] + sizeAt(i) + (i < count - 1 ? gap : 0);
    }

    offsets = next;
    totalSize = next[count] ?? 0;
  }

  function computeVisible(): void {
    if (destroyed) return;

    if (count === 0 || viewportSize <= 0) {
      const shouldNotify = count > 0 || prevRenderStart !== -1 || prevTotalSize !== totalSize;

      prevRenderStart = -1;
      prevRenderEnd = -1;
      prevTotalSize = totalSize;

      if (shouldNotify) emit([]);

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

    if ('count' in next && next.count !== undefined) {
      const nextCount = toNonNegativeInt(next.count);

      if (nextCount !== count) {
        count = nextCount;
        needsRebuild = true;
      }
    }

    if ('estimateSize' in next && next.estimateSize !== undefined) {
      const normalizedEstimate = normalizeEstimate(next.estimateSize);

      if (normalizedEstimate !== estimateSize) {
        estimateSize = normalizedEstimate;
        estimateFn = createEstimateFn(estimateSize);
        measuredByKey.clear();
        needsRebuild = true;
      }
    }

    if ('gap' in next && next.gap !== undefined) {
      const nextGap = toNonNegativeInt(next.gap);

      if (nextGap !== gap) {
        gap = nextGap;
        needsRebuild = true;
      }
    }

    if ('getItemKey' in next && next.getItemKey) {
      getItemKey = next.getItemKey;
      measuredByKey.clear();
      needsRebuild = true;
    }

    if ('horizontal' in next && next.horizontal !== undefined) {
      const nextHorizontal = !!next.horizontal;

      if (nextHorizontal !== horizontal) {
        horizontal = nextHorizontal;
        configureAxisIO();
        viewportSize = readViewportSize();
        scrollOffset = readOffset();
      }
    }

    if ('overscan' in next) {
      overscan = normalizeOverscan(next.overscan);
    }

    if ('scrollEndDelay' in next && next.scrollEndDelay !== undefined) {
      scrollEndDelay = toNonNegativeInt(next.scrollEndDelay, DEFAULT_SCROLL_END_DELAY);
    }

    if ('onChange' in next) onChange = next.onChange;

    if ('onScrollEnd' in next) onScrollEnd = next.onScrollEnd;

    if ('onScrollingChange' in next) onScrollingChange = next.onScrollingChange;

    if ('initialOffset' in next && next.initialOffset !== undefined) {
      writeOffset(next.initialOffset, 'auto');
      scrollOffset = readOffset();
    }

    if (needsRebuild) rebuildOffsets();

    computeVisible();
  }

  function update(next: VirtualizerUpdateOptions): void {
    if (destroyed) return;

    applyOptions(next);
  }

  function measure(index: number, size: number): void {
    if (destroyed) return;

    const safeIndex = toNonNegativeInt(index, -1);

    if (safeIndex < 0 || safeIndex >= count) return;

    const safeSize = toPositiveNumber(size, -1);

    if (safeSize <= 0) return;

    const key = keyAt(safeIndex);

    if (measuredByKey.get(key) === safeSize) return;

    measuredByKey.set(key, safeSize);

    if (pendingBuild) return;

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

    writeOffset(targetOffset, behavior);
  }

  function scrollToOffset(offset: number, options: { behavior?: ScrollBehavior } = {}): void {
    if (destroyed) return;

    writeOffset(offset, options.behavior ?? 'auto');
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    clearScrollEndTimer();

    if (isWindow) {
      target.removeEventListener('scroll', onScroll);
      target.removeEventListener('resize', onResize);
    } else {
      target.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
    }
  }

  configureAxisIO();
  viewportSize = readViewportSize();
  rebuildOffsets();

  if (isWindow) {
    target.addEventListener('scroll', onScroll, { passive: true });
    target.addEventListener('resize', onResize, { passive: true });
  } else {
    target.addEventListener('scroll', onScroll, { passive: true });
    resizeObserver?.observe(target);
  }

  if (options.initialOffset !== undefined) {
    writeOffset(options.initialOffset, 'auto');
  }

  scrollOffset = readOffset();
  computeVisible();

  return {
    get count() {
      return count;
    },
    destroy,
    get estimateSize() {
      return estimateSize;
    },
    invalidate,
    get isScrolling() {
      return isScrolling;
    },
    get items() {
      return items;
    },
    measure,
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
