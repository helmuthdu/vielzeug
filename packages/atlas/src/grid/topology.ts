/**
 * Grid topology: the facts a search needs about a discrete grid, so the same
 * pathfinding runs on square tiles and hexes. A topology is a plain object of
 * pure functions; the hex implementation lives in `hex.ts`.
 */
import { type TileCoord, tileKey } from './tile.js';

/** What a search needs to know about a grid of cells of type `C`. */
export interface GridTopology<C> {
  /** Distance in steps between two cells; admissible as an A* heuristic. */
  distance(a: C, b: C): number;
  /** A stable string key for a cell, usable as a Map/Set key. */
  key(coord: C): string;
  /** The cells a straight walk from `a` to `b` crosses, both ends included. */
  line(a: C, b: C): readonly C[];
  /** The cells adjacent to a cell. */
  neighbors(coord: C): readonly C[];
}

const ORTHOGONAL: readonly TileCoord[] = [
  { col: 1, row: 0 },
  { col: -1, row: 0 },
  { col: 0, row: 1 },
  { col: 0, row: -1 },
];

const DIAGONALS: readonly TileCoord[] = [
  { col: 1, row: 1 },
  { col: 1, row: -1 },
  { col: -1, row: 1 },
  { col: -1, row: -1 },
];

/**
 * The {@link GridTopology} for square tiles. `diagonal: true` gives 8-way
 * adjacency and Chebyshev distance; the default is 4-way with Manhattan
 * distance. `line` is a supercover line: every tile whose square the segment
 * touches, so a sight line never skips a corner tile.
 */
export function squareTopology(options: Readonly<{ diagonal?: boolean }> = {}): GridTopology<TileCoord> {
  const diagonal = options.diagonal ?? false;
  const steps = diagonal ? [...ORTHOGONAL, ...DIAGONALS] : ORTHOGONAL;
  return {
    distance(a, b) {
      const dc = Math.abs(a.col - b.col);
      const dr = Math.abs(a.row - b.row);
      return diagonal ? Math.max(dc, dr) : dc + dr;
    },
    key: tileKey,
    line(a, b) {
      return supercoverLine(a, b);
    },
    neighbors(coord) {
      return steps.map((d) => ({ col: coord.col + d.col, row: coord.row + d.row }));
    },
  };
}

/**
 * Supercover line between tile centres: for each column (or row, when the
 * segment is steeper) the segment spans, every row whose closed square the
 * segment touches joins the line. Corner touches count on both sides, and the
 * walk always runs from the lexicographically smaller endpoint, so reversing
 * the endpoints yields the same cells in reverse order.
 */
function supercoverLine(a: TileCoord, b: TileCoord): readonly TileCoord[] {
  if (a.col === b.col && a.row === b.row) return [a];
  const forward = a.col < b.col || (a.col === b.col && a.row <= b.row);
  const from = forward ? a : b;
  const to = forward ? b : a;
  const cells = walkSupercover(from, to);
  return forward ? cells : cells.reverse();
}

function walkSupercover(a: TileCoord, b: TileCoord): TileCoord[] {
  const xa = a.col + 0.5;
  const ya = a.row + 0.5;
  const xb = b.col + 0.5;
  const yb = b.row + 0.5;
  const steep = Math.abs(yb - ya) > Math.abs(xb - xa);
  const out: TileCoord[] = [];
  const seen = new Set<string>();
  const add = (col: number, row: number): void => {
    const key = `${String(col)}:${String(row)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ col, row });
  };
  const yAt = (x: number): number => ya + ((yb - ya) * (x - xa)) / (xb - xa);
  const xAt = (y: number): number => xa + ((xb - xa) * (y - ya)) / (yb - ya);

  // A span that lands exactly on a cell boundary touches the cell on each
  // side of it, so the lower bound steps down one cell in that case.
  const span = (lo: number, hi: number): readonly [number, number] => {
    const first = Math.floor(Math.min(lo, hi));
    return [Number.isInteger(Math.min(lo, hi)) ? first - 1 : first, Math.floor(Math.max(lo, hi))];
  };

  if (!steep) {
    for (let col = a.col; col <= b.col; col += 1) {
      const xLo = Math.max(col, Math.min(xa, xb));
      const xHi = Math.min(col + 1, Math.max(xa, xb));
      if (xLo > xHi) continue;
      const [rowLo, rowHi] = span(yAt(xLo), yAt(xHi));
      for (let row = rowLo; row <= rowHi; row += 1) add(col, row);
    }
  } else {
    for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
      const yLo = Math.max(row, Math.min(ya, yb));
      const yHi = Math.min(row + 1, Math.max(ya, yb));
      if (yLo > yHi) continue;
      const [colLo, colHi] = span(xAt(yLo), xAt(yHi));
      for (let col = colLo; col <= colHi; col += 1) add(col, row);
    }
  }
  return out;
}
