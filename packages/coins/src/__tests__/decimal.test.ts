import { describe, expect, it } from 'vitest';

import { decimal } from '../decimal';

describe('decimal', () => {
  it('normalizes and bounds exact decimals', () => {
    expect(decimal('1.0750')).toMatchObject({ denominator: 40n, numerator: 43n });
    expect(decimal('-0.00')).toMatchObject({ denominator: 1n, numerator: 0n });
    expect(() => decimal('1e3')).toThrow(/Invalid decimal/);
    expect(() => decimal(`0.${'1'.repeat(101)}`)).toThrow(/precision/);
    expect(() => decimal('1'.repeat(1001))).toThrow(/too long/);
  });
});
