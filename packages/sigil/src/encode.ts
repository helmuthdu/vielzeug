import { drawFormatInfo, drawVersionInfo } from './_format';
import { applyMask, penaltyScore } from './_mask';
import { createGrid, drawFunctionPatterns, placeData } from './_matrix';
import { ecCodewords } from './_reed-solomon';
import {
  buildDataCodewords,
  detectMode,
  payloadFromBytes,
  payloadFromText,
  payloadLength,
  type QrPayload,
  segmentBits,
} from './_segments';
import {
  ALPHANUMERIC_CHARSET,
  CHAR_COUNT_BITS,
  dataCodewords,
  ecCodewordsPerBlock,
  matrixSize,
  numEcBlocks,
  totalCodewords,
  versionGroup,
} from './_tables';
import { SigilCapacityError, SigilOptionError } from './errors';
import type { QrEncodeOptions, QrErrorCorrection, QrMatrix, QrMode } from './types';

const MAX_VERSION = 40;

function checkOptions(options: QrEncodeOptions): void {
  const { version, minVersion, mask, errorCorrection } = options;
  const inRange = (v: number) => Number.isInteger(v) && v >= 1 && v <= MAX_VERSION;
  if (version !== undefined && !inRange(version))
    throw new SigilOptionError(`version must be an integer 1–${MAX_VERSION}, got ${version}`);
  if (minVersion !== undefined && !inRange(minVersion))
    throw new SigilOptionError(`minVersion must be an integer 1–${MAX_VERSION}, got ${minVersion}`);
  if (version !== undefined && minVersion !== undefined && minVersion > version)
    throw new SigilOptionError(`minVersion (${minVersion}) exceeds version (${version})`);
  if (mask !== undefined && (!Number.isInteger(mask) || mask < 0 || mask > 7))
    throw new SigilOptionError(`mask must be an integer 0–7, got ${mask}`);
  if (errorCorrection !== undefined && !'LMQH'.includes(errorCorrection))
    throw new SigilOptionError(`errorCorrection must be 'L', 'M', 'Q', or 'H'`);
}

/** Character capacity of (version, level, mode) — the `qrCapacity` core. */
function capacityFor(version: number, level: QrErrorCorrection, mode: QrMode): number {
  const countBits = CHAR_COUNT_BITS[mode][versionGroup(version)];
  const usable = dataCodewords(version, level) * 8 - 4 - countBits;
  if (usable <= 0) return 0;
  switch (mode) {
    case 'numeric':
      return Math.floor(usable / 10) * 3 + (usable % 10 >= 7 ? 2 : usable % 10 >= 4 ? 1 : 0);
    case 'alphanumeric':
      return Math.floor(usable / 11) * 2 + (usable % 11 >= 6 ? 1 : 0);
    case 'byte':
      return Math.floor(usable / 8);
  }
}

/** Smallest version ≥ minVersion whose data area fits the segment, or `null`. */
function pickVersion(payload: QrPayload, level: QrErrorCorrection, minVersion: number): number | null {
  for (let v = minVersion; v <= MAX_VERSION; v++) if (segmentBits(payload, v) <= dataCodewords(v, level) * 8) return v;
  return null;
}

/** The capacity error for a payload that does not fit at `version`. */
function capacityError(payload: QrPayload, level: QrErrorCorrection, version: number): SigilCapacityError {
  const length = payloadLength(payload);
  const max = capacityFor(version, level, payload.mode);
  const unit = payload.mode === 'byte' ? 'bytes' : 'chars';
  return new SigilCapacityError(
    `Input of ${length} ${unit} exceeds QR capacity (${max} ${unit} at version ${version}-${level})`,
    length,
    max,
    version,
  );
}

/** Split data codewords into EC blocks and interleave data + EC (§7.6). */
function interleaveBlocks(data: readonly number[], version: number, level: QrErrorCorrection): number[] {
  const numBlocks = numEcBlocks(version, level);
  const ecLen = ecCodewordsPerBlock(version, level);
  const rawLen = totalCodewords(version);
  const shortLen = Math.floor(rawLen / numBlocks) - ecLen; // data codewords in a short block
  const numLong = rawLen % numBlocks; // long blocks carry one extra data codeword

  const blocks: number[][] = [];
  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const isLong = b >= numBlocks - numLong;
    const dat = data.slice(offset, offset + shortLen + (isLong ? 1 : 0));
    offset += dat.length;
    const ecc = ecCodewords(dat, ecLen);
    // Short blocks get a pad slot so every block array shares one length;
    // the slot is skipped during interleave below.
    blocks.push(isLong ? [...dat, ...ecc] : [...dat, 0, ...ecc]);
  }

  const out: number[] = [];
  for (let i = 0; i < blocks[0].length; i++)
    for (let b = 0; b < numBlocks; b++) {
      // Skip the pad slot on short blocks (index = shortLen).
      if (i !== shortLen || b >= numBlocks - numLong) out.push(blocks[b][i]);
    }
  return out;
}

function freezeMatrix(grid: readonly (readonly boolean[])[], meta: Omit<QrMatrix, 'get'>): QrMatrix {
  const modules = grid.map((row) => Object.freeze([...row]));
  Object.freeze(modules);
  return Object.freeze({
    ...meta,
    get: (x: number, y: number) => (x >= 0 && y >= 0 && x < meta.size && y < meta.size ? modules[y][x] : false),
  });
}

/**
 * Encode `data` into a QR Model 2 symbol. Pure and synchronous.
 * Strings pick the most compact mode; `Uint8Array` is raw binary and always
 * byte mode, encoded as-is — no UTF-8 round-trip. Byte mode is UTF-8 without
 * an ECI header for string input — the industry-standard assumption.
 */
export function encodeQr(data: string | Uint8Array, options: QrEncodeOptions = {}): QrMatrix {
  checkOptions(options);
  if (data.length === 0) throw new SigilOptionError('Cannot encode an empty input');

  const level = options.errorCorrection ?? 'M';
  if (typeof data !== 'string' && options.mode !== undefined && options.mode !== 'byte')
    throw new SigilOptionError('Uint8Array input can only be encoded in byte mode');
  const mode = options.mode ?? (typeof data === 'string' ? detectMode(data) : 'byte');
  if (typeof data === 'string' && !isModeCompatible(data, mode))
    throw new SigilOptionError(`Input cannot be encoded in ${mode} mode`);
  const payload = typeof data === 'string' ? payloadFromText(data, mode) : payloadFromBytes(data);

  const version = options.version ?? pickVersion(payload, level, options.minVersion ?? 1);
  if (version === null || segmentBits(payload, version) > dataCodewords(version, level) * 8)
    throw capacityError(payload, level, options.version ?? MAX_VERSION);

  const codewords = interleaveBlocks(buildDataCodewords(payload, version, level), version, level);
  const grid = createGrid(matrixSize(version));
  drawFunctionPatterns(grid, version);
  placeData(grid, codewords);

  // Try every mask (or the forced one), keep the lowest penalty. Each candidate
  // is undone by the idempotent XOR, and the final drawFormatInfo below rewrites
  // every format module, so candidates never leak into each other.
  const candidates = options.mask !== undefined ? [options.mask] : [0, 1, 2, 3, 4, 5, 6, 7];
  let bestMask = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const m of candidates) {
    applyMask(grid, m);
    drawFormatInfo(grid, level, m);
    const score = penaltyScore(grid);
    if (score < bestScore) {
      bestScore = score;
      bestMask = m;
    }
    applyMask(grid, m); // undo
  }

  // The grid is unmasked again — draw the winning candidate once, finally.
  applyMask(grid, bestMask);
  drawFormatInfo(grid, level, bestMask);
  drawVersionInfo(grid, version);

  return freezeMatrix(grid.modules, {
    errorCorrection: level,
    mask: bestMask,
    mode,
    size: grid.size,
    version,
  });
}

/** Whether `text` is representable in `mode` (used when the mode is forced). */
function isModeCompatible(text: string, mode: QrMode): boolean {
  if (mode === 'numeric') return /^\d+$/.test(text);
  if (mode === 'alphanumeric') return [...text].every((ch) => ALPHANUMERIC_CHARSET.includes(ch));
  return true;
}

/** Max characters/bytes encodable at (version, level, mode). */
export function qrCapacity(version: number, errorCorrection: QrErrorCorrection, mode: QrMode): number {
  if (!Number.isInteger(version) || version < 1 || version > MAX_VERSION)
    throw new SigilOptionError(`version must be an integer 1–${MAX_VERSION}, got ${version}`);
  return capacityFor(version, errorCorrection, mode);
}
