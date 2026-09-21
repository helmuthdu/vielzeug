import type { QrGrid } from './_matrix';

/**
 * Data masks and penalty scoring (§7.8.2–7.8.3):
 * eight mask functions XORed onto data modules only, then four penalty rules
 * (N1=3 runs, N2=3 blocks, N3=40 finder-like patterns, N4=10 dark ratio).
 */

type MaskFn = (x: number, y: number) => boolean;

export const MASK_FNS: readonly MaskFn[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** XOR mask `m` onto every non-function module. Idempotent per mask. */
export function applyMask(grid: QrGrid, mask: number): void {
  const fn = MASK_FNS[mask];
  for (let y = 0; y < grid.size; y++)
    for (let x = 0; x < grid.size; x++)
      if (!grid.isFunction[y][x] && fn(x, y)) grid.modules[y][x] = !grid.modules[y][x];
}

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// Runs of ≥5 same-color modules in a row or column: N1 + (run − 5).
function penaltyRuns(grid: QrGrid): number {
  let penalty = 0;
  const line = (same: boolean, run: number): number => {
    if (!same && run >= 5) penalty += PENALTY_N1 + run - 5;
    return same ? run + 1 : 1;
  };
  for (let i = 0; i < grid.size; i++) {
    let runRow = 1;
    let runCol = 1;
    for (let j = 1; j < grid.size; j++) {
      runRow = line(grid.modules[i][j] === grid.modules[i][j - 1], runRow);
      runCol = line(grid.modules[j][i] === grid.modules[j - 1][i], runCol);
    }
    if (runRow >= 5) penalty += PENALTY_N1 + runRow - 5;
    if (runCol >= 5) penalty += PENALTY_N1 + runCol - 5;
  }
  return penalty;
}

// 2×2 blocks of a single color.
function penaltyBlocks(grid: QrGrid): number {
  let penalty = 0;
  for (let y = 0; y < grid.size - 1; y++)
    for (let x = 0; x < grid.size - 1; x++) {
      const c = grid.modules[y][x];
      if (c === grid.modules[y][x + 1] && c === grid.modules[y + 1][x] && c === grid.modules[y + 1][x + 1])
        penalty += PENALTY_N2;
    }
  return penalty;
}

// 1:1:3:1:1 finder-like patterns with a 4-module light border on either side.
function penaltyFinderLike(grid: QrGrid): number {
  const size = grid.size;
  let penalty = 0;
  const checkLine = (get: (i: number) => boolean): void => {
    for (let i = 0; i + 11 <= size; i++) {
      const window = Array.from({ length: 11 }, (_, k) => get(i + k));
      const coreA = [false, false, false, false, true, false, true, true, true, false, true];
      const coreB = [true, false, true, true, true, false, true, false, false, false, false];
      if (window.every((v, k) => v === coreA[k]) || window.every((v, k) => v === coreB[k])) penalty += PENALTY_N3;
    }
  };
  for (let y = 0; y < size; y++) checkLine((i) => grid.modules[y][i]);
  for (let x = 0; x < size; x++) checkLine((i) => grid.modules[i][x]);
  return penalty;
}

// Ratio of dark modules: each 5% step away from 50% costs N4.
function penaltyRatio(grid: QrGrid): number {
  let dark = 0;
  for (const row of grid.modules) for (const m of row) if (m) dark++;
  const total = grid.size * grid.size;
  const k = Math.floor(Math.abs(dark * 20 - total * 10) / total);
  return k * PENALTY_N4;
}

/** Total penalty score for a fully masked matrix. */
export function penaltyScore(grid: QrGrid): number {
  return penaltyRuns(grid) + penaltyBlocks(grid) + penaltyFinderLike(grid) + penaltyRatio(grid);
}
