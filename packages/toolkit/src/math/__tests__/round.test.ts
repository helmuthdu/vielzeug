import { round } from '../round';

describe('round', () => {
  it('should round to the nearest integer by default', () => {
    expect(round(123.456)).toBe(123);
    expect(round(123.654)).toBe(124);
  });

  it('should round to the specified precision', () => {
    expect(round(123.456, 1)).toBe(123.5);
    expect(round(123.456, 2)).toBe(123.46);
    expect(round(123.456, -1)).toBe(120);
    expect(round(123.456, -2)).toBe(100);
  });

  it('should use the provided rounding function', () => {
    expect(round(123.456, 1, Math.floor)).toBe(123.4);
    expect(round(123.456, 1, Math.ceil)).toBe(123.5);
    expect(round(123.456, -1, Math.floor)).toBe(120);
    expect(round(123.456, -1, Math.ceil)).toBe(130);
  });

  it('should handle precision limits', () => {
    expect(round(123.456, -324)).toBe(0); // Precision below -323
    expect(round(123.456, 293)).toBe(123.456); // Precision above 292
  });

  it('should handle edge cases', () => {
    expect(round(0)).toBe(0);
    expect(round(-123.456)).toBe(-123);
    expect(round(-123.456, 1)).toBe(-123.5);
    expect(round(-123.456, -1)).toBe(-120);
  });

  it('should handle very large and very small numbers', () => {
    expect(round(1e10, -5)).toBe(10000000000);
    expect(round(1e-10, 10)).toBe(1e-10);
  });
});
