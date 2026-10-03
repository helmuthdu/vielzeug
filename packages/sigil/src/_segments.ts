import { ALPHANUMERIC_CHARSET, CHAR_COUNT_BITS, dataCodewords, MODE_BITS, versionGroup } from './_tables';
import type { QrErrorCorrection, QrMode } from './types';

/**
 * Data-segment assembly: one segment (single mode) covering the whole input,
 * followed by terminator, byte alignment, and 0xEC/0x11 padding (§7.4–7.5).
 * Kanji and multi-segment optimization are out of scope.
 */

const textEncoder = new TextEncoder();

/**
 * Payload prepared for its mode: text for numeric/alphanumeric, raw bytes for
 * byte mode. Byte mode never round-trips through a string, so invalid UTF-8
 * input survives encoding untouched.
 */
export type QrPayload =
  | { readonly mode: 'numeric' | 'alphanumeric'; readonly text: string }
  | { readonly mode: 'byte'; readonly bytes: Uint8Array };

/** Interpret `text` as `mode`: UTF-8-encoding only for byte mode. */
export const payloadFromText = (text: string, mode: QrMode): QrPayload =>
  mode === 'byte' ? { bytes: textEncoder.encode(text), mode: 'byte' } : { mode, text };

/** Raw binary payload; always byte mode. */
export const payloadFromBytes = (bytes: Uint8Array): QrPayload => ({ bytes, mode: 'byte' });

/** Value carried in the character-count field. */
export function payloadLength(payload: QrPayload): number {
  return payload.mode === 'byte' ? payload.bytes.length : payload.text.length;
}

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

/** Most compact mode able to encode the whole text. */
export function detectMode(text: string): QrMode {
  if (/^\d+$/.test(text)) return 'numeric';
  for (const ch of text) if (!ALPHANUMERIC_CHARSET.includes(ch)) return 'byte';
  return 'alphanumeric';
}

/** Payload bits for the segment body (without mode/count headers). */
export function dataBitLength(payload: QrPayload): number {
  switch (payload.mode) {
    case 'numeric':
      return (
        Math.floor(payload.text.length / 3) * 10 +
        (payload.text.length % 3 === 1 ? 4 : payload.text.length % 3 === 2 ? 7 : 0)
      );
    case 'alphanumeric':
      return Math.floor(payload.text.length / 2) * 11 + (payload.text.length % 2) * 6;
    case 'byte':
      return payload.bytes.length * 8;
  }
}

/** Append mode indicator, char count, and payload bits. */
export function appendSegment(stream: BitStream, payload: QrPayload, version: number): void {
  stream.append(MODE_BITS[payload.mode], 4);
  stream.append(payloadLength(payload), CHAR_COUNT_BITS[payload.mode][versionGroup(version)]);
  switch (payload.mode) {
    case 'numeric':
      for (let i = 0; i < payload.text.length; ) {
        const n = Math.min(3, payload.text.length - i);
        stream.append(Number.parseInt(payload.text.slice(i, i + n), 10), n === 3 ? 10 : n === 2 ? 7 : 4);
        i += n;
      }
      break;
    case 'alphanumeric':
      for (let i = 0; i < payload.text.length; ) {
        if (i + 1 < payload.text.length) {
          stream.append(
            ALPHANUMERIC_CHARSET.indexOf(payload.text[i]) * 45 + ALPHANUMERIC_CHARSET.indexOf(payload.text[i + 1]),
            11,
          );
          i += 2;
        } else {
          stream.append(ALPHANUMERIC_CHARSET.indexOf(payload.text[i]), 6);
          i += 1;
        }
      }
      break;
    case 'byte':
      for (const b of payload.bytes) stream.append(b, 8);
      break;
  }
}

/** Capacity in bits for the data area of (version, level). */
export const dataCapacityBits = (version: number, level: QrErrorCorrection): number =>
  dataCodewords(version, level) * 8;

/** Bits a segment occupies at `version`: header + payload, before terminator. */
export function segmentBits(payload: QrPayload, version: number): number {
  return 4 + CHAR_COUNT_BITS[payload.mode][versionGroup(version)] + dataBitLength(payload);
}

/**
 * Full data-codeword sequence for (version, level): segment + terminator +
 * alignment + pad bytes. Caller guarantees the segment fits.
 */
export function buildDataCodewords(payload: QrPayload, version: number, level: QrErrorCorrection): number[] {
  const stream = new BitStream();
  appendSegment(stream, payload, version);
  const capacity = dataCapacityBits(version, level);
  stream.append(0, Math.min(4, capacity - stream.length)); // terminator
  stream.padToByte();
  const bytes = stream.toBytes();
  const pad = [0xec, 0x11];
  for (let i = 0; bytes.length < dataCodewords(version, level); i++) bytes.push(pad[i % 2]);
  return bytes;
}
