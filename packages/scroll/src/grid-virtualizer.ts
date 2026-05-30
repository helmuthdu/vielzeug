import {
  createScrollAdapter,
  DEFAULT_ESTIMATE_SIZE,
  DEFAULT_OVERSCAN,
  normalizeOverscan,
  resolveEstimateFn,
  toNonNegativeInt,
  toPositiveNumber,
  type Overscan,
  type ScrollTarget,
} from './utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VirtualCell {
  colEnd: number;
  colIndex: number;
  colSize: number;
  colStart: number;
  rowEnd: number;
  rowIndex: number;
  rowSize: number;
  rowStart: number;
}

export interface GridVirtualizerState {
  readonly cells: VirtualCell[];
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

/** Options accepted by `update()`. Callbacks and boot-time options are excluded. */
export type GridVirtualizerUpdateOptions = Partial<
  Omit<
    GridVirtualizerOptions,
    | 'colMeasurementCache'
    | 'initialScrollLeft'
    | 'initialScrollTop'
    | 'onChange'
    | 'onRangeChange'
    | 'rowMeasurementCache'
  >
>;

export interface GridVirtualizer {
  readonly cells: VirtualCell[];
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly totalHeight: number;
  readonly totalWidth: number;
  destroy: () => void;
  invalidate: () => void;
  /** Batch-measure rows and columns in a single rebuild pass. */
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
  let rowGap = toNonNegativeInt(options.rowGap ?? 0);
  let colGap = toNonNegativeInt(options.colGap ?? 0);
  let estimateRowFn = resolveEstimateFn(options.estimateRowSize, DEFAULT_ESTIMATE_SIZE);
  let estimateColFn = resolveEstimateFn(options.estimateColSize, DEFAULT_ESTIMATE_SIZE);
  let overscanY = normalizeOverscan(options.overscanY, DEFAULT_OVERSCAN);
  let overscanX = normalizeOverscan(options.overscanX, DEFAULT_OVERSCAN);

  // Callbacks fixed at construction — not swappable via update() (R7).
  const onChange = options.onChange;
  const onRangeChange = options.onRangeChange;

  // External or internal measurement caches.
  const measuredRows: Map<number, number> = options.rowMeasurementCache ?? new Map();
  const measuredCols: Map<number, number> = options.colMeasurementCache ?? new Map();

  let rowOffsets: number[] = [];
  let colOffsets: number[] = [];
  let totalHeight = 0;
  let totalWidth = 0;
  let scrollTop = 0;
  let scrollLeft = 0;
  let viewportHeight = 0;
  let viewportWidth = 0;
  let cells: VirtualCell[] = [];

  // Dedup guards
  let prevFirstRow = -1;
  let prevLastRow = -1;
  let prevFirstCol = -1;
  let prevLastCol = -1;
  let prevTotalHeight = -1;
  let prevTotalWidth = -1;

  // Pending incremental rebuilds
  let pendingRowBuild = false;
  let pendingColBuild = false;
  let minChangedRow = Infinity;
  let minChangedCol = Infinity;

  let destroyed = false;

  // ─── Offset helpers ────────────────────────────────────────────────────────

  function rowSizeAt(row: number): number {
    return measuredRows.get(row) ?? estimateRowFn(row);
  }

  function colSizeAt(col: number): number {
    return measuredCols.get(col) ?? estimateColFn(col);
  }

  function rowStartAt(row: number): number {
    return rowOffsets[row] ?? 0;
  }

  function colStartAt(col: number): number {
    return colOffsets[col] ?? 0;
  }

  function clampTop(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;

    return Math.min(Math.max(0, totalHeight - viewportHeight), Math.max(0, safe));
  }

  function clampLeft(offset: number): number {
    const safe = Number.isFinite(offset) ? offset : 0;

    return Math.min(Math.max(0, totalWidth - viewportWidth), Math.max(0, safe));
  }

  // ─── Offset tables ─────────────────────────────────────────────────────────

  /**
   * Full O(n) row rebuild. Pass `forceEmit: true` to reset dedup guards (R10).
   * Does NOT reset guards when called for refresh() — computeVisible() detects
   * layout changes via totalHeight comparison.
   */
  function buildRowOffsets(forceEmit = false): void {
    if (forceEmit) {
      prevFirstRow = -1;
      prevLastRow = -1;
      prevTotalHeight = -1;
    }

    const next: number[] = [0];
    let pos = 0;

    for (let r = 0; r < rowCount; r++) {
      pos += rowSizeAt(r) + (r < rowCount - 1 ? rowGap : 0);
      next.push(pos);
    }

    rowOffsets = next;
    totalHeight = pos;
  }

  function buildColOffsets(forceEmit = false): void {
    if (forceEmit) {
      prevFirstCol = -1;
      prevLastCol = -1;
      prevTotalWidth = -1;
    }

    const next: number[] = [0];
    let pos = 0;

    for (let c = 0; c < colCount; c++) {
      pos += colSizeAt(c) + (c < colCount - 1 ? colGap : 0);
      next.push(pos);
    }

    colOffsets = next;
    totalWidth = pos;
  }

  /** Incremental row rebuild from `fromRow` forward. Always forces re-emit. */
  function buildRowOffsetsFrom(fromRow: number): void {
    if (!Number.isFinite(fromRow) || fromRow >= rowCount) return;

    prevFirstRow = -1;
    prevLastRow = -1;
    prevTotalHeight = -1;

    let pos = rowOffsets[fromRow] ?? 0;

    for (let r = fromRow; r < rowCount; r++) {
      rowOffsets[r] = pos;
      pos += rowSizeAt(r) + (r < rowCount - 1 ? rowGap : 0);
    }

    rowOffsets[rowCount] = pos;
    totalHeight = pos;
  }

  function buildColOffsetsFrom(fromCol: number): void {
    if (!Number.isFinite(fromCol) || fromCol >= colCount) return;

    prevFirstCol = -1;
    prevLastCol = -1;
    prevTotalWidth = -1;

    let pos = colOffsets[fromCol] ?? 0;

    for (let c = fromCol; c < colCount; c++) {
      colOffsets[c] = pos;
      pos += colSizeAt(c) + (c < colCount - 1 ? colGap : 0);
    }

    colOffsets[colCount] = pos;
    totalWidth = pos;
  }

  // ─── Visible range ─────────────────────────────────────────────────────────

  function findFirst(offsets: number[], sizes: (i: number) => number, count: number, viewportStart: number): number {
    let lo = 0;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;

      if ((offsets[mid] ?? 0) + sizes(mid) <= viewportStart) lo = mid + 1;
      else hi = mid;
    }

    return lo;
  }

  function findLast(offsets: number[], count: number, from: number, viewportEnd: number): number {
    let lo = from;
    let hi = count - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if ((offsets[mid] ?? 0) < viewportEnd) lo = mid;
      else hi = mid - 1;
    }

    return lo;
  }

  // ─── Compute and emit ──────────────────────────────────────────────────────

  function computeVisible(): void {
    if (destroyed) return;

    if (rowCount === 0 || colCount === 0 || viewportHeight <= 0 || viewportWidth <= 0) {
      if (prevFirstRow !== -1 || prevTotalHeight !== totalHeight || prevTotalWidth !== totalWidth) {
        prevFirstRow = -1;
        prevLastRow = -1;
        prevFirstCol = -1;
        prevLastCol = -1;
        prevTotalHeight = totalHeight;
        prevTotalWidth = totalWidth;
        cells = [];
        onChange?.({ cells: [], totalHeight, totalWidth });
      }

      return;
    }

    const firstRow = findFirst(rowOffsets, rowSizeAt, rowCount, scrollTop);
    const lastRow = findLast(rowOffsets, rowCount, firstRow, scrollTop + viewportHeight);
    const firstCol = findFirst(colOffsets, colSizeAt, colCount, scrollLeft);
    const lastCol = findLast(colOffsets, colCount, firstCol, scrollLeft + viewportWidth);

    const renderFirstRow = Math.max(0, firstRow - overscanY.start);
    const renderLastRow = Math.min(rowCount - 1, lastRow + overscanY.end);
    const renderFirstCol = Math.max(0, firstCol - overscanX.start);
    const renderLastCol = Math.min(colCount - 1, lastCol + overscanX.end);

    const rangeChanged =
      renderFirstRow !== prevFirstRow ||
      renderLastRow !== prevLastRow ||
      renderFirstCol !== prevFirstCol ||
      renderLastCol !== prevLastCol;
    const sizeChanged = totalHeight !== prevTotalHeight || totalWidth !== prevTotalWidth;

    if (!rangeChanged && !sizeChanged) return;

    prevFirstRow = renderFirstRow;
    prevLastRow = renderLastRow;
    prevFirstCol = renderFirstCol;
    prevLastCol = renderLastCol;
    prevTotalHeight = totalHeight;
    prevTotalWidth = totalWidth;

    if (rangeChanged && onRangeChange) {
      onRangeChange({
        firstCol: renderFirstCol,
        firstRow: renderFirstRow,
        lastCol: renderLastCol,
        lastRow: renderLastRow,
      });
    }

    const nextCells: VirtualCell[] = [];

    for (let r = renderFirstRow; r <= renderLastRow; r++) {
      const rowStart = rowStartAt(r);
      const rowSize = rowSizeAt(r);

      for (let c = renderFirstCol; c <= renderLastCol; c++) {
        const colStart = colStartAt(c);
        const colSize = colSizeAt(c);

        nextCells.push({
          colEnd: colStart + colSize,
          colIndex: c,
          colSize,
          colStart,
          rowEnd: rowStart + rowSize,
          rowIndex: r,
          rowSize,
          rowStart,
        });
      }
    }

    cells = nextCells;
    onChange?.({ cells: nextCells, totalHeight, totalWidth });
  }

  // ─── Measurement helpers (R2) ──────────────────────────────────────────────

  function recordRowMeasurement(row: number, size: number): boolean {
    if (!Number.isFinite(row)) return false;

    const r = Math.floor(row);

    if (r < 0 || r >= rowCount) return false;

    const s = toPositiveNumber(size, -1);

    if (s <= 0) return false;

    if (measuredRows.get(r) === s) return false;

    measuredRows.set(r, s);

    if (r < minChangedRow) minChangedRow = r;

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

    if (c < minChangedCol) minChangedCol = c;

    return true;
  }

  function flushRowBuild(): void {
    pendingRowBuild = false;

    const fromRow = minChangedRow;

    minChangedRow = Infinity;
    buildRowOffsetsFrom(fromRow);
    computeVisible();
  }

  function flushColBuild(): void {
    pendingColBuild = false;

    const fromCol = minChangedCol;

    minChangedCol = Infinity;
    buildColOffsetsFrom(fromCol);
    computeVisible();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  function measureRow(row: number, size: number): void {
    if (destroyed) return;

    if (recordRowMeasurement(row, size) && !pendingRowBuild) {
      pendingRowBuild = true;
      queueMicrotask(flushRowBuild);
    }
  }

  function measureColumn(col: number, size: number): void {
    if (destroyed) return;

    if (recordColMeasurement(col, size) && !pendingColBuild) {
      pendingColBuild = true;
      queueMicrotask(flushColBuild);
    }
  }

  /** Measure multiple rows and columns in a single rebuild pass (R11). */
  function measureBatch(
    rows: Array<{ index: number; size: number }>,
    cols: Array<{ index: number; size: number }>,
  ): void {
    if (destroyed) return;

    let rowChanged = false;
    let colChanged = false;

    for (const { index, size } of rows) {
      if (recordRowMeasurement(index, size)) rowChanged = true;
    }

    for (const { index, size } of cols) {
      if (recordColMeasurement(index, size)) colChanged = true;
    }

    if (rowChanged && !pendingRowBuild) {
      pendingRowBuild = true;
      queueMicrotask(flushRowBuild);
    }

    if (colChanged && !pendingColBuild) {
      pendingColBuild = true;
      queueMicrotask(flushColBuild);
    }
  }

  function measureRowEl(row: number, el: HTMLElement): () => void {
    if (destroyed) return () => {};

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        measureRow(row, entry.contentRect.height);
      }
    });

    ro.observe(el);

    return () => ro.disconnect();
  }

  function measureColEl(col: number, el: HTMLElement): () => void {
    if (destroyed) return () => {};

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        measureColumn(col, entry.contentRect.width);
      }
    });

    ro.observe(el);

    return () => ro.disconnect();
  }

  function invalidate(): void {
    if (destroyed) return;

    measuredRows.clear();
    measuredCols.clear();
    minChangedRow = Infinity;
    minChangedCol = Infinity;
    buildRowOffsets(true);
    buildColOffsets(true);
    computeVisible();
  }

  function refresh(): void {
    if (destroyed) return;

    buildRowOffsets(true); // force re-emit — caller knows content changed
    buildColOffsets(true);
    computeVisible();
  }

  /**
   * Prepend rows at the top while keeping the viewport visually stable.
   * Adjusts scrollTop by the exact height of the prepended rows.
   */
  function prependRows(additionalRowCount: number): void {
    if (destroyed) return;

    const n = toNonNegativeInt(additionalRowCount);

    if (n === 0) return;

    rowCount += n;
    buildRowOffsets(true);

    const prependedHeight = rowOffsets[n] ?? 0;
    const newScrollTop = clampTop(scrollTop + prependedHeight);

    adapter.scrollTo(scrollLeft, newScrollTop, 'auto');
    scrollTop = newScrollTop;

    computeVisible();
  }

  function scrollToCell(row: number, col: number, opts: ScrollToCellOptions = {}): void {
    if (destroyed) return;

    const safeRow = Math.max(0, Math.min(Math.floor(Number.isFinite(row) ? row : 0), rowCount - 1));
    const safeCol = Math.max(0, Math.min(Math.floor(Number.isFinite(col) ? col : 0), colCount - 1));
    const behavior = opts.behavior ?? 'auto';

    const rowStart = rowStartAt(safeRow);
    const rowSize = rowSizeAt(safeRow);
    const colStart = colStartAt(safeCol);
    const colSize = colSizeAt(safeCol);

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
    if (destroyed) return;

    let rebuildRows = false;
    let rebuildCols = false;
    let needsCompute = false;

    if (next.rowCount !== undefined) {
      const n = toNonNegativeInt(next.rowCount);

      if (n !== rowCount) {
        rowCount = n;
        rebuildRows = true;
      }
    }

    if (next.colCount !== undefined) {
      const n = toNonNegativeInt(next.colCount);

      if (n !== colCount) {
        colCount = n;
        rebuildCols = true;
      }
    }

    if (next.rowGap !== undefined) {
      const n = toNonNegativeInt(next.rowGap);

      if (n !== rowGap) {
        rowGap = n;
        rebuildRows = true;
      }
    }

    if (next.colGap !== undefined) {
      const n = toNonNegativeInt(next.colGap);

      if (n !== colGap) {
        colGap = n;
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

    if (rebuildRows) buildRowOffsets(true);

    if (rebuildCols) buildColOffsets(true);

    if (rebuildRows || rebuildCols || needsCompute) computeVisible();
  }

  function destroy(): void {
    if (destroyed) return;

    destroyed = true;
    adapter.detach();
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

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

  buildRowOffsets(true);
  buildColOffsets(true);

  if (options.initialScrollTop !== undefined) {
    adapter.scrollTo(options.initialScrollLeft ?? 0, clampTop(options.initialScrollTop), 'auto');
  } else if (options.initialScrollLeft !== undefined) {
    adapter.scrollTo(clampLeft(options.initialScrollLeft), 0, 'auto');
  }

  scrollTop = clampTop(adapter.y.readOffset());
  scrollLeft = clampLeft(adapter.x.readOffset());
  viewportHeight = adapter.y.readViewportSize();
  viewportWidth = adapter.x.readViewportSize();

  computeVisible();

  return {
    get cells() {
      return cells;
    },
    destroy,
    invalidate,
    measureBatch,
    measureColEl,
    measureColumn,
    measureRow,
    measureRowEl,
    prependRows,
    refresh,
    get scrollLeft() {
      return scrollLeft;
    },
    scrollToCell,
    get scrollTop() {
      return scrollTop;
    },
    [Symbol.dispose]() {
      destroy();
    },
    get totalHeight() {
      return totalHeight;
    },
    get totalWidth() {
      return totalWidth;
    },
    update,
  };
}
