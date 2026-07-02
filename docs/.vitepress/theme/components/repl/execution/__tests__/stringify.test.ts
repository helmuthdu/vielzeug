import { describe, expect, it } from 'vitest';

import { stringify } from '../stringify';

describe('stringify', () => {
  it('formats undefined and null', () => {
    expect(stringify(undefined)).toBe('undefined');
    expect(stringify(null)).toBe('null');
  });

  it('wraps strings in single quotes', () => {
    expect(stringify('hello')).toBe("'hello'");
  });

  it('passes through numbers and booleans via String()', () => {
    expect(stringify(42)).toBe('42');
    expect(stringify(true)).toBe('true');
  });

  it('formats Date instances', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');

    expect(stringify(date)).toBe('Date(2024-01-01T00:00:00.000Z)');
  });

  it('formats Error instances as "Error: <message>"', () => {
    expect(stringify(new Error('boom'))).toBe('Error: boom');
  });

  it('formats RegExp instances via their string form', () => {
    expect(stringify(/abc/gi)).toBe('/abc/gi');
  });

  it('pretty-prints plain objects and arrays as JSON', () => {
    expect(stringify({ a: 1 })).toBe('{\n  "a": 1\n}');
    expect(stringify([1, 2, 3])).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('falls back to String() when JSON.stringify throws (circular refs)', () => {
    const circular: Record<string, unknown> = {};

    circular['self'] = circular;
    expect(stringify(circular)).toBe(String(circular));
  });
});
