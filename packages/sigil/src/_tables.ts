import type { QrErrorCorrection, QrMode } from './types';

/**
 * QR Model 2 lookup tables, transcribed from ISO/IEC 18004:2015:
 * - `EC_CODEWORDS_PER_BLOCK` / `NUM_EC_BLOCKS` — Table 9 (error-correction
 *   characteristics). Stored as per-block EC codewords and block count; the
 *   group-1/group-2 split is derived, since all blocks share one EC length.
 * - `alignmentPatternPositions` — Table E.1, computed by the spec formula.
 * - `CHAR_COUNT_BITS` — Table 3 (character-count indicator bit widths).
 * - `FORMAT_EC_BITS` — Table 10 (2-bit level field inside format information).
 *
 * `tables.test.ts` cross-checks every entry against the raw-module formula, so
 * a transcription slip fails the consistency test before the decode oracle runs.
 */

/** Index order used by the table rows below. */
export const EC_LEVELS = ['L', 'M', 'Q', 'H'] as const;

export const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/** Mode indicators (Table 2). */
export const MODE_BITS: Record<QrMode, number> = {
  alphanumeric: 0b0010,
  byte: 0b0100,
  numeric: 0b0001,
};

/** Character-count indicator widths for version groups 1–9 / 10–26 / 27–40. */
export const CHAR_COUNT_BITS: Record<QrMode, readonly [number, number, number]> = {
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
  numeric: [10, 12, 14],
};

/** EC level bits inside format information (L=01, M=00, Q=11, H=10). */
export const FORMAT_EC_BITS: Record<QrErrorCorrection, number> = { H: 0b10, L: 0b01, M: 0b00, Q: 0b11 };

/** Row 0 = L, row 1 = M, row 2 = Q, row 3 = H; column 0 unused (versions start at 1). */
export const EC_CODEWORDS_PER_BLOCK: ReadonlyArray<ReadonlyArray<number>> = [
  // prettier-ignore
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  // prettier-ignore
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  // prettier-ignore
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  // prettier-ignore
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
];

export const NUM_EC_BLOCKS: ReadonlyArray<ReadonlyArray<number>> = [
  // prettier-ignore
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19,
    19, 20, 21, 22, 24, 25,
  ],
  // prettier-ignore
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31,
    33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  // prettier-ignore
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43,
    45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  // prettier-ignore
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48,
    51, 56, 59, 62, 65, 68, 71, 74, 77, 81,
  ],
];

const ecIndex = (level: QrErrorCorrection): number => EC_LEVELS.indexOf(level);

/** Total modules per side. */
export const matrixSize = (version: number): number => version * 4 + 17;

/** Alignment-pattern center coordinates (Table E.1 formula). */
export function alignmentPatternPositions(version: number): readonly number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

/**
 * Total raw modules available for data + EC + remainder bits, derived from the
 * symbol geometry (Table 1 / Annex A): full grid minus finders, separators,
 * timing, alignment, dark module, format and version information.
 */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Total codewords (data + EC) for a version. */
export const totalCodewords = (version: number): number => Math.floor(rawDataModules(version) / 8);

/** Leftover bits after the codeword stream (0, 3, 4, or 7 by version). */
export const remainderBits = (version: number): number => rawDataModules(version) % 8;

export function ecCodewordsPerBlock(version: number, level: QrErrorCorrection): number {
  return EC_CODEWORDS_PER_BLOCK[ecIndex(level)][version];
}

export function numEcBlocks(version: number, level: QrErrorCorrection): number {
  return NUM_EC_BLOCKS[ecIndex(level)][version];
}

/** Data codewords for a (version, level) pair. */
export function dataCodewords(version: number, level: QrErrorCorrection): number {
  return totalCodewords(version) - ecCodewordsPerBlock(version, level) * numEcBlocks(version, level);
}

/** Version group for the character-count indicator: 0 → 1–9, 1 → 10–26, 2 → 27–40. */
export function versionGroup(version: number): 0 | 1 | 2 {
  return version <= 9 ? 0 : version <= 26 ? 1 : 2;
}
