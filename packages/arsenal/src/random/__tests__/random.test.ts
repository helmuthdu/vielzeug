/**
 * @jest-environment jsdom
 */
import { random } from '../random';

describe('random', () => {
  it('should return a number within the specified range', () => {
    const min = 1;
    const max = 10;
    const result = random(min, max);

    expect(result).toBeGreaterThanOrEqual(min);
    expect(result).toBeLessThanOrEqual(max);
  });

  it('should throw an error if min is greater than max', () => {
    const min = 10;
    const max = 1;

    expect(() => random(min, max)).toThrowError('random: minimum value must not be greater than maximum value');
  });

  it('should handle edge case where min equals max', () => {
    const min = 5;
    const max = 5;
    const result = random(min, max);

    expect(result).toBe(min);
  });

  it('should return an integer value', () => {
    const min = 1;
    const max = 100;
    const result = random(min, max);

    expect(Number.isInteger(result)).toBe(true);
  });

  it('should return a value within a negative range', () => {
    const min = -10;
    const max = -1;
    const result = random(min, max);

    expect(result).toBeGreaterThanOrEqual(min);
    expect(result).toBeLessThanOrEqual(max);
    expect(Number.isInteger(result)).toBe(true);
  });

  it('does not enforce the documented "integer" contract for fractional bounds', () => {
    // min/max are not validated as integers, so the `min` offset carries its fractional
    // part straight into the result — the JSDoc's "random integer" promise does not hold here.
    const result = random(1.5, 1.9);

    expect([1.5, 2.5]).toContain(result);
  });

  it('should propagate NaN rather than throw or silently coerce', () => {
    expect(Number.isNaN(random(Number.NaN, 10))).toBe(true);
  });
});
