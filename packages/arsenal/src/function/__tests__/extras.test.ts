import { constant } from '../constant';
import { identity } from '../identity';
import { allOf, anyOf, noneOf } from '../predicate';
import { tap } from '../tap';

describe('function extras', () => {
  it('creates stable helper functions', () => {
    expect(identity('x')).toBe('x');
    expect(constant(3)()).toBe(3);
  });

  it('taps values without changing them', () => {
    const seen: number[] = [];

    const result = tap(4, (value) => seen.push(value));

    expect(result).toBe(4);
    expect(seen).toEqual([4]);
  });

  it('combines predicates with allOf/anyOf/noneOf', () => {
    const greaterThanOne = (value: number) => value > 1;
    const lessThanFour = (value: number) => value < 4;

    expect([0, 1, 2, 3, 4].filter(allOf(greaterThanOne, lessThanFour))).toEqual([2, 3]);
    expect([0, 1, 2, 3, 4].filter(anyOf(greaterThanOne, lessThanFour))).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2, 3, 4].filter(noneOf(greaterThanOne))).toEqual([0, 1]);
  });
});
