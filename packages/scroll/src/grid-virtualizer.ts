import { createScrollAdapter } from './_adapter';
import { createAxis1D, type VirtualItem } from './_axis1d';
import {
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  normalizeOverscan,
  observeResize,
  type Overscan,
  resolveEstimateFn,
  type ScrollTarget,
  toNonNegativeInt,
  toPositiveNumber,
} from './_utils';

export { type VirtualItem };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GridVirtualizerState {
  /**
   * Visible column descriptors.
   * Callers form the cross-product `rows × cols` as needed — no O(r×c) Cell
   * allocation per scroll tick (R8).
   */
  readonly cols: VirtualItem[];
  /** Visible row descriptors. */
  readonly rows: VirtualItem[];
  readonly totalHeight: number;
  readonly totalWidth: number;
}

export interface GridRangeChangeEvent {
  firstCol: number;
  firstRow: number;
  lastCol: number;
  lastRow: number;
}

export interface ScrollToCellOptions {
  behavior?: ScrollBehavior;
  colAlign?: 'auto' | 'center' | 'end' | 'start';
  rowAlign?: 'auto' | 'center' | 'end' | 'start';
}

export interface GridVirtualizerOptions {
  colCount: number;
  /** External measurement cache for columns. Share across instances for scroll restoration. */
  colMeasurementCache?: Map<number, number>;
  colGap?: number;
  estimateColSize?: number | ((col: number) => number);
  estimateRowSize?: number | ((row: number) => number);
  initialScrollLeft?: number;
  initialScrollTop?: number;
  /**
   * Called after every render cycle with the new state.
   * **Fixed at construction** \u2014 cannot be changed after creation.
   */
  onChange?: (state: GridVirtualizerState) => void;
  /** Zero-allocation alternative to onChange for range-based consumers. */
  onRangeChange?: (range: GridRangeChangeEvent) => void;
  overscanX?: Overscan;
  overscanY?: Overscan;
  rowCount: number;
  /** External measurement cache for rows. Share across instances for scroll restoration. */
  rowMeasurementCache?: Map<number, number>;
  rowGap?: number;
}

/**
 * Options accepted by `update()`. Explicit interface instead of
 * `Partial<Omit<...>>` for better IDE hover (R7).
 */
export interface GridVirtualizerUpdateOptions {
  colCount?: number;
  colGap?: number;
  estimateColSize?: number | ((col: number) => number);
  estimateRowSize?: number | ((row: number) => number);
  overscanX?: Overscan;
  overscanY?: Overscan;
  rowCount?: number;
  rowGap?: number;
}

export interface GridVirtualizer {
  readonly cols: VirtualItem[];
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly rows: VirtualItem[];
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly totalHeight: number;
  readonly totalWidth: number;
  dispose: () => void;
  invalidate: () => void;
  /** Measure rows and columns in a single coordinated rebuild pass (R4). */
  measureBatch: (rows: Array<{ index: number; size: number }>, cols: Array<{ index: number; size: number }>) => void;
  /** Attach a ResizeObserver to `el` to auto-measure the column width on resize. Returns disconnect fn. */
  measureColEl: (col: number, el: HTMLElement) => () => void;
  measureColumn: (col: number, size: number) => void;
  measureRow: (row: number, size: number) => void;
  /** Attach a ResizeObserver to `el` to auto-measure the row height on resize. Returns disconnect fn. */
  measureRowEl: (row: number, el: HTMLElement) => () => void;
  /** Prepend `additionalRowCount` rows at the top while keeping the viewport visually stable. */
  prependRows: (additionalRowCount: number) => void;
  refresh: () => void;
  scrollToCell: (row: number, col: number, options?: ScrollToCellOptions) => void;
  /** Scroll to bring a row into view without changing the horizontal position. */
  scrollToColumn: (col: number, options?: Pick<ScrollToCellOptions, 'behavior' | 'colAlign'>) => void;
  /** Scroll to bring a column into view without changing the vertical position. */
  scrollToRow: (row: number, options?: Pick<ScrollToCellOptions, 'behavior' | 'rowAlign'>) => void;
  update: (next: GridVirtualizerUpdateOptions) => void;
  [Symbol.dispose]: () => void;
}

// ─── Align helper ─────────────────────────────────────────────────────────────

function alignOffset(
  itemStart: number,
  itemEnd: number,
  itemSize: number,
  currentOffset: number,
  viewportSize: number,
  align: 'auto' | 'center' | 'end' | 'start',
): number | null {
  if (align === 'start') return itemStart;

  if (align === 'end') return itemEnd - viewportSize;

  if (align === 'center') return itemStart - (viewportSize - itemSize) / 2;

  // auto: no-op when already fully visible
  if (itemStart >= currentOffset && itemEnd <= currentOffset + viewportSize) return null;

  return itemStart < currentOffset ? itemStart : itemEnd - viewportSize;
}

// ─── Implementation ────────────────────────────────────────────────────────────

export function createGridVirtualizer(target: ScrollTarget, options: GridVirtualizerOptions): GridVirtualizer {
  let rowCount = toNonNegativeInt(options.rowCount);
  let colCount = toNonNegativeInt(options.colCount);
  let estimateRowFn = resolveEstimateFn(options.estimateRowSize, DEFAULT_ESTIMATE_SIZE);
  let estimateColFn = resolveEstimateFn(options.estimateColSize, DEFAULT_ESTIMATE_SIZE);
  let overscanY = normalizeOverscan(options.overscanY, DEFAULT_OVERSCAN);
  let overscanX = normalizeOverscan(options.overscanX, DEFAULT_OVERSCAN);

  // Callbacks fixed at construction.
  const onChange = options.onChange;
  const onRangeChange = options.onRangeChange;

  // External or internal measurement caches (numeric row/col index keys).
  const measuredRows: Map<number, number> = options.rowMeasurementCache ?? new Map();
  const measuredCols: Map<number, number> = options.colMeasurementCache ?? new Map();

  let scrollTop = 0;
  let scrollLeft = 0;
  let viewportHeight = 0;
  let viewportWidth = 0;
  let rows: VirtualItem[] = [];
  let cols: VirtualItem[] = [];
  let disposed = false;

  // ─── Axis1D instances (R1) ─────────────────────────────────────────────────
  // sizeAt closures capture live `measuredRows/Cols` and `estimateFn` vars.

  const rowAx = createAxis1D(
    rowCount,
    (r) => measuredRows.get(r) ?? estimateRowFn(r),
    toNonNegativeInt(options.rowGap ?? 0),
  );

  const colAx = createAxis1D(
    colCount,
    (c) => measuredCols.get(c) ?? estimateColFn(c),
    toNonNegativeInt(options.colGap ?? 0),
  );

  // R4: Single coordinated flush flag — prevents two separate microtasks.
  let pendingBatchBuild = false;

  // ─── Clamping ──────────────────────────────────────────────────────────────

  function clampTop(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;

    return Math.min(Math.max(0, rowAx.totalSize - viewportHeight), Math.max(0, safe));
  }

  function clampLeft(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;

    return Math.min(Math.max(0, colAx.totalSize - viewportWidth), Math.max(0, safe));
  }

  // ─── Compute and emit ──────────────────────────────────────────────────────

  function computeVisible(): void {
    if (disposed) return;

    const totalHeight = rowAx.totalSize;
    const totalWidth = colAx.totalSize;

    if (rowCount === 0 || colCount === 0 || viewportHeight <= 0 || viewportWidth <= 0) {
      const wasEmpty =
        rowAx.prevStart === -1 && rowAx.prevTotalSize === totalHeight && colAx.prevTotalSize === totalWidth;

      if (!wasEmpty) {
        // commitDedup(-1, -1) captures the current totalSize so the guard doesn't
        // fire on every subsequent event while the empty state persists (Bug 2).
        rowAx.commitDedup(-1, -1);
        colAx.commitDedup(-1, -1);
        rows = [];
        cols = [];
        onChange?.({ cols: [], rows: [], totalHeight, totalWidth });
      }

      return;
    }

    const { renderEnd: renderLastRow, renderStart: renderFirstRow } = rowAx.computeRange(
      scrollTop,
      scrollTop + viewportHeight,
      overscanY.start,
      overscanY.end,
    );

    const { renderEnd: renderLastCol, renderStart: renderFirstCol } = colAx.computeRange(
      scrollLeft,
      scrollLeft + viewportWidth,
      overscanX.start,
      overscanX.end,
    );

    const rowSame = rowAx.isDedupSame(renderFirstRow, renderLastRow);
    const colSame = colAx.isDedupSame(renderFirstCol, renderLastCol);

    if (rowSame && colSame) return;

    rowAx.commitDedup(renderFirstRow, renderLastRow);
    colAx.commitDedup(renderFirstCol, renderLastCol);

    const rangeChanged = !rowSame || !colSame;

    if (rangeChanged && onRangeChange) {
      onRangeChange({
        firstCol: renderFirstCol,
        firstRow: renderFirstRow,
        lastCol: renderLastCol,
        lastRow: renderLastRow,
      });
    }

    // R8: Build rows[] and cols[] separately — no cross-product VirtualCell[].
    const nextRows: VirtualItem[] = [];

    for (let r = renderFirstRow; r <= renderLastRow; r++) {
      nextRows.push(rowAx.itemAt(r));
    }

    const nextCols: VirtualItem[] = [];

    for (let c = renderFirstCol; c <= renderLastCol; c++) {
      nextCols.push(colAx.itemAt(c));
    }

    rows = nextRows;
    cols = nextCols;

    onChange?.({ cols, rows, totalHeight, totalWidth });
  }

  // ─── Measurement helpers ───────────────────────────────────────────────────

  function recordRowMeasurement(row: number, size: number): boolean {
    if (!Number.isFinite(row)) return false;

    const r = Math.floor(row);

    if (r < 0 || r >= rowCount) return false;

    const s = toPositiveNumber(size, -1);

    if (s <= 0) return false;

    if (measuredRows.get(r) === s) return false;

    measuredRows.set(r, s);
    rowAx.markChanged(r);

    return true;
  }

  function recordColMeasurement(col: number, size: number): boolean {
    if (!Number.isFinite(col)) return false;

    const c = Math.floor(col);

    if (c < 0 || c >= colCount) return false;

    const s = toPositiveNumber(size, -1);

    if (s <= 0) return false;

    if (measuredCols.get(c) === s) return false;

    measuredCols.set(c, s);
    colAx.markChanged(c);

    return true;
  }

  /**
   * R4: Single coordinated flush for both axes.
   * Replaces the previous two independent microtask schedules.
   */
  function scheduleFlush(): void {
    if (pendingBatchBuild) return;

    pendingBatchBuild = true;
    queueMicrotask(() => {
      pendingBatchBuild = false;

      // consumeMinChangedIndex() atomically reads and resets minChangedIndex.
      // Without the reset, every subsequent flush would rebuild from index 0
      // instead of the actual earliest changed index (Bug 3).
      const fromRow = rowAx.consumeMinChangedIndex();

      if (fromRow !== Infinity) rowAx.rebuildFrom(fromRow);

      const fromCol = colAx.consumeMinChangedIndex();

      if (fromCol !== Infinity) colAx.rebuildFrom(fromCol);

      computeVisible();
    });
  }

  // ─── Public measurement API ────────────────────────────────────────────────

  function measureRow(row: number, size: number): void {
    if (disposed) return;

    if (recordRowMeasurement(row, size)) scheduleFlush();
  }

  function measureColumn(col: number, size: number): void {
    if (disposed) return;

    if (recordColMeasurement(col, size)) scheduleFlush();
  }

  /** Measure rows and columns in a single coordinated rebuild pass (R4). */
  function measureBatch(
    rowEntries: Array<{ index: number; size: number }>,
    colEntries: Array<{ index: number; size: number }>,
  ): void {
    if (disposed) return;

    let changed = false;

    for (const { index, size } of rowEntries) {
      if (recordRowMeasurement(index, size)) changed = true;
    }

    for (const { index, size } of colEntries) {
      if (recordColMeasurement(index, size)) changed = true;
    }

    if (changed) scheduleFlush();
  }

  function measureRowEl(row: number, el: HTMLElement): () => void {
    if (disposed) return () => {};

    return observeResize(ac.signal, el, (entry) => measureRow(row, entry.contentRect.height));
  }

  function measureColEl(col: number, el: HTMLElement): () => void {
    if (disposed) return () => {};

    return observeResize(ac.signal, el, (entry) => measureColumn(col, entry.contentRect.width));
  }

  function invalidate(): void {
    if (disposed) return;

    measuredRows.clear();
    measuredCols.clear();
    rowAx.rebuild(true);
    colAx.rebuild(true);
    computeVisible();
  }

  function refresh(): void {
    if (disposed) return;

    rowAx.rebuild(true);
    colAx.rebuild(true);
    computeVisible();
  }

  function prependRows(additionalRowCount: number): void {
    if (disposed) return;

    const n = toNonNegativeInt(additionalRowCount);

    if (n === 0) return;

    rowCount += n;
    rowAx.setCount(rowCount);
    rowAx.rebuild(true);

    const prependedHeight = rowAx.startAt(n);
    const newScrollTop = clampTop(scrollTop + prependedHeight);

    adapter.scrollTo(scrollLeft, newScrollTop, 'auto');
    scrollTop = newScrollTop;

    computeVisible();
  }

  function scrollToRow(row: number, opts: Pick<ScrollToCellOptions, 'behavior' | 'rowAlign'> = {}): void {
    if (disposed || rowCount === 0) return;

    const safeRow = Math.max(0, Math.min(Math.floor(Number.isFinite(row) ? row : 0), rowCount - 1));
    const behavior = opts.behavior ?? 'auto';
    const rowStart = rowAx.startAt(safeRow);
    const rowSize = rowAx.sizeAt(safeRow);
    const targetTop = alignOffset(
      rowStart,
      rowStart + rowSize,
      rowSize,
      scrollTop,
      viewportHeight,
      opts.rowAlign ?? 'auto',
    );

    if (targetTop === null) return;

    adapter.scrollTo(scrollLeft, clampTop(targetTop), behavior);
  }

  function scrollToColumn(col: number, opts: Pick<ScrollToCellOptions, 'behavior' | 'colAlign'> = {}): void {
    if (disposed || colCount === 0) return;

    const safeCol = Math.max(0, Math.min(Math.floor(Number.isFinite(col) ? col : 0), colCount - 1));
    const behavior = opts.behavior ?? 'auto';
    const colStart = colAx.startAt(safeCol);
    const colSize = colAx.sizeAt(safeCol);
    const targetLeft = alignOffset(
      colStart,
      colStart + colSize,
      colSize,
      scrollLeft,
      viewportWidth,
      opts.colAlign ?? 'auto',
    );

    if (targetLeft === null) return;

    adapter.scrollTo(clampLeft(targetLeft), scrollTop, behavior);
  }

  function scrollToCell(row: number, col: number, opts: ScrollToCellOptions = {}): void {
    if (disposed || rowCount === 0 || colCount === 0) return;

    const safeRow = Math.max(0, Math.min(Math.floor(Number.isFinite(row) ? row : 0), rowCount - 1));
    const safeCol = Math.max(0, Math.min(Math.floor(Number.isFinite(col) ? col : 0), colCount - 1));
    const behavior = opts.behavior ?? 'auto';

    const rowStart = rowAx.startAt(safeRow);
    const rowSize = rowAx.sizeAt(safeRow);
    const colStart = colAx.startAt(safeCol);
    const colSize = colAx.sizeAt(safeCol);

    const targetTop = alignOffset(
      rowStart,
      rowStart + rowSize,
      rowSize,
      scrollTop,
      viewportHeight,
      opts.rowAlign ?? 'auto',
    );
    const targetLeft = alignOffset(
      colStart,
      colStart + colSize,
      colSize,
      scrollLeft,
      viewportWidth,
      opts.colAlign ?? 'auto',
    );

    if (targetTop === null && targetLeft === null) return;

    adapter.scrollTo(
      targetLeft !== null ? clampLeft(targetLeft) : scrollLeft,
      targetTop !== null ? clampTop(targetTop) : scrollTop,
      behavior,
    );
  }

  function update(next: GridVirtualizerUpdateOptions): void {
    if (disposed) return;

    let rebuildRows = false;
    let rebuildCols = false;
    let needsCompute = false;

    if (next.rowCount !== undefined) {
      const n = toNonNegativeInt(next.rowCount);

      if (n !== rowCount) {
        rowCount = n;
        rowAx.setCount(rowCount);
        rebuildRows = true;
      }
    }

    if (next.colCount !== undefined) {
      const n = toNonNegativeInt(next.colCount);

      if (n !== colCount) {
        colCount = n;
        colAx.setCount(colCount);
        rebuildCols = true;
      }
    }

    if (next.rowGap !== undefined) {
      const n = toNonNegativeInt(next.rowGap);

      if (n !== rowAx.gap) {
        rowAx.setGap(n);
        rebuildRows = true;
      }
    }

    if (next.colGap !== undefined) {
      const n = toNonNegativeInt(next.colGap);

      if (n !== colAx.gap) {
        colAx.setGap(n);
        rebuildCols = true;
      }
    }

    if ('estimateRowSize' in next) {
      estimateRowFn = resolveEstimateFn(next.estimateRowSize, DEFAULT_ESTIMATE_SIZE);
      measuredRows.clear();
      rebuildRows = true;
    }

    if ('estimateColSize' in next) {
      estimateColFn = resolveEstimateFn(next.estimateColSize, DEFAULT_ESTIMATE_SIZE);
      measuredCols.clear();
      rebuildCols = true;
    }

    if (next.overscanY !== undefined) {
      const n = normalizeOverscan(next.overscanY, DEFAULT_OVERSCAN);

      if (n.start !== overscanY.start || n.end !== overscanY.end) {
        overscanY = n;
        needsCompute = true;
      }
    }

    if (next.overscanX !== undefined) {
      const n = normalizeOverscan(next.overscanX, DEFAULT_OVERSCAN);

      if (n.start !== overscanX.start || n.end !== overscanX.end) {
        overscanX = n;
        needsCompute = true;
      }
    }

    if (rebuildRows) rowAx.rebuild(true);

    if (rebuildCols) colAx.rebuild(true);

    if (rebuildRows || rebuildCols || needsCompute) computeVisible();
  }

  const ac = new AbortController();

  function disposeImpl(): void {
    if (disposed) return;

    disposed = true;
    ac.abort();
    adapter.detach();
  }

  // ─── Bootstrap (R9: read viewport BEFORE writing initial scroll) ───────────

  function handleScroll(): void {
    scrollTop = clampTop(adapter.y.readOffset());
    scrollLeft = clampLeft(adapter.x.readOffset());
    computeVisible();
  }

  function handleResize(): void {
    viewportHeight = adapter.y.readViewportSize();
    viewportWidth = adapter.x.readViewportSize();
    computeVisible();
  }

  const adapter = createScrollAdapter(target, handleScroll, handleResize);

  rowAx.rebuild(true);
  colAx.rebuild(true);

  // R9: Read viewport dimensions BEFORE writing initial scroll positions so that
  // computeVisible() sees a valid viewport on the very first call.
  viewportHeight = adapter.y.readViewportSize();
  viewportWidth = adapter.x.readViewportSize();

  if (options.initialScrollTop !== undefined) {
    adapter.scrollTo(options.initialScrollLeft ?? 0, clampTop(options.initialScrollTop), 'auto');
  } else if (options.initialScrollLeft !== undefined) {
    adapter.scrollTo(clampLeft(options.initialScrollLeft), 0, 'auto');
  }

  scrollTop = clampTop(adapter.y.readOffset());
  scrollLeft = clampLeft(adapter.x.readOffset());

  computeVisible();

  return {
    get cols() {
      return cols;
    },
    get disposalSignal() {
      return ac.signal;
    },
    dispose: disposeImpl,
    get disposed() {
      return disposed;
    },
    invalidate,
    measureBatch,
    measureColEl,
    measureColumn,
    measureRow,
    measureRowEl,
    prependRows,
    refresh,
    get rows() {
      return rows;
    },
    get scrollLeft() {
      return scrollLeft;
    },
    scrollToCell,
    scrollToColumn,
    get scrollTop() {
      return scrollTop;
    },
    scrollToRow,
    [Symbol.dispose]: disposeImpl,
    get totalHeight() {
      return rowAx.totalSize;
    },
    get totalWidth() {
      return colAx.totalSize;
    },
    update,
  };
}
