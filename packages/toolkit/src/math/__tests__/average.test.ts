/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { average } from '../average';

describe('average', () => {
  it('returns undefined for empty array', () => {
    expect(average([])).toBeUndefined();
  });

  it('calculates average of numbers', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
    expect(average([10, 20, 30])).toBe(20);
  });

  it('calculates average using a callback', () => {
    const arr = [{ v: 2 }, { v: 4 }, { v: 6 }];
    expect(average(arr, (x) => x.v)).toBe(4);
  });

  it('calculates average of Date objects', () => {
    const d1 = new Date('2020-01-01T00:00:00Z');
    const d2 = new Date('2020-01-03T00:00:00Z');
    const d3 = new Date('2020-01-05T00:00:00Z');
    const avg = average([d1, d2, d3]) as Date;
    // The average timestamp should be the mean of the three dates
    const expected = new Date((d1.getTime() + d2.getTime() + d3.getTime()) / 3);
    expect(avg.getTime()).toBe(expected.getTime());
  });

  it('calculates average of Dates using a callback', () => {
    const arr = [{ d: new Date('2020-01-01T00:00:00Z') }, { d: new Date('2020-01-03T00:00:00Z') }];
    const avg = average(arr, (x) => x.d) as Date;
    const expected = new Date((arr[0].d.getTime() + arr[1].d.getTime()) / 2);
    expect(avg.getTime()).toBe(expected.getTime());
  });

  it('returns undefined for unsupported types', () => {
    expect(average(['a', 'b', 'c'] as any)).toBeUndefined();
  });

  it('works with booleans and a callback', () => {
    expect(average([true, false, true], (x) => (x ? 1 : 0))).toBeCloseTo(2 / 3);
  });
});
