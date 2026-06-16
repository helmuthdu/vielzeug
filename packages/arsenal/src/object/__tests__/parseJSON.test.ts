import { describe, expect, it } from 'vitest';

import { parseJSON } from '../parseJSON';

describe('parseJSON', () => {
  describe('basic parsing', () => {
    it('parses a valid JSON object string', () => {
      expect(parseJSON<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    });

    it('parses a valid JSON array string', () => {
      expect(parseJSON<number[]>('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('parses a valid JSON number string', () => {
      expect(parseJSON<number>('42')).toBe(42);
    });

    it('parses the JSON string "null" to null (valid JSON)', () => {
      expect(parseJSON('null')).toBeNull();
    });

    it('returns undefined for invalid JSON without fallback', () => {
      expect(parseJSON('not json')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(parseJSON('')).toBeUndefined();
    });
  });

  describe('null / undefined input', () => {
    it('returns undefined when input is null and no fallback', () => {
      expect(parseJSON(null)).toBeUndefined();
    });

    it('returns undefined when input is undefined and no fallback', () => {
      expect(parseJSON(undefined)).toBeUndefined();
    });

    it('returns fallback when input is null', () => {
      expect(parseJSON(null, { fallback: 0 })).toBe(0);
    });

    it('returns fallback when input is undefined', () => {
      expect(parseJSON(undefined, { fallback: [] })).toEqual([]);
    });

    it('does NOT return fallback for JSON "null" string (valid parse result)', () => {
      expect(parseJSON('null', { fallback: 99 })).toBeNull();
    });
  });

  describe('fallback option', () => {
    it('returns fallback for invalid JSON', () => {
      expect(parseJSON('bad json', { fallback: {} })).toEqual({});
    });

    it('returns typed fallback', () => {
      type Cfg = { host: string };

      const result = parseJSON<Cfg>('bad', { fallback: { host: 'localhost' } });

      expect(result).toEqual({ host: 'localhost' });
    });
  });

  describe('validator option', () => {
    it('returns parsed value when validator passes', () => {
      const result = parseJSON<{ id: number }>('{"id":1}', {
        validator: (v) => typeof (v as { id: unknown }).id === 'number',
      });

      expect(result).toEqual({ id: 1 });
    });

    it('returns fallback when validator returns false', () => {
      const result = parseJSON<{ id: number }>('{"id":"bad"}', {
        fallback: { id: 0 },
        validator: (v) => typeof (v as { id: unknown }).id === 'number',
      });

      expect(result).toEqual({ id: 0 });
    });

    it('returns undefined when validator fails and no fallback', () => {
      const result = parseJSON('{"x":1}', {
        validator: (v) => typeof (v as { y: unknown }).y === 'number',
      });

      expect(result).toBeUndefined();
    });

    it('validator receives the fully parsed value', () => {
      const received: unknown[] = [];

      parseJSON('{"a":1}', {
        validator: (v) => {
          received.push(v);

          return true;
        },
      });
      expect(received).toEqual([{ a: 1 }]);
    });
  });

  describe('reviver option', () => {
    it('applies the reviver function during JSON.parse', () => {
      const result = parseJSON<{ date: Date }>('{"date":"2024-01-01"}', {
        reviver: (key, value) => (key === 'date' ? new Date(value as string) : value),
      });

      expect(result?.date).toBeInstanceOf(Date);
    });
  });
});
