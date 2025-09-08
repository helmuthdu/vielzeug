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
    expect(() => random(min, max)).toThrowError('Minimum value must be less than maximum value');
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
});
