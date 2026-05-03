export interface VirtualItem {
  height: number;
  index: number;
  top: number;
}

export interface VirtualizerOptions {
  count: number;
  estimateSize?: number | ((index: number) => number);
  onChange?: (items: VirtualItem[], totalSize: number) => void;
  overscan?: number;
}

export type VirtualizerUpdateOptions = Partial<VirtualizerOptions>;

export interface ScrollToIndexOptions {
  align?: 'start' | 'end' | 'center' | 'auto';
  behavior?: ScrollBehavior;
}

export interface Virtualizer {
  readonly count: number;
  readonly estimateSize: number | ((index: number) => number);
  readonly items: VirtualItem[];
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

export function createVirtualizer(el: HTMLElement, options: VirtualizerOptions): Virtualizer {
  let count = toNonNegativeInt(options.count);
  let estimateSize = normalizeEstimate(options.estimateSize);
  let estimateFn = createEstimateFn(estimateSize);
  let overscan = toNonNegativeInt(options.overscan ?? DEFAULT_OVERSCAN);
  let onChange = options.onChange;

  let items: VirtualItem[] = [];
  let totalSize = 0;
  let measuredSizes = new Float64Array(count);
  let offsets = new Float64Array(count + 1);
  let containerHeight = el.clientHeight;
  let scrollTop = el.scrollTop;
  let prevRenderStart = -1;
  let prevRenderEnd = -1;
  let pendingBuild = false;
  let destroyed = false;

  const scrollHandler = () => {
    scrollTop = el.scrollTop;
    computeVisible();
  };

  const resizeObserver = new ResizeObserver(() => {
    containerHeight = el.clientHeight;
    computeVisible();
  });

  function sizeAt(index: number): number {
    const measured = measuredSizes[index] ?? 0;

    return measured > 0 ? measured : estimateFn(index);
  }

  function offsetAt(index: number): number {
    return offsets[index] ?? 0;
  }

  function clampScrollTop(offset: number): number {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const maxOffset = Math.max(0, totalSize - containerHeight);

    return Math.min(maxOffset, Math.max(0, safeOffset));
  }

  function findFirstVisible(start: number): number {
    let lo = 0;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (offsets[mid + 1] <= start) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  function findLastVisible(end: number, firstVisible: number): number {
    let lo = firstVisible;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (offsets[mid] < end) lo = mid;
      else hi = mid - 1;
    }

    return lo;
  }

  function emit(nextItems: VirtualItem[], nextTotalSize: number): void {
    items = nextItems;
    onChange?.(nextItems, nextTotalSize);
  }

  function rebuildOffsets(): void {
    prevRenderStart = -1;
    prevRenderEnd = -1;

    const nextOffsets = new Float64Array(count + 1);

    for (let i = 0; i < count; i++) {
      nextOffsets[i + 1] = nextOffsets[i] + sizeAt(i);
    }

    offsets = nextOffsets;
    totalSize = nextOffsets[count] ?? 0;
  }

  function computeVisible(): void {
    if (destroyed) return;

    if (count === 0 || containerHeight <= 0) {
      const shouldNotify = count > 0 || prevRenderStart !== -1;

      prevRenderStart = -1;
      prevRenderEnd = -1;

      if (shouldNotify) emit([], totalSize);

      return;
    }

    const start = scrollTop;
    const end = start + containerHeight;
    const firstVisible = findFirstVisible(start);
    const lastVisible = findLastVisible(end, firstVisible);
    const renderStart = Math.max(0, firstVisible - overscan);
    const renderEnd = Math.min(count - 1, lastVisible + overscan);

    if (renderStart === prevRenderStart && renderEnd === prevRenderEnd) return;

    prevRenderStart = renderStart;
    prevRenderEnd = renderEnd;

    const nextItems: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      nextItems.push({ height: sizeAt(i), index: i, top: offsetAt(i) });
    }

    emit(nextItems, totalSize);
  }

  function update(next: VirtualizerUpdateOptions): void {
    if (destroyed) return;

    let needsRebuild = false;

    if (next.count !== undefined) {
      const nextCount = toNonNegativeInt(next.count);

      if (nextCount !== count) {
        const nextMeasured = new Float64Array(nextCount);

        nextMeasured.set(measuredSizes.subarray(0, Math.min(count, nextCount)));
        measuredSizes = nextMeasured;
        count = nextCount;
        needsRebuild = true;
      }
    }

    if (next.estimateSize !== undefined) {
      estimateSize = normalizeEstimate(next.estimateSize);
      estimateFn = createEstimateFn(estimateSize);
      measuredSizes = new Float64Array(count);
      needsRebuild = true;
    }

    if (next.overscan !== undefined) {
      overscan = toNonNegativeInt(next.overscan);
    }

    if ('onChange' in next) {
      onChange = next.onChange;
    }

    if (needsRebuild) rebuildOffsets();

    computeVisible();
  }

  function measure(index: number, size: number): void {
    if (destroyed) return;

    const safeIndex = toNonNegativeInt(index, -1);
    const safeSize = toPositiveNumber(size, -1);

    if (safeIndex < 0 || safeIndex >= count || safeSize <= 0) return;

    if (sizeAt(safeIndex) === safeSize) return;

    measuredSizes[safeIndex] = safeSize;

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

    measuredSizes = new Float64Array(count);
    rebuildOffsets();
    computeVisible();
  }

  function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (destroyed || count <= 0) return;

    const safeIndex = Number.isFinite(index) ? Math.floor(index) : 0;
    const clampedIndex = Math.max(0, Math.min(safeIndex, count - 1));
    const align = options.align ?? 'auto';
    const behavior = options.behavior ?? 'auto';
    const itemTop = offsetAt(clampedIndex);
    const itemHeight = sizeAt(clampedIndex);

    let targetScrollTop: number;

    if (align === 'start') {
      targetScrollTop = itemTop;
    } else if (align === 'end') {
      targetScrollTop = itemTop + itemHeight - containerHeight;
    } else if (align === 'center') {
      targetScrollTop = itemTop - (containerHeight - itemHeight) / 2;
    } else {
      const visibleStart = el.scrollTop;
      const visibleEnd = visibleStart + containerHeight;

      if (itemTop >= visibleStart && itemTop + itemHeight <= visibleEnd) return;

      targetScrollTop = itemTop < visibleStart ? itemTop : itemTop + itemHeight - containerHeight;
    }

    el.scrollTo({ behavior, top: clampScrollTop(targetScrollTop) });
  }

  function scrollToOffset(offset: number, options: { behavior?: ScrollBehavior } = {}): void {
    if (destroyed) return;

    el.scrollTo({
      behavior: options.behavior ?? 'auto',
      top: clampScrollTop(offset),
    });
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    el.removeEventListener('scroll', scrollHandler);
    resizeObserver.disconnect();
  }

  rebuildOffsets();
  el.addEventListener('scroll', scrollHandler, { passive: true });
  resizeObserver.observe(el);
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
    get items() {
      return items;
    },
    measure,
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
