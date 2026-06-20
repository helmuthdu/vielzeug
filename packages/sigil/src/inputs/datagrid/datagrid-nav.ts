import { type Readable, signal } from '@vielzeug/ripple';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Position in the 2D grid model (0-based row/col indices). */
export type GridCellPos = { col: number; row: number };

/** Handle returned by createGridNav for programmatic control. */
export type GridNavHandle = {
  /** Current active cell position. Reactive signal. */
  readonly activeCell: Readable<GridCellPos>;
  /**
   * Move focus to a specific cell by position.
   * Clamps to valid grid bounds; no-ops for invalid positions.
   */
  focusCell(pos: GridCellPos): void;
};

// ── Selector ───────────────────────────────────────────────────────────────────

const CELL_SELECTOR = '.dg-td, .dg-th';

/** Build a 2D array of focusable cells from the shadow root. One sub-array per <tr>. */
function getGrid(shadow: ShadowRoot): HTMLElement[][] {
  return Array.from(shadow.querySelectorAll<HTMLElement>('tr'))
    .map((tr) => Array.from(tr.querySelectorAll<HTMLElement>(CELL_SELECTOR)))
    .filter((row) => row.length > 0);
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Keyboard navigation for the ARIA grid pattern (roving tabindex).
 *
 * - Arrow keys move focus between cells.
 * - Home/End move to the first/last cell in the row.
 * - Ctrl+Home/Ctrl+End move to the first/last cell in the grid.
 * - Only the active cell has `tabindex="0"`; all others have `"-1"`.
 *
 * @param table - The `.dg-table` element to attach the keydown listener to.
 * @param shadow - The shadow root containing the grid cells.
 * @returns A handle with `focusCell` and a reactive `activeCell` signal, plus a cleanup fn.
 */
export function createGridNav(table: HTMLElement, shadow: ShadowRoot): { cleanup: () => void; handle: GridNavHandle } {
  const activeCell = signal<GridCellPos>({ col: 0, row: 0 });

  const focusCell = (pos: GridCellPos): void => {
    const grid = getGrid(shadow);
    const rowIdx = Math.max(0, Math.min(pos.row, grid.length - 1));
    const row = grid[rowIdx];

    if (!row) return;

    const colIdx = Math.max(0, Math.min(pos.col, row.length - 1));
    const target = row[colIdx];

    if (!target) return;

    for (const r of grid) {
      for (const cell of r) cell.setAttribute('tabindex', '-1');
    }

    target.setAttribute('tabindex', '0');
    target.focus();
    activeCell.value = { col: colIdx, row: rowIdx };
  };

  const handleArrow = (e: KeyboardEvent): void => {
    const active = shadow.activeElement as HTMLElement | null;

    if (!active?.matches(CELL_SELECTOR)) return;

    const grid = getGrid(shadow);
    const rowIdx = grid.findIndex((row) => row.includes(active));

    if (rowIdx === -1) return;

    const colIdx = grid[rowIdx].indexOf(active);
    const lastRow = grid.length - 1;
    const lastCol = grid[rowIdx].length - 1;

    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === 'ArrowRight') nextCol = colIdx + 1;
    else if (e.key === 'ArrowLeft') nextCol = colIdx - 1;
    else if (e.key === 'ArrowDown') nextRow = rowIdx + 1;
    else if (e.key === 'ArrowUp') nextRow = rowIdx - 1;
    else if (e.key === 'Home') {
      nextCol = 0;

      if (e.ctrlKey) nextRow = 0;
    } else if (e.key === 'End') {
      nextCol = lastCol;

      if (e.ctrlKey) nextRow = lastRow;
    } else return;

    e.preventDefault();
    focusCell({
      col: Math.max(0, Math.min(nextCol, (grid[Math.max(0, Math.min(nextRow, lastRow))]?.length ?? 1) - 1)),
      row: Math.max(0, Math.min(nextRow, lastRow)),
    });
  };

  table.addEventListener('keydown', handleArrow);

  return {
    cleanup: () => table.removeEventListener('keydown', handleArrow),
    handle: { activeCell, focusCell },
  };
}
