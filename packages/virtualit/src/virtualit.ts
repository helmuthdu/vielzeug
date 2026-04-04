/**
 * @vielzeug/virtualit — Lightweight virtual list / infinite-scroll engine.
 *
 * Framework-agnostic: works with any DOM rendering layer.
 * Uses a `ResizeObserver` to re-measure the scroll container and a
 * `scroll` listener to update the visible window.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VirtualItem {
  /** Original item index in the full list */
  index: number;
  /** Pixel offset from the top of the virtual scroll area */
  top: number;
  /** Measured (or estimated) pixel height for this item */
  height: number;
}

export interface VirtualizerOptions {
  /** Total number of items. */
  count: number;
  /**
   * Either a fixed row height or a per-index estimator function.
   * Defaults to 36px.
   */
  estimateSize?: number | ((index: number) => number);
  /**
   * Number of items to render outside the visible viewport on each side.
   * Higher values reduce blank-flash during fast scroll at the cost of more DOM nodes.
   * Defaults to 3.
   */
  overscan?: number;
  /**
   * Called whenever the visible range changes. Trigger your re-render here.
   */
  onChange?: (items: VirtualItem[], totalSize: number) => void;
}

export interface ScrollToIndexOptions {
  /** 'start' | 'end' | 'center' | 'auto'. Defaults to 'auto'. */
  align?: 'start' | 'end' | 'center' | 'auto';
  /** Scroll behaviour. Defaults to 'auto'. */
  behavior?: ScrollBehavior;
}

const DEFAULT_ESTIMATE_SIZE = 36;
const DEFAULT_OVERSCAN = 3;

function toNonNegativeInt(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;

  return Math.max(0, Math.floor(value));
}

function toPositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;

  return value;
}

function createEstimateSizeFn(
  estimate: number | ((index: number) => number),
  fallback = DEFAULT_ESTIMATE_SIZE,
): (index: number) => number {
  if (typeof estimate === 'number') {
    const size = toPositiveNumber(estimate, fallback);

    return () => size;
  }

  return (index: number) => toPositiveNumber(estimate(index), fallback);
}

// ─── Virtualizer ──────────────────────────────────────────────────────────────

export class Virtualizer {
  // mutable options
  private _count: number;
  private _estimateSizeFn: (index: number) => number;
  private overscan: number;
  private onChange: ((items: VirtualItem[], totalSize: number) => void) | undefined;

  // internal state
  private measuredHeights: Map<number, number> = new Map();
  private virtualItems: VirtualItem[] = [];
  private totalSize = 0;
  private scrollOffsets: Float64Array = new Float64Array(0); // prefix-sum cache
  private containerHeight = 0;
  private scrollTop = 0;

  // render range cache — reset in buildOffsets() so layout changes always re-render
  private prevRenderStart = -1;
  private prevRenderEnd = -1;

  // cleanup handles
  private attachedEl: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: (() => void) | null = null;

  // batching flag for measureElement
  private pendingBuild = false;

  constructor(options: VirtualizerOptions) {
    this._count = toNonNegativeInt(options.count);

    const est = options.estimateSize ?? DEFAULT_ESTIMATE_SIZE;

    this._estimateSizeFn = createEstimateSizeFn(est);
    this.overscan = toNonNegativeInt(options.overscan ?? DEFAULT_OVERSCAN, DEFAULT_OVERSCAN);
    this.onChange = options.onChange;
    // Build the offset table eagerly; computeVisible is deferred to attach()
    // so the first onChange call always has a real containerHeight.
    this.buildOffsets();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  get count(): number {
    return this._count;
  }

  /** Setting count automatically rebuilds offsets and triggers a re-render. */
  set count(value: number) {
    const nextCount = toNonNegativeInt(value);

    if (nextCount === this._count) return;

    this._count = nextCount;
    this.buildOffsets();

    if (this.attachedEl) this.computeVisible();
  }

  /**
   * Update the size estimator. Clears all measured heights and re-renders.
   * Useful when switching between row density modes (e.g. compact ↔ comfortable).
   */
  set estimateSize(fn: number | ((index: number) => number)) {
    this._estimateSizeFn = createEstimateSizeFn(fn);
    this.measuredHeights.clear();
    this.buildOffsets();

    if (this.attachedEl) this.computeVisible();
  }

  /** Start observing the scroll container. */
  attach(el: HTMLElement): void {
    this.teardown();

    this.attachedEl = el;
    this.containerHeight = el.clientHeight;
    this.scrollTop = el.scrollTop;

    this.scrollHandler = () => {
      this.scrollTop = el.scrollTop;
      this.computeVisible();
    };
    el.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      this.containerHeight = el.clientHeight;
      // The offset table depends only on item heights, not container height —
      // no need to rebuild it here, only recompute the visible window.
      this.computeVisible();
    });
    this.resizeObserver.observe(el);

    this.computeVisible();
  }

  /** Stop observing and remove all listeners. */
  destroy(): void {
    this.teardown();
  }

  /** Supports the Explicit Resource Management `using` keyword. */
  [Symbol.dispose](): void {
    this.destroy();
  }

  /** Returns the currently visible virtual items. */
  getVirtualItems(): VirtualItem[] {
    return this.virtualItems;
  }

  /** Total pixel height of the entire list (set as the spacer height). */
  getTotalSize(): number {
    return this.totalSize;
  }

  /**
   * Record a measured height for a rendered item (for variable-height lists).
   *
   * Measurements are batched via microtask — safe to call for every item in a
   * render loop without incurring O(n²) rebuilds.
   */
  measureElement(index: number, height: number): void {
    const safeIndex = toNonNegativeInt(index, -1);
    const safeHeight = toPositiveNumber(height, -1);

    if (safeIndex < 0 || safeIndex >= this._count || safeHeight <= 0) return;

    if (this.heightAt(safeIndex) === safeHeight) return;

    this.measuredHeights.set(safeIndex, safeHeight);

    if (!this.pendingBuild) {
      this.pendingBuild = true;
      queueMicrotask(() => {
        this.pendingBuild = false;
        this.buildOffsets();

        if (this.attachedEl) this.computeVisible();
      });
    }
  }

  /** Programmatically scroll to a specific index. */
  scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    const el = this.attachedEl;

    if (!el || this._count <= 0) return;

    const safeIndex = Number.isFinite(index) ? Math.floor(index) : 0;
    const clampedIndex = Math.max(0, Math.min(safeIndex, this._count - 1));
    const align = options.align ?? 'auto';
    const behavior = options.behavior ?? 'auto';
    const itemTop = this.offsetAt(clampedIndex);
    const itemHeight = this.heightAt(clampedIndex);

    let targetScrollTop: number;

    if (align === 'start') {
      targetScrollTop = itemTop;
    } else if (align === 'end') {
      targetScrollTop = itemTop + itemHeight - this.containerHeight;
    } else if (align === 'center') {
      targetScrollTop = itemTop - (this.containerHeight - itemHeight) / 2;
    } else {
      // auto: scroll only if not already visible
      const visibleStart = el.scrollTop;
      const visibleEnd = visibleStart + this.containerHeight;

      if (itemTop >= visibleStart && itemTop + itemHeight <= visibleEnd) return;

      targetScrollTop = itemTop < visibleStart ? itemTop : itemTop + itemHeight - this.containerHeight;
    }

    el.scrollTo({ behavior, top: this.clampScrollTop(targetScrollTop) });
  }

  /** Programmatically scroll to a specific pixel offset. */
  scrollToOffset(offset: number, options: { behavior?: ScrollBehavior } = {}): void {
    this.attachedEl?.scrollTo({
      behavior: options.behavior ?? 'auto',
      top: this.clampScrollTop(offset),
    });
  }

  /**
   * Invalidate all item measurements. Call after a font load or layout shift
   * that changes item heights.
   */
  invalidate(): void {
    this.measuredHeights.clear();
    this.buildOffsets();

    if (this.attachedEl) this.computeVisible();
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private teardown(): void {
    if (this.scrollHandler && this.attachedEl) {
      this.attachedEl.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.attachedEl = null;
  }

  private heightAt(index: number): number {
    return this.measuredHeights.get(index) ?? this._estimateSizeFn(index);
  }

  private offsetAt(index: number): number {
    return this.scrollOffsets[index] ?? 0;
  }

  private clampScrollTop(offset: number): number {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const maxOffset = Math.max(0, this.totalSize - this.containerHeight);

    return Math.min(maxOffset, Math.max(0, safeOffset));
  }

  private buildOffsets(): void {
    // Invalidate the render range cache: item positions may shift even when the
    // visible index range stays the same (e.g. an item above grew taller).
    this.prevRenderStart = -1;
    this.prevRenderEnd = -1;

    const offsets = new Float64Array(this._count + 1);

    offsets[0] = 0;
    for (let i = 0; i < this._count; i++) {
      offsets[i + 1] = offsets[i] + this.heightAt(i);
    }
    this.scrollOffsets = offsets;
    this.totalSize = offsets[this._count] ?? 0;
  }

  private computeVisible(): void {
    const start = this.scrollTop;
    const end = start + this.containerHeight;

    // Binary search for the first visible index
    let lo = 0;
    let hi = this._count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (this.scrollOffsets[mid + 1] <= start) lo = mid + 1;
      else hi = mid;
    }

    const firstVisible = lo;

    // Binary search for the last visible index
    let lo2 = firstVisible;
    let hi2 = this._count - 1;

    while (lo2 < hi2) {
      const mid = (lo2 + hi2 + 1) >> 1;

      if (this.scrollOffsets[mid] < end) lo2 = mid;
      else hi2 = mid - 1;
    }

    const lastVisible = lo2;
    const renderStart = Math.max(0, firstVisible - this.overscan);
    const renderEnd = Math.min(this._count - 1, lastVisible + this.overscan);

    // Skip re-render when the range is unchanged (e.g. a sub-pixel scroll that
    // doesn't cross an item boundary). The cache is reset in buildOffsets() so
    // any layout change always produces at least one render.
    if (renderStart === this.prevRenderStart && renderEnd === this.prevRenderEnd) return;

    this.prevRenderStart = renderStart;
    this.prevRenderEnd = renderEnd;

    const items: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      items.push({ height: this.heightAt(i), index: i, top: this.scrollOffsets[i] });
    }

    this.virtualItems = items;
    this.onChange?.(items, this.totalSize);
  }
}

// ─── Convenience factory ──────────────────────────────────────────────────────

/**
 * Creates and immediately attaches a `Virtualizer` to the given scroll container.
 *
 * @example
 * ```ts
 * import { createVirtualizer } from '@vielzeug/virtualit';
 *
 * const virt = createVirtualizer(scrollContainerEl, {
 *   count: items.length,
 *   estimateSize: 36,
 *   onChange: (virtualItems, totalSize) => {
 *     // update your rendered list
 *   },
 * });
 *
 * // Later:
 * virt.destroy();
 *
 * // Or, with the Explicit Resource Management proposal:
 * {
 *   using virt = createVirtualizer(scrollContainerEl, { ... });
 * } // virt.destroy() called automatically
 * ```
 */
export function createVirtualizer(el: HTMLElement, options: VirtualizerOptions): Virtualizer {
  const v = new Virtualizer(options);

  v.attach(el);

  return v;
}
