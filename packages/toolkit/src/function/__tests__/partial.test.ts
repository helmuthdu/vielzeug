import { partial } from '../partial';

describe('partial', () => {
  it('preserves remaining parameter and return types', () => {
    const append = (prefix: string, items: readonly string[]) => items.map((item) => `${prefix}${item}`);
    const withTag = partial(append, '#');

    expectTypeOf(withTag).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(withTag).returns.toEqualTypeOf<string[]>();
  });

  it('partially applies leading arguments', () => {
    const addOffset = (offset: number, values: readonly number[]) => values.map((value) => value + offset);
    const addTen = partial(addOffset, 10);

    expect(addTen([1, 2, 3])).toEqual([11, 12, 13]);
  });
});
