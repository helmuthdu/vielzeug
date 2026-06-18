import { compact } from '../compact';
import { countBy } from '../countBy';
import { difference } from '../difference';
import { drawMany } from '../draw';
import { drop } from '../drop';
import { dropLast } from '../dropLast';
import { first } from '../first';
import { flatten } from '../flatten';
import { intersection } from '../intersection';
import { last } from '../last';
import { partition } from '../partition';
import { take } from '../take';
import { takeLast } from '../takeLast';
import { union } from '../union';
import { unzip } from '../unzip';
import { zip } from '../zip';

describe('array extras', () => {
  it('compacts falsy values', () => {
    expect(compact([0, 1, false, 2, '', 3, null, undefined])).toEqual([1, 2, 3]);
  });

  it('counts by selector', () => {
    expect(countBy(['a', 'bb', 'c'], (item) => item.length)).toEqual({ '1': 2, '2': 1 });
  });

  it('supports set operations', () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(difference([1, 2, 3], [2, 4])).toEqual([1, 3]);
    expect(union([1, 2, 2], [2, 3])).toEqual([1, 2, 3]);
  });

  it('intersection with selector', () => {
    const a = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b = [{ id: 2 }, { id: 4 }];

    expect(intersection(a, b, (x) => x.id)).toEqual([{ id: 2 }]);
  });

  it('difference with selector', () => {
    const a = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const b = [{ id: 2 }];

    expect(difference(a, b, (x) => x.id)).toEqual([{ id: 1 }, { id: 3 }]);
  });

  it('supports edge access and slicing helpers', () => {
    expect(first([1, 2, 3])).toBe(1);
    expect(last([1, 2, 3])).toBe(3);
    expect(first([], 9)).toBe(9);
    expect(last([], 9)).toBe(9);
    expect(take([1, 2, 3, 4], 2)).toEqual([1, 2]);
    expect(drop([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(takeLast([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(dropLast([1, 2, 3, 4], 2)).toEqual([1, 2]);
  });

  it('flattens and partitions arrays', () => {
    expect(flatten([1, [2, [3]]], 1)).toEqual([1, 2, [3]]);
    expect(flatten([1, [2, [3]]], 2)).toEqual([1, 2, 3]);
    expect(partition([1, 2, 3, 4], (item) => item % 2 === 0)).toEqual([
      [2, 4],
      [1, 3],
    ]);
  });

  it('zips and unzips values', () => {
    expect(zip([1, 2], ['a', 'b', 'c'])).toEqual([
      [1, 'a'],
      [2, 'b'],
      [undefined, 'c'],
    ]);
    expect(
      unzip([
        [1, 'a'],
        [2, 'b'],
      ]),
    ).toEqual([
      [1, 2],
      ['a', 'b'],
    ]);
  });

  it('draws unique values without exceeding bounds', () => {
    const result = drawMany([1, 2, 3, 4], 2);

    expect(result).toHaveLength(2);
    expect(new Set(result).size).toBe(2);
    expect(result.every((item) => [1, 2, 3, 4].includes(item))).toBe(true);
  });
});
