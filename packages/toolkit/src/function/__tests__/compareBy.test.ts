import { compareBy } from '../compareBy';

describe('compareBy', () => {
  type Person = { name: string; age: number; score?: number | undefined };

  const alice = { age: 30, name: 'Alice', score: 90 };
  const bob = { age: 25, name: 'Bob', score: 80 };
  const carol = { age: 25, name: 'Carol', score: undefined };
  const dave = { age: 30, name: 'Dave', score: 90 };

  it('sorts by a single key ascending', () => {
    const arr = [bob, alice, carol];
    arr.sort(compareBy<Person>({ name: 'asc' }));
    expect(arr).toEqual([alice, bob, carol]);
  });

  it('sorts by a single key descending', () => {
    const arr = [bob, alice, carol];
    arr.sort(compareBy<Person>({ name: 'desc' }));
    expect(arr).toEqual([carol, bob, alice]);
  });

  it('sorts by multiple keys (asc, desc)', () => {
    const arr = [alice, bob, carol, dave];
    arr.sort(compareBy<Person>({ age: 'asc', name: 'desc' }));
    expect(arr).toEqual([carol, bob, dave, alice]);
  });

  it('returns 0 for equal objects on all compared keys', () => {
    const cmp = compareBy<Person>({ age: 'asc', name: 'asc' });
    expect(cmp(alice, { ...alice })).toBe(0);
  });

  it('sorts by a key with undefined values', () => {
    const arr = [bob, carol, alice];
    arr.sort(compareBy<Person>({ score: 'asc' }));
    expect(arr).toEqual([bob, alice, carol]);
  });

  it('returns 0 if selectors is empty', () => {
    const cmp = compareBy<Person>({});
    expect(cmp(alice, bob)).toBe(0);
    expect(cmp(alice, alice)).toBe(0);
  });

  it('handles missing keys gracefully', () => {
    const arr = [alice, bob];
    arr.sort(compareBy<Person>({ score: 'desc' }));
    expect(arr).toEqual([alice, bob]);
  });

  it('sorts by multiple keys with mixed directions', () => {
    const arr = [alice, bob, carol, dave];
    arr.sort(compareBy<Person>({ age: 'desc', name: 'asc' }));
    expect(arr).toEqual([alice, dave, bob, carol]);
  });
});
