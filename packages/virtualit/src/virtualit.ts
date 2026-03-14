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
  /**
   * Total number of items (signals are NOT required — call `measure()` after
   * you mutate this value on the Virtualizer instance).
   */
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
   * Returns the scroll container element. Called on every measurement cycle.
   * Return `null` when the element is not yet mounted.
   */
  getScrollElement: () => HTMLElement | null;
  /**
   * Called whenever the visible range changes. Trigger your re-render here.
   */
  onChange?: (items: VirtualItem[], totalSize: number) => void;
}

export interface ScrollToIndexOptions {
  /** 'start' | 'end' | 'center' | 'auto'. Defaults to 'auto'. */
  align?: 'start' | 'end' | 'center' | 'auto';
}

// ─── Virtualizer ──────────────────────────────────────────────────────────────

export class Virtualizer {
  // mutable options
  count: number;
  private estimateSize: (index: number) => number;
  private overscan: number;
  private getScrollElement: () => HTMLElement | null;
  private onChange: ((items: VirtualItem[], totalSize: number) => void) | undefined;

  // internal state
  private measuredHeights: Map<number, number> = new Map();
  private virtualItems: VirtualItem[] = [];
  private totalSize = 0;
  private scrollOffsets: number[] = []; // prefix-sum cache
  private containerHeight = 0;
  private scrollTop = 0;

  // cleanup handles
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: (() => void) | null = null;

  constructor(options: VirtualizerOptions) {
    this.count = options.count;

    const est = options.estimateSize ?? 36;

    this.estimateSize = typeof est === 'number' ? () => est : est;
    this.overscan = options.overscan ?? 3;
    this.getScrollElement = options.getScrollElement;
    this.onChange = options.onChange;
    this._buildOffsets();
    this._computeVisible();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Start observing the scroll container. Call after the element is mounted. */
  attach(): void {
    this.detach();

    const el = this.getScrollElement();

    if (!el) return;

    this.scrollHandler = () => {
      this.scrollTop = el.scrollTop;
      this._computeVisible();
    };
    el.addEventListener('scroll', this.scrollHandler, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      this.containerHeight = el.clientHeight;
      this._buildOffsets();
      this._computeVisible();
    });
    this.resizeObserver.observe(el);
    this.containerHeight = el.clientHeight;
    this.scrollTop = el.scrollTop;
    this._buildOffsets();
    this._computeVisible();
  }

  /** Stop observing and remove all listeners. */
  detach(): void {
    const el = this.getScrollElement();

    if (this.scrollHandler && el) {
      el.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Alias for detach, for ergonomics: `const { destroy } = new Virtualizer(…)` */
  destroy(): void {
    this.detach();
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
   * Notify the virtualizer that the item count changed.
   * Call this whenever you update the data array length.
   */
  setCount(count: number): void {
    this.count = count;
    this._buildOffsets();
    this._computeVisible();
  }

  /**
   * Record a measured height for a rendered item (for variable-height lists).
   * Triggers a re-render if anything visible changed.
   */
  measureElement(index: number, height: number): void {
    const prev = this.measuredHeights.get(index);

    if (prev === height) return;

    this.measuredHeights.set(index, height);
    this._buildOffsets();
    this._computeVisible();
  }

  /**
   * Programmatically scroll to a specific index.
   */
  scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    const el = this.getScrollElement();

    if (!el) return;

    const align = options.align ?? 'auto';
    const itemTop = this._offsetAt(index);
    const itemHeight = this._heightAt(index);

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

    el.scrollTop = Math.max(0, targetScrollTop);
  }

  /**
   * Force a full re-measure. Useful after a font-load or layout shift.
   */
  measure(): void {
    this.measuredHeights.clear();
    this._buildOffsets();
    this._computeVisible();
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private _heightAt(index: number): number {
    return this.measuredHeights.get(index) ?? this.estimateSize(index);
  }

  private _offsetAt(index: number): number {
    return this.scrollOffsets[index] ?? 0;
  }

  private _buildOffsets(): void {
    const offsets: number[] = new Array(this.count + 1);

    offsets[0] = 0;
    for (let i = 0; i < this.count; i++) {
      offsets[i + 1] = offsets[i] + this._heightAt(i);
    }
    this.scrollOffsets = offsets;
    this.totalSize = offsets[this.count] ?? 0;
  }

  private _computeVisible(): void {
    const start = this.scrollTop;
    const end = start + this.containerHeight;

    // Binary search for the first visible index
    let lo = 0;
    let hi = this.count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if (this.scrollOffsets[mid + 1] <= start) lo = mid + 1;
      else hi = mid;
    }

    const firstVisible = lo;
    // Linear scan to find last visible
    let lastVisible = firstVisible;

    while (lastVisible < this.count - 1 && this.scrollOffsets[lastVisible + 1] < end) {
      lastVisible++;
    }

    const renderStart = Math.max(0, firstVisible - this.overscan);
    const renderEnd = Math.min(this.count - 1, lastVisible + this.overscan);

    const items: VirtualItem[] = [];

    for (let i = renderStart; i <= renderEnd; i++) {
      items.push({ height: this._heightAt(i), index: i, top: this.scrollOffsets[i] });
    }

    this.virtualItems = items;
    this.onChange?.(items, this.totalSize);
  }
}

// ─── Convenience factory ──────────────────────────────────────────────────────

/**
 * Creates and immediately attaches a `Virtualizer`.
 *
 * @example
 * ```ts
 * import { createVirtualizer } from '@vielzeug/virtualit';
 *
 * const virt = createVirtualizer({
 *   count: items.length,
 *   estimateSize: 36,
 *   getScrollElement: () => scrollContainerEl,
 *   onChange: (virtualItems, totalSize) => {
 *     // update your rendered list
 *   },
 * });
 *
 * // Later:
 * virt.destroy();
 * ```
 */
export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  const v = new Virtualizer(options);

  v.attach();

  return v;
}
