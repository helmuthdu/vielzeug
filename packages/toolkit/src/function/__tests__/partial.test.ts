import { partial } from '../partial';

describe('partial', () => {
  it('preserves the first parameter and return type', () => {
    const append = (items: readonly string[], suffix: string) => items.map((item) => `${item}${suffix}`);
    const appendBang = partial(append, '!');

    expectTypeOf(appendBang).parameters.toEqualTypeOf<[readonly string[]]>();
    expectTypeOf(appendBang).returns.toEqualTypeOf<string[]>();
  });

  it('partially applies trailing arguments', () => {
    const addOffset = (values: readonly number[], offset: number) => values.map((value) => value + offset);
    const addTen = partial(addOffset, 10);

    expect(addTen([1, 2, 3])).toEqual([11, 12, 13]);
  });
});
