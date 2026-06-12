import { clamp } from '../clamp';

describe('clamp', () => {
  it('should return the value if it is within the range', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, -10, 10)).toBe(0);
  });

  it('should return the minimum if the value is less than the range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-20, -10, 10)).toBe(-10);
  });

  it('should return the maximum if the value is greater than the range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(25, -10, 10)).toBe(10);
  });

  it('should handle edge cases where the value equals the boundaries', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('should handle negative ranges correctly', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('should return NaN if the value is NaN', () => {
    expect(clamp(Number.NaN, 0, 10)).toBeNaN();
  });
});
