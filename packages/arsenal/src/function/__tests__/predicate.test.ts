import { allOf, anyOf, noneOf } from '../predicate';

describe('allOf', () => {
  it('returns true when every predicate matches', () => {
    const isPositive = (n: number) => n > 0;
    const isEven = (n: number) => n % 2 === 0;

    expect([1, 2, 3, 4].filter(allOf(isPositive, isEven))).toEqual([2, 4]);
  });

  it('returns false when any predicate fails', () => {
    const isPositive = (n: number) => n > 0;
    const isEven = (n: number) => n % 2 === 0;

    expect(allOf(isPositive, isEven)(3, 0, [3])).toBe(false);
  });

  it('returns true for all values when called with zero predicates', () => {
    expect([1, 2, 3].filter(allOf())).toEqual([1, 2, 3]);
  });

  it('passes index and array to each predicate', () => {
    const atIndex1 = (_: number, i: number) => i === 1;

    expect([10, 20, 30].filter(allOf(atIndex1))).toEqual([20]);
  });

  it('short-circuits on first failing predicate', () => {
    const calls: string[] = [];
    const p1 = (n: number) => {
      calls.push('p1');

      return n > 0;
    };
    const p2 = (n: number) => {
      calls.push('p2');

      return n > 100;
    };

    allOf(p1, p2)(-1, 0, [-1]);
    expect(calls).toEqual(['p1']); // p2 not called because p1 failed
  });
});

describe('anyOf', () => {
  it('returns true when at least one predicate matches', () => {
    const isOne = (n: number) => n === 1;
    const isThree = (n: number) => n === 3;

    expect([1, 2, 3, 4].filter(anyOf(isOne, isThree))).toEqual([1, 3]);
  });

  it('returns false when no predicate matches', () => {
    const isNegative = (n: number) => n < 0;

    expect(anyOf(isNegative)(5, 0, [5])).toBe(false);
  });

  it('returns false for all values when called with zero predicates', () => {
    expect([1, 2, 3].filter(anyOf())).toEqual([]);
  });

  it('short-circuits on first matching predicate', () => {
    const calls: string[] = [];
    const p1 = (n: number) => {
      calls.push('p1');

      return n > 0;
    };
    const p2 = (n: number) => {
      calls.push('p2');

      return n > 100;
    };

    anyOf(p1, p2)(5, 0, [5]);
    expect(calls).toEqual(['p1']); // p2 not called because p1 matched
  });
});

describe('noneOf', () => {
  it('returns true when no predicate matches (single predicate — equivalent to NOT)', () => {
    const isEven = (n: number) => n % 2 === 0;

    expect([1, 2, 3, 4].filter(noneOf(isEven))).toEqual([1, 3]);
  });

  it('returns true only when all predicates fail (multi-predicate)', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isGreaterThan3 = (n: number) => n > 3;

    // Only 1 and 3 are neither even nor > 3
    expect([1, 2, 3, 4, 5].filter(noneOf(isEven, isGreaterThan3))).toEqual([1, 3]);
  });

  it('returns true for all values when called with zero predicates', () => {
    expect([1, 2, 3].filter(noneOf())).toEqual([1, 2, 3]);
  });

  it('passes index and array to each predicate', () => {
    const atIndex0 = (_: number, i: number) => i === 0;

    // noneOf(atIndex0) → true for all except index 0
    expect([10, 20, 30].filter(noneOf(atIndex0))).toEqual([20, 30]);
  });
});
