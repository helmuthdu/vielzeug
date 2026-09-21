import { alignmentPatternPositions } from './_tables';

/**
 * Module placement (§7.7–7.9, Annex E): function patterns are drawn first and
 * recorded in `isFunction`, then the codeword bit stream fills the remaining
 * modules in a two-column zigzag starting bottom-right, skipping column 6.
 */

export interface QrGrid {
  /** Modules owned by function patterns — skipped by data placement and masks. */
  readonly isFunction: boolean[][];
  /** Final module colors; `true` = dark. Mutable during construction. */
  modules: boolean[][];
  readonly size: number;
}

export function createGrid(size: number): QrGrid {
  return {
    isFunction: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    size,
  };
}

const setFunction = (grid: QrGrid, x: number, y: number, dark: boolean): void => {
  grid.modules[y][x] = dark;
  grid.isFunction[y][x] = true;
};

/** 7×7 finder pattern plus the one-module separator ring, centered at (x+3, y+3). */
function drawFinder(grid: QrGrid, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      const xx = x + 3 + dx;
      const yy = y + 3 + dy;
      if (xx < 0 || yy < 0 || xx >= grid.size || yy >= grid.size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFunction(grid, xx, yy, dist !== 2 && dist !== 4);
    }
}

/** Alternating timing pattern along row/col 6, between the finders. */
function drawTiming(grid: QrGrid): void {
  for (let i = 8; i < grid.size - 8; i++) {
    const dark = i % 2 === 0;
    if (!grid.isFunction[6][i]) setFunction(grid, i, 6, dark);
    if (!grid.isFunction[i][6]) setFunction(grid, 6, i, dark);
  }
}

/** 5×5 alignment pattern centered at (cx, cy). */
function drawAlignment(grid: QrGrid, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) setFunction(grid, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
}

/**
 * Reserve the 15 format-info modules around each finder (both copies) and the
 * 6×3 version-info blocks for v≥7 — drawn later by `_format.ts`, but data
 * placement must skip them now.
 */
function reserveFormatAreas(grid: QrGrid): void {
  const size = grid.size;
  // Around the top-left finder.
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      grid.isFunction[8][i] = true;
      grid.isFunction[i][8] = true;
    }
  }
  // Second copy: column 8 rows size-1..size-7 beside the bottom-left finder,
  // row 8 columns size-1..size-8 beside the top-right finder.
  for (let i = 0; i < 7; i++) grid.isFunction[size - 1 - i][8] = true;
  for (let i = 0; i < 8; i++) grid.isFunction[8][size - 1 - i] = true;
  // Always-dark module below the bottom-left format strip.
  grid.isFunction[size - 8][8] = true;
}

function reserveVersionAreas(grid: QrGrid, version: number): void {
  if (version < 7) return;
  const size = grid.size;
  for (let i = 0; i < 18; i++) {
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    grid.isFunction[b][a] = true; // top-right block
    grid.isFunction[a][b] = true; // bottom-left block
  }
}

/** Draw every function pattern and mark reserved areas. */
export function drawFunctionPatterns(grid: QrGrid, version: number): void {
  drawFinder(grid, 0, 0);
  drawFinder(grid, grid.size - 7, 0);
  drawFinder(grid, 0, grid.size - 7);
  drawTiming(grid);
  const positions = alignmentPatternPositions(version);
  for (const cy of positions)
    for (const cx of positions) {
      // Skip the three corners covered by finder patterns.
      const isCorner =
        (cx === 6 && cy === 6) || (cx === 6 && cy === grid.size - 7) || (cx === grid.size - 7 && cy === 6);
      if (!isCorner) drawAlignment(grid, cx, cy);
    }
  reserveFormatAreas(grid);
  reserveVersionAreas(grid, version);
}

/** Place codeword bits into non-function modules via the zigzag scan. */
export function placeData(grid: QrGrid, codewords: readonly number[]): void {
  const size = grid.size;
  const totalBits = codewords.length * 8;
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the vertical timing column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = upward ? size - 1 - vert : vert;
        if (grid.isFunction[y][x]) continue;
        grid.modules[y][x] = bitIndex < totalBits && ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
        bitIndex++;
      }
    }
    upward = !upward;
  }
}
