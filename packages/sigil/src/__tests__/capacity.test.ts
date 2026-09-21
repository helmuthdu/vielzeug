import { describe, expect, it } from 'vitest';
import { encodeQr, qrCapacity } from '../encode';
import { SigilCapacityError, SigilOptionError } from '../errors';

describe('capacity', () => {
  it('matches ISO Table 7 spot values', () => {
    expect(qrCapacity(1, 'L', 'numeric')).toBe(41);
    expect(qrCapacity(1, 'L', 'alphanumeric')).toBe(25);
    expect(qrCapacity(1, 'L', 'byte')).toBe(17);
    expect(qrCapacity(1, 'H', 'byte')).toBe(7);
    expect(qrCapacity(10, 'M', 'byte')).toBe(213);
    expect(qrCapacity(40, 'L', 'byte')).toBe(2953);
    expect(qrCapacity(40, 'L', 'numeric')).toBe(7089);
    expect(qrCapacity(40, 'L', 'alphanumeric')).toBe(4296);
  });

  it('picks the smallest version that fits', () => {
    expect(encodeQr('1').version).toBe(1);
    // 18 bytes exceeds v1-L byte capacity (17) → v2.
    expect(encodeQr('a'.repeat(18), { errorCorrection: 'L' }).version).toBe(2);
    // Exactly at capacity stays at v1.
    expect(encodeQr('a'.repeat(17), { errorCorrection: 'L' }).version).toBe(1);
  });

  it('honors minVersion as a floor', () => {
    const m = encodeQr('hi', { minVersion: 5 });
    expect(m.version).toBe(5);
    expect(m.size).toBe(37);
  });

  it('honors a pinned version', () => {
    const m = encodeQr('hi', { version: 10 });
    expect(m.version).toBe(10);
    expect(m.size).toBe(57);
  });

  it('throws SigilCapacityError when a pinned version is too small', () => {
    expect(() => encodeQr('a'.repeat(20), { errorCorrection: 'L', version: 1 })).toThrow(SigilCapacityError);
  });

  it('throws SigilCapacityError beyond v40', () => {
    const tooBig = 'a'.repeat(qrCapacity(40, 'L', 'byte') + 1);
    expect(() => encodeQr(tooBig)).toThrow(SigilCapacityError);
  });

  it('includes limits in the capacity error', () => {
    try {
      encodeQr('a'.repeat(20), { version: 1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SigilCapacityError);
      const e = error as SigilCapacityError;
      expect(e.version).toBe(1);
      expect(e.maxBytes).toBeGreaterThan(0);
      expect(e.bytes).toBe(20);
      expect(e.message).toMatch(/capacity/i);
    }
  });

  it('rejects out-of-range options', () => {
    expect(() => encodeQr('x', { version: 0 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { version: 41 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { minVersion: 41 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { mask: 8 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { mask: -1 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { minVersion: 5, version: 2 })).toThrow(SigilOptionError);
    expect(() => encodeQr('x', { errorCorrection: 'Z' as 'L' })).toThrow(SigilOptionError);
    expect(() => encodeQr('')).toThrow(SigilOptionError);
  });

  it('rejects a forced mode that cannot hold the input', () => {
    expect(() => encodeQr('abc', { mode: 'numeric' })).toThrow(SigilOptionError);
    expect(() => encodeQr('abc', { mode: 'alphanumeric' })).toThrow(SigilOptionError);
  });

  it('accepts Uint8Array input', () => {
    const m = encodeQr(new TextEncoder().encode('hello'));
    expect(m.mode).toBe('byte');
    expect(m.version).toBe(1);
  });
});
