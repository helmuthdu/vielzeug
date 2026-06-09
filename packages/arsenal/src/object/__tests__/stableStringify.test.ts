import { describe, expect, it } from 'vitest';

import { stableStringify } from '../stableStringify';

describe('stableStringify', () => {
  it('handles plain objects with sorted keys', () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('handles arrays', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles Date', () => {
    expect(stableStringify(new Date('2024-01-01T00:00:00.000Z'))).toBe('[Date:2024-01-01T00:00:00.000Z]');
  });

  it('handles Set (sorted)', () => {
    expect(stableStringify(new Set([3, 1, 2]))).toBe('[Set:1,2,3]');
  });

  it('handles Map', () => {
    const m = new Map([
      ['b', 2],
      ['a', 1],
    ]);

    expect(stableStringify(m)).toBe('[Map:"a"=>1,"b"=>2]');
  });

  it('handles bigint', () => {
    expect(stableStringify(9007199254740992n)).toBe('9007199254740992n');
  });

  it('handles null and undefined', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(undefined)).toBe('undefined');
  });

  it('falls back to String() for class instances by default', () => {
    class Foo {
      toString() {
        return 'foo-instance';
      }
    }

    expect(stableStringify(new Foo())).toBe('foo-instance');
  });

  it('throws TypeError for class instances when strict: true', () => {
    class Bar {}

    expect(() => stableStringify(new Bar(), { strict: true })).toThrowError(TypeError);
  });

  it('strict: false (default) does not throw for class instances', () => {
    class Baz {
      toString() {
        return 'baz';
      }
    }

    expect(() => stableStringify(new Baz())).not.toThrow();
  });

  it('does not stack overflow on circular references — security regression', () => {
    const a: Record<string, unknown> = { x: 1 };

    a['self'] = a;
    expect(() => stableStringify(a)).not.toThrow();
    expect(stableStringify(a)).toContain('[Circular]');
  });

  it('handles circular arrays without stack overflow', () => {
    const arr: unknown[] = [1, 2];

    arr.push(arr);
    expect(() => stableStringify(arr)).not.toThrow();
    expect(stableStringify(arr)).toContain('[Circular]');
  });
});
