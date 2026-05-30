import { defaults } from '../defaults';
import { entries } from '../entries';
import { filterValues } from '../filterValues';
import { fromEntries } from '../fromEntries';
import { has } from '../has';
import { invert } from '../invert';
import { keys } from '../keys';
import { mapKeys } from '../mapKeys';
import { mapValues } from '../mapValues';
import { omit } from '../omit';
import { pick } from '../pick';
import { values } from '../values';

describe('object extras', () => {
  it('picks and omits keys', () => {
    const input = { a: 1, b: 2, c: 3 };

    expect(pick(input, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(omit(input, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('maps and filters object entries', () => {
    const input = { a: 1, b: 2 };

    expect(mapValues(input, (value) => value * 2)).toEqual({ a: 2, b: 4 });
    expect(mapKeys(input, (key) => `x_${String(key)}`)).toEqual({ x_a: 1, x_b: 2 });
    expect(filterValues(input, (value) => value > 1)).toEqual({ b: 2 });
  });

  it('provides typed object wrappers', () => {
    const input = { a: 1, b: 2 };

    expect(keys(input)).toEqual(['a', 'b']);
    expect(values(input)).toEqual([1, 2]);
    expect(entries(input)).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(
      fromEntries([
        ['a', 1],
        ['b', 2],
      ]),
    ).toEqual({ a: 1, b: 2 });
  });

  it('supports invert, has, and defaults', () => {
    const input = { a: 'x', b: 'y' };
    const target = { a: 1, b: undefined as number | undefined };

    expect(invert(input)).toEqual({ x: 'a', y: 'b' });
    expect(has(input, 'a')).toBe(true);
    expect(defaults(target, { b: 2, c: 3 } as any)).toEqual({ a: 1, b: 2, c: 3 });
  });
});
