import { describe, expect, it } from 'vitest';

import { allOf, anyOf, noneOf, not } from '../combinators';

describe('allOf', () => {
  const isPositive = (n: number) => n > 0;
  const isEven = (n: number) => n % 2 === 0;

  it('returns true when all predicates pass', () => {
    expect(allOf(isPositive, isEven)(4)).toBe(true);
  });

  it('returns false when any predicate fails', () => {
    expect(allOf(isPositive, isEven)(3)).toBe(false);
    expect(allOf(isPositive, isEven)(-2)).toBe(false);
  });

  it('zero predicates → true for all values (vacuous truth)', () => {
    const alwaysTrue = allOf<number>();

    expect(alwaysTrue(0)).toBe(true);
    expect(alwaysTrue(-999)).toBe(true);
  });

  it('single predicate behaves like the predicate', () => {
    expect(allOf(isEven)(2)).toBe(true);
    expect(allOf(isEven)(3)).toBe(false);
  });

  it('works as array filter predicate', () => {
    expect([1, 2, 3, 4].filter(allOf(isPositive, isEven))).toEqual([2, 4]);
  });
});

describe('anyOf', () => {
  const isZero = (n: number) => n === 0;
  const isNegative = (n: number) => n < 0;

  it('returns true when at least one predicate passes', () => {
    expect(anyOf(isZero, isNegative)(0)).toBe(true);
    expect(anyOf(isZero, isNegative)(-5)).toBe(true);
  });

  it('returns false when all predicates fail', () => {
    expect(anyOf(isZero, isNegative)(5)).toBe(false);
  });

  it('zero predicates → false for all values (vacuous falsity)', () => {
    const neverTrue = anyOf<number>();

    expect(neverTrue(0)).toBe(false);
    expect(neverTrue(999)).toBe(false);
  });

  it('single predicate behaves like the predicate', () => {
    expect(anyOf(isZero)(0)).toBe(true);
    expect(anyOf(isZero)(1)).toBe(false);
  });

  it('works as array filter predicate', () => {
    expect([-1, 0, 1, 2].filter(anyOf(isZero, isNegative))).toEqual([-1, 0]);
  });
});

describe('noneOf', () => {
  const isNegative = (n: number) => n < 0;
  const isZero = (n: number) => n === 0;

  it('returns true when no predicate passes', () => {
    expect(noneOf(isNegative, isZero)(5)).toBe(true);
  });

  it('returns false when any predicate passes', () => {
    expect(noneOf(isNegative, isZero)(0)).toBe(false);
    expect(noneOf(isNegative, isZero)(-1)).toBe(false);
  });

  it('zero predicates → true for all values (vacuous truth)', () => {
    const alwaysTrue = noneOf<number>();

    expect(alwaysTrue(0)).toBe(true);
    expect(alwaysTrue(-999)).toBe(true);
  });

  it('single predicate is equivalent to NOT', () => {
    expect(noneOf(isZero)(0)).toBe(false);
    expect(noneOf(isZero)(1)).toBe(true);
  });

  it('works as array filter predicate', () => {
    expect([1, 2, 3, 4].filter(noneOf((n) => n % 2 === 0))).toEqual([1, 3]);
  });
});

describe('not', () => {
  const isEven = (n: number) => n % 2 === 0;

  it('negates a predicate', () => {
    expect(not(isEven)(3)).toBe(true);
    expect(not(isEven)(4)).toBe(false);
  });

  it('is equivalent to noneOf with a single predicate', () => {
    expect([1, 2, 3, 4].filter(not(isEven))).toEqual([1, 3]);
  });

  it('double negation returns the original predicate result', () => {
    expect(not(not(isEven))(4)).toBe(true);
    expect(not(not(isEven))(3)).toBe(false);
  });

  it('works with type guards (structural check)', () => {
    const isString = (v: unknown): v is string => typeof v === 'string';
    const isNotString = not(isString);

    expect(isNotString(1)).toBe(true);
    expect(isNotString('a')).toBe(false);
  });
});
