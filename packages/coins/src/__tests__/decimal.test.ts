import { describe, expect, it } from 'vitest';

import { decimal, roundDivision } from '../_decimal';

describe('decimal', () => {
  it('normalizes and bounds exact decimals', () => {
    expect(decimal('1.0750')).toMatchObject({ denominator: 40n, numerator: 43n });
    expect(decimal('-0.00')).toMatchObject({ denominator: 1n, numerator: 0n });
    expect(() => decimal('1e3')).toThrow(/Invalid decimal/);
    expect(() => decimal(`0.${'1'.repeat(101)}`)).toThrow(/precision/);
    expect(() => decimal('1'.repeat(1001))).toThrow(/too long/);
  });

  it.each([
    ['awayFromZero', 3n, -3n],
    ['ceil', 3n, -2n],
    ['floor', 2n, -3n],
    ['halfAwayFromZero', 3n, -3n],
    ['halfEven', 2n, -2n],
    ['towardZero', 2n, -2n],
  ] as const)('rounds positive and negative values with %s', (mode, positive, negative) => {
    expect(roundDivision(5n, 2n, mode)).toBe(positive);
    expect(roundDivision(-5n, 2n, mode)).toBe(negative);
  });
});
