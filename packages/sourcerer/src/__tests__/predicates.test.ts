import { allOf as and, anyOf as or, not } from '@vielzeug/arsenal';

describe('predicates', () => {
  it('negates a predicate with not()', () => {
    const isEven = (n: number) => n % 2 === 0;
    const isOdd = not(isEven);

    expect([1, 2, 3, 4].filter(isOdd)).toEqual([1, 3]);
  });

  it('combines predicates with and()', () => {
    const gt = (n: number) => n > 2;
    const lt = (n: number) => n < 5;

    expect([1, 2, 3, 4, 5].filter(and(gt, lt))).toEqual([3, 4]);
  });

  it('combines predicates with or()', () => {
    const isOne = (n: number) => n === 1;
    const isFive = (n: number) => n === 5;

    expect([1, 2, 3, 4, 5].filter(or(isOne, isFive))).toEqual([1, 5]);
  });

  it('chains multiple compositions', () => {
    const isEven = (n: number) => n % 2 === 0;
    const gt = (n: number) => n > 2;

    expect([1, 2, 3, 4, 5, 6].filter(and(not(isEven), gt))).toEqual([3, 5]);
  });
});
