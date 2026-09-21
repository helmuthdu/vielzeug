import { ALPHANUMERIC_CHARSET, CHAR_COUNT_BITS, dataCodewords, MODE_BITS, versionGroup } from './_tables';
import type { QrErrorCorrection, QrMode } from './types';

/**
 * Data-segment assembly: one segment (single mode) covering the whole input,
 * followed by terminator, byte alignment, and 0xEC/0x11 padding (§7.4–7.5).
 * Kanji and multi-segment optimization are out of scope.
 */

/** Growable bit stream; `bytes` is valid only after `padToByte()`. */
export class BitStream {
  private bits: number[] = [];

  get length(): number {
    return this.bits.length;
  }

  append(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }

  padToByte(): void {
    while (this.bits.length % 8 !== 0) this.bits.push(0);
  }

  toBytes(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | this.bits[i + j];
      out.push(b);
    }
    return out;
  }
}

/** Most compact mode able to encode the whole input. */
export function detectMode(data: string): QrMode {
  if (/^\d+$/.test(data)) return 'numeric';
  for (const ch of data) if (!ALPHANUMERIC_CHARSET.includes(ch)) return 'byte';
  return 'alphanumeric';
}

const textEncoder = new TextEncoder();

/** Payload bits for the segment body (without mode/count headers). */
export function dataBitLength(data: string, mode: QrMode): number {
  switch (mode) {
    case 'numeric':
      return Math.floor(data.length / 3) * 10 + (data.length % 3 === 1 ? 4 : data.length % 3 === 2 ? 7 : 0);
    case 'alphanumeric':
      return Math.floor(data.length / 2) * 11 + (data.length % 2) * 6;
    case 'byte':
      return textEncoder.encode(data).length * 8;
  }
}

/** Append mode indicator, char count, and payload bits. */
export function appendSegment(stream: BitStream, data: string, mode: QrMode, version: number): void {
  stream.append(MODE_BITS[mode], 4);
  stream.append(charCount(data, mode), CHAR_COUNT_BITS[mode][versionGroup(version)]);
  switch (mode) {
    case 'numeric':
      for (let i = 0; i < data.length; ) {
        const n = Math.min(3, data.length - i);
        stream.append(Number.parseInt(data.slice(i, i + n), 10), n === 3 ? 10 : n === 2 ? 7 : 4);
        i += n;
      }
      break;
    case 'alphanumeric':
      for (let i = 0; i < data.length; ) {
        if (i + 1 < data.length) {
          stream.append(ALPHANUMERIC_CHARSET.indexOf(data[i]) * 45 + ALPHANUMERIC_CHARSET.indexOf(data[i + 1]), 11);
          i += 2;
        } else {
          stream.append(ALPHANUMERIC_CHARSET.indexOf(data[i]), 6);
          i += 1;
        }
      }
      break;
    case 'byte':
      for (const b of textEncoder.encode(data)) stream.append(b, 8);
      break;
  }
}

/** Chars/bytes reported in the count field. Byte mode counts encoded bytes. */
export function charCount(data: string, mode: QrMode): number {
  return mode === 'byte' ? textEncoder.encode(data).length : data.length;
}

/** Capacity in bits for the data area of (version, level). */
export const dataCapacityBits = (version: number, level: QrErrorCorrection): number =>
  dataCodewords(version, level) * 8;

/** Bits a segment occupies at `version`: header + payload, before terminator. */
export function segmentBits(data: string, mode: QrMode, version: number): number {
  return 4 + CHAR_COUNT_BITS[mode][versionGroup(version)] + dataBitLength(data, mode);
}

/**
 * Full data-codeword sequence for (version, level): segment + terminator +
 * alignment + pad bytes. Caller guarantees the segment fits.
 */
export function buildDataCodewords(data: string, mode: QrMode, version: number, level: QrErrorCorrection): number[] {
  const stream = new BitStream();
  appendSegment(stream, data, mode, version);
  const capacity = dataCapacityBits(version, level);
  stream.append(0, Math.min(4, capacity - stream.length)); // terminator
  stream.padToByte();
  const bytes = stream.toBytes();
  const pad = [0xec, 0x11];
  for (let i = 0; bytes.length < dataCodewords(version, level); i++) bytes.push(pad[i % 2]);
  return bytes;
}
