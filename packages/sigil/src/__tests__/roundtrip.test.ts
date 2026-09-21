import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { encodeQr, qrCapacity } from '../encode';
import type { QrMatrix } from '../types';

/**
 * Decode oracle: rasterize each matrix to an RGBA buffer (dark modules black,
 * quiet zone white) and decode with jsQR — an independent, battle-tested
 * decoder. Any placement, masking, or EC transcription error surfaces here.
 */

function rasterize(
  matrix: QrMatrix,
  scale = 4,
  margin = 4,
): { data: Uint8ClampedArray; width: number; height: number } {
  const dim = (matrix.size + margin * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255);
  for (let y = 0; y < matrix.size; y++)
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.get(x, y)) continue;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const px = (x + margin) * scale + dx;
          const py = (y + margin) * scale + dy;
          const i = (py * dim + px) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
    }
  return { data, height: dim, width: dim };
}

function decode(matrix: QrMatrix): string | null {
  const { data, width, height } = rasterize(matrix);
  const result = jsQR(data, width, height);
  return result?.data ?? null;
}

const ALPHANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
};

function makePayloads(): string[] {
  const rng = seeded(42);
  const out: string[] = [];
  // Numeric, alphanumeric, byte (ASCII + UTF-8) across sizes near boundaries.
  for (let i = 0; i < 60; i++) {
    const n = 1 + Math.floor(rng() * 120);
    out.push(
      Array.from({ length: n }, () => String(Math.floor(rng() * 10))).join(''),
      Array.from({ length: n }, () => ALPHANUM[Math.floor(rng() * ALPHANUM.length)]).join(''),
      Array.from({ length: n }, () => String.fromCharCode(32 + Math.floor(rng() * 95))).join(''),
    );
  }
  // UTF-8 multibyte payloads.
  out.push('héllo wörld', '日本語', '✓ done — ünïcode', 'Ñoño');
  // Exact capacity edges for small versions.
  for (const level of ['L', 'M', 'Q', 'H'] as const) {
    out.push('9'.repeat(qrCapacity(1, level, 'numeric')));
    out.push('A'.repeat(qrCapacity(2, level, 'alphanumeric')));
    out.push('b'.repeat(qrCapacity(3, level, 'byte')));
  }
  return out;
}

describe('roundtrip', () => {
  it('decodes ~200 varied payloads back to the exact input', () => {
    const payloads = makePayloads();
    for (const payload of payloads) {
      const matrix = encodeQr(payload);
      expect(decode(matrix), `payload ${JSON.stringify(payload.slice(0, 40))}… v${matrix.version}`).toBe(payload);
    }
  });

  it('decodes every forced mask 0–7', () => {
    for (let mask = 0; mask < 8; mask++) {
      const m = encodeQr('MASK TEST 0123456789', { mask });
      expect(m.mask).toBe(mask);
      expect(decode(m)).toBe('MASK TEST 0123456789');
    }
  });

  it('decodes at every EC level', () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      const m = encodeQr('ERROR CORRECTION LEVEL TEST', { errorCorrection: level });
      expect(m.errorCorrection).toBe(level);
      expect(decode(m)).toBe('ERROR CORRECTION LEVEL TEST');
    }
  });

  it('decodes max-capacity payloads at v20/v30/v40 for each EC level', () => {
    for (const version of [20, 30, 40])
      for (const level of ['L', 'M', 'Q', 'H'] as const) {
        const size = qrCapacity(version, level, 'byte');
        const payload = 'x'.repeat(size);
        const m = encodeQr(payload, { errorCorrection: level });
        expect(m.version).toBe(version);
        expect(decode(m)).toBe(payload);
      }
  });

  it('decodes a version-pinned and minVersion-pinned symbol', () => {
    expect(decode(encodeQr('pinned v10', { version: 10 }))).toBe('pinned v10');
    expect(decode(encodeQr('floored v5', { minVersion: 5 }))).toBe('floored v5');
  });

  it('decodes Uint8Array input', () => {
    const m = encodeQr(new TextEncoder().encode('binary input ✓'));
    expect(decode(m)).toBe('binary input ✓');
  });
});
