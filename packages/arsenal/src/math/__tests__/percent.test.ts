import { percent } from '../percent';

describe('percent', () => {
  it('calculates basic percentages', () => {
    expect(percent(25, 100)).toBe(25);
    expect(percent(50, 200)).toBe(25);
    expect(percent(0, 100)).toBe(0);
  });

  it('returns 0 when total is 0', () => {
    expect(percent(5, 0)).toBe(0);
    expect(percent(0, 0)).toBe(0);
  });

  it('returns fractional percentages', () => {
    expect(percent(1, 3)).toBeCloseTo(33.333, 3);
  });

  it('handles values greater than total (over 100%)', () => {
    expect(percent(200, 100)).toBe(200);
  });

  it('handles negative values', () => {
    expect(percent(-25, 100)).toBe(-25);
  });
});
