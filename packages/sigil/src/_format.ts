import type { QrGrid } from './_matrix';
import { FORMAT_EC_BITS } from './_tables';
import type { QrErrorCorrection } from './types';

/**
 * Format and version information (§7.9, Annexes C–D):
 * - Format: 5 data bits (2 EC + 3 mask) → BCH(15,5) remainder → XOR 0x5412,
 *   written twice around the finders.
 * - Version (v≥7): 6 data bits → BCH(18,6) remainder, written twice in the
 *   6×3 blocks at top-right and bottom-left.
 */

const BCH_FORMAT_POLY = 0b10100110111; // x¹⁰+x⁸+x⁵+x⁴+x²+x+1
const BCH_FORMAT_MASK = 0b101010000010010; // 0x5412
const BCH_VERSION_POLY = 0b1111100100101; // x¹²+x¹¹+x¹⁰+x⁹+x⁸+x⁵+x²+1

/** 15-bit format information word for (level, mask). */
export function formatInfoBits(level: QrErrorCorrection, mask: number): number {
  const data = (FORMAT_EC_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * BCH_FORMAT_POLY);
  return ((data << 10) | (rem & 0x3ff)) ^ BCH_FORMAT_MASK;
}

/** 18-bit version information word (version ≥ 7). */
export function versionInfoBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ (((rem >>> 11) & 1) * BCH_VERSION_POLY);
  return (version << 12) | (rem & 0xfff);
}

const setFunction = (grid: QrGrid, x: number, y: number, dark: boolean): void => {
  grid.modules[y][x] = dark;
  grid.isFunction[y][x] = true;
};

/** Write both copies of the 15-bit format word plus the dark module. */
export function drawFormatInfo(grid: QrGrid, level: QrErrorCorrection, mask: number): void {
  const size = grid.size;
  const bits = formatInfoBits(level, mask);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;

  // First copy around the top-left finder.
  for (let i = 0; i <= 5; i++) setFunction(grid, 8, i, bit(i));
  setFunction(grid, 8, 7, bit(6));
  setFunction(grid, 8, 8, bit(7));
  setFunction(grid, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunction(grid, 14 - i, 8, bit(i));

  // Second copy: row 8 beside the top-right finder (bits 0–7),
  // column 8 beside the bottom-left finder (bits 8–14).
  for (let i = 0; i < 8; i++) setFunction(grid, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFunction(grid, 8, size - 15 + i, bit(i));

  // Always-dark module below the bottom-left strip.
  setFunction(grid, 8, size - 8, true);
}

/** Write both 6×3 version-information blocks (v≥7). */
export function drawVersionInfo(grid: QrGrid, version: number): void {
  if (version < 7) return;
  const size = grid.size;
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunction(grid, a, b, dark); // top-right
    setFunction(grid, b, a, dark); // bottom-left
  }
}
