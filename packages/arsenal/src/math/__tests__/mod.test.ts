import { mod } from '../mod';

describe('mod', () => {
  it('returns the sign-correct modulo for positive operands', () => {
    expect(mod(7, 3)).toBe(1);
    expect(mod(10, 5)).toBe(0);
  });

  it('returns a positive result for negative dividend', () => {
    expect(mod(-1, 5)).toBe(4);
    expect(mod(-7, 3)).toBe(2);
  });

  it('returns a positive result for negative divisor', () => {
    expect(mod(7, -3)).toBe(-2);
  });

  it('returns NaN when divisor is 0', () => {
    expect(mod(5, 0)).toBeNaN();
  });

  it('returns 0 when dividend is 0', () => {
    expect(mod(0, 5)).toBe(0);
  });

  it('handles large numbers', () => {
    expect(mod(1_000_001, 1000)).toBe(1);
  });
});
