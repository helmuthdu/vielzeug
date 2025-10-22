import { lt } from '../lt';

describe('lt', () => {
  it('returns true when the first number is less than the second', () => {
    expect(lt(3, 5)).toBe(true);
    expect(lt(-100, 100)).toBe(true);
    expect(lt(0, 0.1)).toBe(true);
  });

  it('returns false when the first number is equal to the second', () => {
    expect(lt(5, 5)).toBe(false);
    expect(lt(0, 0)).toBe(false);
    expect(lt(-10, -10)).toBe(false);
  });

  it('returns false when the first number is greater than the second', () => {
    expect(lt(5, 3)).toBe(false);
    expect(lt(100, -100)).toBe(false);
    expect(lt(1, 0)).toBe(false);
  });

  it('returns false if either argument is not a number', () => {
    expect(lt('5', 3)).toBe(false);
    expect(lt(5, '3')).toBe(false);
    expect(lt('5', '3')).toBe(false);
    expect(lt({}, 1)).toBe(false);
    expect(lt(1, {})).toBe(false);
    expect(lt([], 1)).toBe(false);
    expect(lt(1, [])).toBe(false);
    expect(lt(null, 1)).toBe(false);
    expect(lt(1, null)).toBe(false);
    expect(lt(undefined, 1)).toBe(false);
    expect(lt(1, undefined)).toBe(false);
    expect(lt(true, 1)).toBe(false);
    expect(lt(1, false)).toBe(false);
    expect(lt(() => 1, 1)).toBe(false);
    expect(lt(1, () => 1)).toBe(false);
  });

  it('handles special number values', () => {
    expect(lt(Number.NaN, 1)).toBe(false);
    expect(lt(1, Number.NaN)).toBe(false);
    expect(lt(Number.NaN, Number.NaN)).toBe(false);
    expect(lt(Number.POSITIVE_INFINITY, 1)).toBe(false);
    expect(lt(1, Number.POSITIVE_INFINITY)).toBe(true);
    expect(lt(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(false);
    expect(lt(Number.NEGATIVE_INFINITY, 1)).toBe(true);
    expect(lt(1, Number.NEGATIVE_INFINITY)).toBe(false);
    expect(lt(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(false);
  });
});
