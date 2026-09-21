import { describe, expect, it } from 'vitest';
import { formatInfoBits } from '../_format';
import { buildDataCodewords } from '../_segments';
import { encodeQr } from '../encode';

/**
 * Hand-verified vectors. The canonical worked example ('HELLO WORLD' at
 * version 1-Q, alphanumeric) follows the published ISO tutorial math;
 * '01234567' at 1-M exercises numeric mode and its count indicator.
 * Matrix-level correctness is proven end-to-end by the jsQR decode oracle
 * in `roundtrip.test.ts` — here we pin the intermediate codeword stream.
 */

describe('vectors', () => {
  it('builds the canonical HELLO WORLD v1-Q data codewords', () => {
    // From the worked example: mode 0010, count 000001011, pairs
    // HE/LL/O␣/WO/R, terminator, then EC/11 pads to 13 codewords.
    expect(buildDataCodewords('HELLO WORLD', 'alphanumeric', 1, 'Q')).toEqual([
      0x20, 0x5b, 0x0b, 0x78, 0xd1, 0x72, 0xdc, 0x4d, 0x43, 0x40, 0xec, 0x11, 0xec,
    ]);
  });

  it('builds the 01234567 v1-M numeric data codewords', () => {
    expect(buildDataCodewords('01234567', 'numeric', 1, 'M')).toEqual([
      0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11,
    ]);
  });

  it('encodes HELLO WORLD into a 21×21 v1-Q matrix', () => {
    const m = encodeQr('HELLO WORLD', { errorCorrection: 'Q', version: 1 });
    expect(m.version).toBe(1);
    expect(m.size).toBe(21);
    expect(m.mode).toBe('alphanumeric');
    expect(m.errorCorrection).toBe('Q');
  });

  it('draws finder patterns with dark rings and light centers', () => {
    const m = encodeQr('HELLO WORLD', { mask: 0, version: 1 });
    // Top-left finder: corner dark, center light ring at dist 2.
    expect(m.get(0, 0)).toBe(true); // outer ring
    expect(m.get(1, 1)).toBe(false); // separator-ish light ring
    expect(m.get(3, 3)).toBe(true); // 3×3 dark core
    expect(m.get(20, 0)).toBe(true); // top-right finder corner
    expect(m.get(0, 20)).toBe(true); // bottom-left finder corner
    // Separators around finders are light.
    expect(m.get(7, 0)).toBe(false);
    expect(m.get(0, 7)).toBe(false);
    expect(m.get(7, 7)).toBe(false);
  });

  it('draws alternating timing patterns on row/col 6', () => {
    const m = encodeQr('HELLO WORLD', { mask: 0, version: 1 });
    for (let i = 8; i < m.size - 8; i++) {
      expect(m.get(i, 6)).toBe(i % 2 === 0);
      expect(m.get(6, i)).toBe(i % 2 === 0);
    }
  });

  it('sets the always-dark module at (8, size−8)', () => {
    const m = encodeQr('HELLO WORLD', { mask: 0, version: 1 });
    expect(m.get(8, m.size - 8)).toBe(true);
  });

  it('writes identical format information in both copies', () => {
    const m = encodeQr('HELLO WORLD', { errorCorrection: 'Q', mask: 6, version: 1 });
    const bits = formatInfoBits('Q', 6);
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    // First copy beside the top-left finder.
    for (let i = 0; i <= 5; i++) expect(m.get(8, i)).toBe(bit(i));
    expect(m.get(8, 7)).toBe(bit(6));
    expect(m.get(8, 8)).toBe(bit(7));
    expect(m.get(7, 8)).toBe(bit(8));
    for (let i = 9; i < 15; i++) expect(m.get(14 - i, 8)).toBe(bit(i));
    // Second copy: row 8 beside top-right, column 8 beside bottom-left.
    for (let i = 0; i < 8; i++) expect(m.get(m.size - 1 - i, 8)).toBe(bit(i));
    for (let i = 8; i < 15; i++) expect(m.get(8, m.size - 15 + i)).toBe(bit(i));
  });

  it('produces version information blocks for v≥7', () => {
    const m7 = encodeQr('A'.repeat(80), { mask: 0, version: 7 });
    // Version-info blocks sit at top-right and bottom-left; they are
    // deterministic function modules, identical in both copies.
    const size = m7.size;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      expect(m7.get(a, b)).toBe(m7.get(b, a));
    }
  });

  it('honors a forced mask deterministically', () => {
    const a = encodeQr('HELLO WORLD', { mask: 3 });
    const b = encodeQr('HELLO WORLD', { mask: 3 });
    expect(a.mask).toBe(3);
    expect(a.modules).toEqual(b.modules);
  });
});
