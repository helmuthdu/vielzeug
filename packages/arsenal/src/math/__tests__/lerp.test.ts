import { lerp } from '../lerp';

describe('lerp', () => {
  it('returns a at t=0 and b at t=1', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('interpolates fractional t correctly', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(lerp(10, 20, 0.75)).toBe(17.5);
  });

  it('extrapolates when t is outside [0, 1]', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('handles negative ranges', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
    expect(lerp(-20, -10, 0.5)).toBe(-15);
  });

  it('returns a when a === b', () => {
    expect(lerp(5, 5, 0.3)).toBe(5);
  });
});
