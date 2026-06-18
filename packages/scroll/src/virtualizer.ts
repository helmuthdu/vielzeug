import { createScrollAdapter } from './_adapter';
import { createAxis1D, type VirtualItem } from './axis1d';
import {
  createMeasurementCache,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type MeasurementCache,
  normalizeOverscan,
  type Overscan,
  resolveEstimateFn,
  type ScrollTarget,
  toNonNegativeInt,
  toPositiveNumber,
  type VirtualKey,
} from './utils';

export {
  createMeasurementCache,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  type MeasurementCache,
  type Overscan,
  type ScrollTarget,
  type VirtualItem,
  type VirtualKey,
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /**
   * Called after every render cycle with the new state.
   * **Fixed at construction** — passing `onChange` to `update()` has no effect.
   * To replace the callback, dispose and re-create the virtualizer.
   */
  onChange?: (state: VirtualizerState) => void;
  /**
   * Called when scrolling has settled (no scroll events for `scrollEndDelay` ms,
   * or immediately on the native `scrollend` event when available).
   * Fixed at construction.
   */
  onScrollEnd?: (offset: number) => void;
  /**
   * Called when the scrolling state changes.
   * Fixed at construction.
   */
  onScrollingChange?: (isScrolling: boolean) => void;
  overscan?: Overscan;
  /**
   * Debounce delay (ms) used to detect scroll end when the native `scrollend`
   * event is unavailable. Defaults to 150.
   */
  scrollEndDelay?: number;
  sticky?: (index: number) => boolean;
}

/**
 * Options accepted by `update()`. Explicit interface instead of Omit<...>
 * for better IDE hover and autocomplete (R7).
 *
 * Intentionally excludes: `horizontal` (axis cannot change at runtime),
 * `initialOffset` (one-time bootstrap value), and `onChange` (fixed at
 * construction — see `VirtualizerOptions.onChange`).
 */
export interface VirtualizerUpdateOptions {
  count?: number;
  estimateSize?: number | ((index: number) => number);
  gap?: number;
  getItemKey?: ((index: number) => VirtualKey) | undefined;
  /** Replace the active measurement cache. Existing entries in the new cache are used immediately on the next rebuild. */
  measurementCache?: MeasurementCache;
  overscan?: Overscan;
  sticky?: ((index: number) => boolean) | undefined;
}

export interface ScrollToIndexOptions {
  align?: 'auto' | 'center' | 'end' | 'start';
  behavior?: ScrollBehavior;
  /** Called when the scroll animation completes (instant scrolls: next microtask). */
  onComplete?: () => void;
}

export interface Virtualizer {
  readonly count: number;
  readonly disposed: boolean;
  /** Currently rendered items. Always populated. */
  readonly items: VirtualItem[];
  /** `true` while the user is actively scrolling; `false` once scroll has settled. */
  readonly isScrolling: boolean;
  readonly scrollOffset: number;
  readonly stickyItems: VirtualItem[];
  readonly totalSize: number;
  dispose: () => void;
  invalidate: () => void;
  measure: (index: number, size: number) => void;
  measureBatch: (entries: Array<{ index: number; size: number }>) => void;
  /** Attach a ResizeObserver to `el` and auto-measure `index` on resize. Returns a disconnect fn. */
  measureEl: (index: number, el: HTMLElement) => () => void;
  /** Prepend `additionalCount` items at the top while keeping the viewport visually stable. */
  prepend: (additionalCount: number) => void;
  /** Rebuild the full offset table and re-emit (use when item sizes may have changed). */
  refresh: () => void;
  scrollToBottom: (options?: { behavior?: ScrollBehavior }) => void;
  scrollToIndex: (index: number, options?: ScrollToIndexOptions) => void;
  scrollToOffset: (offset: number, options?: { behavior?: ScrollBehavior }) => void;
  scrollToTop: (options?: { behavior?: ScrollBehavior }) => void;
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

  // Callbacks fixed at construction — not swappable via update().
  const onChange = options.onChange;
  const onScrollEnd = options.onScrollEnd;
  const onScrollingChange = options.onScrollingChange;
  const scrollEndDelay =
    typeof options.scrollEndDelay === 'number' && options.scrollEndDelay >= 0 ? options.scrollEndDelay : 150;

  let isScrolling = false;
  let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;

  // Detect native scrollend support (Chrome 114+, Firefox 109+)
  const hasNativeScrollEnd = 'onscrollend' in (target as EventTarget);

  function notifyScrollEnd(): void {
    if (!isScrolling) return;

    isScrolling = false;
    onScrollingChange?.(false);
    onScrollEnd?.(scrollOffset);
  }

  function handleScrollStart(): void {
    if (!isScrolling) {
      isScrolling = true;
      onScrollingChange?.(true);
    }

    if (!hasNativeScrollEnd) {
      if (scrollEndTimer !== null) clearTimeout(scrollEndTimer);

      scrollEndTimer = setTimeout(notifyScrollEnd, scrollEndDelay);
    }
  }

  // External or internal measurement cache.
  let measuredByKey: MeasurementCache = options.measurementCache ?? new Map();

  let items: VirtualItem[] = [];
  let stickyItems: VirtualItem[] = [];

  // ─── Axis setup ──────────────────────────────────────────────────────────────
  // The axis1d primitive owns offset management. The sizeAt closure captures
  // the live `measuredByKey`, `getItemKey`, and `estimateFn` by reference so
  // updates to those let-variables are picked up automatically.

  const ax = createAxis1D(count, (i) => measuredByKey.get(getItemKey(i)) ?? estimateFn(i), gap);

  // F6: Scroll anchor — prevents viewport jump when items above fold are measured.
  let anchorIndex = -1;
  let anchorDistanceFromTop = 0;

  let scrollOffset = 0;
  let viewportSize = 0;
  let prevScrollOffset = -1; // for sticky dedup
  let destroyed = false;

  // ─── Scroll clamping ─────────────────────────────────────────────────────────

  function clampScrollOffset(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;
    const maxOffset = Math.max(0, ax.totalSize - viewportSize);

    return Math.min(maxOffset, Math.max(0, safe));
  }

  // ─── Sticky items ─────────────────────────────────────────────────────────────

  function computeStickyItems(): VirtualItem[] {
    if (!stickyFn || count === 0 || scrollOffset <= 0) return [];

    let lastAbove = -1;
    let lo = 0;
    let hi = count - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;

      if (ax.startAt(mid) < scrollOffset) {
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

    const activeSize = ax.sizeAt(activeIdx);
    let nextStickyStart = Infinity;

    for (let i = activeIdx + 1; i < count; i++) {
      if (stickyFn(i)) {
        nextStickyStart = ax.startAt(i);
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
      if (ax.prevStart !== -1 || ax.prevTotalSize !== ax.totalSize) {
        // Commit with sentinel renderStart=-1 so prevTotalSize is captured as the
        // current totalSize. Using resetDedup() would set prevTotalSize=-1, causing
        // the guard to fire on every subsequent scroll/resize (Bug 2).
        ax.commitDedup(-1, -1);

        items = [];
        stickyItems = [];

        if (onChange) onChange({ items, stickyItems, totalSize: ax.totalSize });
      }

      return;
    }

    const { renderEnd, renderStart } = ax.computeRange(
      scrollOffset,
      scrollOffset + viewportSize,
      overscan.start,
      overscan.end,
    );

    // Sticky recomputes on every scroll pixel — bypass dedup in that case.
    const stickyScrolled = stickyFn !== null && scrollOffset !== prevScrollOffset;
    const rangeChanged = !ax.isDedupSame(renderStart, renderEnd);

    if (!rangeChanged && !stickyScrolled) return;

    ax.commitDedup(renderStart, renderEnd);
    prevScrollOffset = scrollOffset;

    const nextItems: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      nextItems.push(ax.itemAt(i));
    }

    items = nextItems;
    stickyItems = stickyFn ? computeStickyItems() : [];

    if (onChange) onChange({ items, stickyItems, totalSize: ax.totalSize });
  }

  // ─── Measurement (R6: measure delegates to measureBatch) ─────────────────────

  function recordMeasurement(index: number, size: number): boolean {
    if (!Number.isFinite(index)) return false;

    const i = Math.floor(index);

    if (i < 0 || i >= count) return false;

    const s = toPositiveNumber(size, -1);

    if (s <= 0) return false;

    const key = getItemKey(i);

    if (measuredByKey.get(key) === s) return false;

    measuredByKey.set(key, s);
    ax.markChanged(i);

    return true;
  }

  // F6: Record a scroll anchor before a batch of measurements arrives.
  function recordScrollAnchor(): void {
    if (scrollOffset <= 0 || count === 0) {
      anchorIndex = -1;

      return;
    }

    anchorIndex = ax.findFirst(scrollOffset);
    anchorDistanceFromTop = scrollOffset - ax.startAt(anchorIndex);
  }

  // F6: After rebuild, restore the anchor to prevent viewport jump.
  function restoreScrollAnchor(): void {
    if (anchorIndex < 0) return;

    const expectedOffset = ax.startAt(anchorIndex) + anchorDistanceFromTop;
    const delta = expectedOffset - scrollOffset;

    anchorIndex = -1;

    if (Math.abs(delta) >= 1) {
      const newOffset = clampScrollOffset(scrollOffset + delta);

      domAxis.writeOffset(newOffset, 'auto');
      scrollOffset = newOffset;
    }
  }

  function measureBatch(entries: Array<{ index: number; size: number }>): void {
    if (destroyed) return;

    let changed = false;

    for (const { index, size } of entries) {
      if (recordMeasurement(index, size)) changed = true;
    }

    if (changed) {
      // Record anchor before the first pending build is scheduled (F6).
      if (!ax.pendingBuild) recordScrollAnchor();

      ax.scheduleBuild(() => {
        restoreScrollAnchor();
        computeVisible();
      });
    }
  }

  /** R6: Single-item convenience — delegates to measureBatch. */
  function measure(index: number, size: number): void {
    measureBatch([{ index, size }]);
  }

  /** Attach a ResizeObserver to `el`. Returns a disconnect function. */
  function measureEl(index: number, el: HTMLElement): () => void {
    if (destroyed) return () => {};

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        measure(index, horizontal ? entry.contentRect.width : entry.contentRect.height);
      }
    });

    ro.observe(el);

    return () => ro.disconnect();
  }

  // ─── Option updates ───────────────────────────────────────────────────────────

  function applyOptions(next: VirtualizerUpdateOptions): void {
    let needsRebuild = false;
    let needsCompute = false;

    if (next.count !== undefined) {
      const nextCount = toNonNegativeInt(next.count);

      if (nextCount !== count) {
        count = nextCount;
        ax.setCount(count);
        needsRebuild = true;
      }
    }

    if (Object.hasOwn(next, 'estimateSize')) {
      estimateFn = resolveEstimateFn(next.estimateSize, DEFAULT_ESTIMATE_SIZE);
      measuredByKey.clear();
      needsRebuild = true;
    }

    if (next.gap !== undefined) {
      const nextGap = toNonNegativeInt(next.gap);

      if (nextGap !== gap) {
        gap = nextGap;
        ax.setGap(gap);
        needsRebuild = true;
      }
    }

    if (Object.hasOwn(next, 'getItemKey')) {
      const nextKey = next.getItemKey ?? defaultItemKey;

      if (nextKey !== getItemKey) {
        getItemKey = nextKey;
        measuredByKey.clear();
        needsRebuild = true;
      }
    }

    if (Object.hasOwn(next, 'measurementCache') && next.measurementCache !== undefined) {
      measuredByKey = next.measurementCache;
      needsRebuild = true;
    }

    if (next.overscan !== undefined) {
      const nextOverscan = normalizeOverscan(next.overscan, DEFAULT_OVERSCAN);

      if (nextOverscan.start !== overscan.start || nextOverscan.end !== overscan.end) {
        overscan = nextOverscan;
        needsCompute = true;
      }
    }

    if (Object.hasOwn(next, 'sticky')) {
      const nextStickyFn = next.sticky ?? null;

      if (nextStickyFn !== stickyFn) {
        stickyFn = nextStickyFn;
        ax.resetDedup(); // force re-emit to flush updated stickyItems
      }

      needsCompute = true;
    }

    if (needsRebuild) {
      recordScrollAnchor();
      ax.rebuild(true);
      restoreScrollAnchor();
    }

    if (needsCompute || needsRebuild) computeVisible();
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  function invalidate(): void {
    if (destroyed) return;

    measuredByKey.clear();
    ax.rebuild(true);
    computeVisible();
  }

  /** Full O(n) offset rebuild followed by re-emit. Also used internally for data-only re-emit when sizes unchanged. */
  function refresh(): void {
    if (destroyed) return;

    ax.rebuild(true);
    computeVisible();
  }

  function prepend(additionalCount: number): void {
    if (destroyed) return;

    const n = toNonNegativeInt(additionalCount);

    if (n === 0) return;

    count += n;
    ax.setCount(count);
    ax.rebuild(true);

    // Adjust scroll to keep the same content visible (F6-like stable prepend).
    const prependedHeight = ax.startAt(n);
    const newOffset = clampScrollOffset(scrollOffset + prependedHeight);

    domAxis.writeOffset(newOffset, 'auto');
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
    const itemStart = ax.startAt(clampedIndex);
    const itemSize = ax.sizeAt(clampedIndex);
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
        if (opts.onComplete) queueMicrotask(opts.onComplete);

        return;
      }

      targetOffset = itemStart < visibleStart ? itemStart : itemEnd - viewportSize;
    }

    domAxis.writeOffset(clampScrollOffset(targetOffset), behavior);

    if (opts.onComplete) {
      if (behavior === 'smooth' && 'onscrollend' in target) {
        (target as EventTarget).addEventListener('scrollend', opts.onComplete, { once: true });
      } else {
        queueMicrotask(opts.onComplete);
      }
    }
  }

  function scrollToOffset(offset: number, opts: { behavior?: ScrollBehavior } = {}): void {
    if (destroyed) return;

    domAxis.writeOffset(clampScrollOffset(offset), opts.behavior ?? 'auto');
  }

  function scrollToTop(opts: { behavior?: ScrollBehavior } = {}): void {
    scrollToOffset(0, opts);
  }

  function scrollToBottom(opts: { behavior?: ScrollBehavior } = {}): void {
    scrollToOffset(Math.max(0, ax.totalSize - viewportSize), opts);
  }

  function _dispose(): void {
    if (destroyed) return;

    destroyed = true;

    if (scrollEndTimer !== null) {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
    }

    if (hasNativeScrollEnd) {
      (target as EventTarget).removeEventListener('scrollend', notifyScrollEnd);
    }

    adapter.detach();
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  function handleScroll(): void {
    scrollOffset = clampScrollOffset(domAxis.readOffset());
    handleScrollStart();
    computeVisible();
  }

  function handleResize(): void {
    viewportSize = domAxis.readViewportSize();
    computeVisible();
  }

  const adapter = createScrollAdapter(target, handleScroll, handleResize);
  const domAxis = horizontal ? adapter.x : adapter.y;

  if (hasNativeScrollEnd) {
    (target as EventTarget).addEventListener('scrollend', notifyScrollEnd, { passive: true });
  }

  ax.rebuild(true);

  if (options.initialOffset !== undefined) {
    domAxis.writeOffset(clampScrollOffset(options.initialOffset), 'auto');
  }

  scrollOffset = clampScrollOffset(domAxis.readOffset());
  viewportSize = domAxis.readViewportSize();

  computeVisible();

  return {
    get count() {
      return count;
    },
    dispose: _dispose,
    get disposed() {
      return destroyed;
    },
    invalidate,
    get isScrolling() {
      return isScrolling;
    },
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
    scrollToBottom,
    scrollToIndex,
    scrollToOffset,
    scrollToTop,
    get stickyItems() {
      return stickyItems;
    },
    [Symbol.dispose]: _dispose,
    get totalSize() {
      return ax.totalSize;
    },
    update,
  };
}
