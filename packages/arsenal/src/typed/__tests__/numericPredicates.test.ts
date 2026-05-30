import { isGreaterThan } from '../isGreaterThan';
import { isGreaterThanOrEqual } from '../isGreaterThanOrEqual';
import { isLessThan } from '../isLessThan';
import { isLessThanOrEqual } from '../isLessThanOrEqual';
import { isNumber } from '../isNumber';
import { isWithin } from '../isWithin';

describe('numeric predicates', () => {
  it('checks numeric type guards', () => {
    expect(isNumber(2)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
  });

  it('checks ranges and comparisons', () => {
    expect(isWithin(5, 1, 10)).toBe(true);
    expect(isGreaterThan(5, 4)).toBe(true);
    expect(isGreaterThanOrEqual(5, 5)).toBe(true);
    expect(isLessThan(4, 5)).toBe(true);
    expect(isLessThanOrEqual(5, 5)).toBe(true);
  });

  it('rejects non-numbers', () => {
    expect(isNumber('2')).toBe(false);
    expect(isGreaterThan(null, 1)).toBe(false);
    expect(isGreaterThan(undefined, 1)).toBe(false);
  });
});
