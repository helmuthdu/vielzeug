import { stableStringify } from '../serialize';

describe('stableStringify', () => {
  it('serializes common structured query-key values deterministically', () => {
    expect(stableStringify(42n)).toBe('42n');
    expect(stableStringify(new Date('2026-05-12T12:34:56.000Z'))).toBe('[Date:2026-05-12T12:34:56.000Z]');
    expect(stableStringify(/foo/gi)).toBe('[RegExp:foo/gi]');
  });

  it('keeps Map and Set order-independent', () => {
    const first = stableStringify(
      new Map([
        ['b', 2],
        ['a', 1],
      ]),
    );
    const second = stableStringify(
      new Map([
        ['a', 1],
        ['b', 2],
      ]),
    );
    const setFirst = stableStringify(new Set([3, 1, 2]));
    const setSecond = stableStringify(new Set([2, 3, 1]));

    expect(first).toBe(second);
    expect(setFirst).toBe(setSecond);
  });
});
