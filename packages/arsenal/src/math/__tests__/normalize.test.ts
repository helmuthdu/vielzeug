import { normalize } from '../normalize';

describe('normalize', () => {
  it('maps value at min to 0', () => {
    expect(normalize(0, 0, 100)).toBe(0);
    expect(normalize(10, 10, 50)).toBe(0);
  });

  it('maps value at max to 1', () => {
    expect(normalize(100, 0, 100)).toBe(1);
  });

  it('maps midpoint to 0.5', () => {
    expect(normalize(50, 0, 100)).toBe(0.5);
    expect(normalize(15, 10, 20)).toBe(0.5);
  });

  it('clamps values below min to 0', () => {
    expect(normalize(-10, 0, 100)).toBe(0);
  });

  it('clamps values above max to 1', () => {
    expect(normalize(150, 0, 100)).toBe(1);
  });

  it('returns 0 when min === max (degenerate range)', () => {
    expect(normalize(5, 5, 5)).toBe(0);
  });

  it('handles negative ranges', () => {
    expect(normalize(-5, -10, 0)).toBe(0.5);
  });
});
