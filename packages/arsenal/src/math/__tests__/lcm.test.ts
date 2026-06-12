import { lcm } from '../lcm';

describe('lcm', () => {
  it('returns the least common multiple of two positives', () => {
    expect(lcm(6, 8)).toBe(24);
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(3, 5)).toBe(15);
  });

  it('handles negative inputs (returns positive result)', () => {
    expect(lcm(-6, 8)).toBe(24);
    expect(lcm(6, -8)).toBe(24);
    expect(lcm(-6, -8)).toBe(24);
  });

  it('returns 0 when either input is 0', () => {
    expect(lcm(0, 5)).toBe(0);
    expect(lcm(5, 0)).toBe(0);
    expect(lcm(0, 0)).toBe(0);
  });

  it('returns the larger number when one divides the other', () => {
    expect(lcm(4, 12)).toBe(12);
    expect(lcm(7, 1)).toBe(7);
  });

  it('returns the number itself when equal', () => {
    expect(lcm(5, 5)).toBe(5);
  });
});
