import { describe, expect, test } from 'vitest';

import { v } from '../v';

describe('StringSchema - new format validators', () => {
  test('cuid() accepts valid-looking CUIDs', () => {
    expect(v.string().cuid().safeParse('c1234567890').success).toBe(true);
    expect(v.string().cuid().safeParse('notcuid').success).toBe(false);
    expect(v.string().cuid().safeParse('C1234567890').success).toBe(false);
  });

  test('cuid2() accepts 24-char lower-alphanumeric starting with a letter', () => {
    expect(v.string().cuid2().safeParse('a23456789012345678901234').success).toBe(true);
    expect(v.string().cuid2().safeParse('too-short').success).toBe(false);
  });

  test('ulid() validates ULID format', () => {
    expect(v.string().ulid().safeParse('01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true);
    expect(v.string().ulid().safeParse('not-ulid').success).toBe(false);
  });

  test('nanoid() accepts valid NanoID strings', () => {
    expect(v.string().nanoid().safeParse('V1StGXR8_Z5jdHi6B-myT').success).toBe(true);
    expect(v.string().nanoid().safeParse('short').success).toBe(false);
  });

  test('base64() validates base64 strings', () => {
    expect(v.string().base64().safeParse('SGVsbG8=').success).toBe(true);
    expect(v.string().base64().safeParse('not!base64$$').success).toBe(false);
    expect(v.string().base64().safeParse('').success).toBe(false);
  });

  test('base64url() validates url-safe base64', () => {
    expect(v.string().base64url().safeParse('SGVsbG8').success).toBe(true);
    expect(v.string().base64url().safeParse('bad base64!').success).toBe(false);
  });

  test('hex() validates hex strings', () => {
    expect(v.string().hex().safeParse('deadBEEF').success).toBe(true);
    expect(v.string().hex().safeParse('nothex').success).toBe(false);
  });

  test('hexColor() validates hex color codes', () => {
    expect(v.string().hexColor().safeParse('#abc').success).toBe(true);
    expect(v.string().hexColor().safeParse('#aabbcc').success).toBe(true);
    expect(v.string().hexColor().safeParse('aabbcc').success).toBe(false);
    expect(v.string().hexColor().safeParse('#gg0000').success).toBe(false);
  });

  test('emoji() validates emoji strings', () => {
    expect(v.string().emoji().safeParse('😀').success).toBe(true);
    expect(v.string().emoji().safeParse('not emoji').success).toBe(false);
  });

  test('jwt() validates JWT structure', () => {
    expect(v.string().jwt().safeParse('aaa.bbb.ccc').success).toBe(true);
    expect(v.string().jwt().safeParse('aaa.bbb').success).toBe(false);
  });

  test('time() validates HH:MM and HH:MM:SS', () => {
    expect(v.string().time().safeParse('09:30').success).toBe(true);
    expect(v.string().time().safeParse('23:59:59').success).toBe(true);
    expect(v.string().time().safeParse('25:00').success).toBe(false);
  });

  test('duration() validates ISO 8601 durations', () => {
    expect(v.string().duration().safeParse('PT2H30M').success).toBe(true);
    expect(v.string().duration().safeParse('P1Y').success).toBe(true);
    expect(v.string().duration().safeParse('not-duration').success).toBe(false);
  });

  test('semver() validates semantic versions', () => {
    expect(v.string().semver().safeParse('1.0.0').success).toBe(true);
    expect(v.string().semver().safeParse('1.0.0-alpha.1').success).toBe(true);
    expect(v.string().semver().safeParse('01.0.0').success).toBe(false);
  });

  test('slug() validates url-friendly slugs', () => {
    expect(v.string().slug().safeParse('hello-world').success).toBe(true);
    expect(v.string().slug().safeParse('hello world').success).toBe(false);
    expect(v.string().slug().safeParse('-starts-with-dash').success).toBe(false);
  });

  test('numeric() validates numeric strings', () => {
    expect(v.string().numeric().safeParse('42').success).toBe(true);
    expect(v.string().numeric().safeParse('-3.14').success).toBe(true);
    expect(v.string().numeric().safeParse('1e10').success).toBe(true);
    expect(v.string().numeric().safeParse('not-a-number').success).toBe(false);
  });
});

describe('NumberSchema.finite()', () => {
  test('accepts finite numbers', () => {
    expect(v.number().finite().parse(42)).toBe(42);
    expect(v.number().finite().parse(-1.5)).toBe(-1.5);
    expect(v.number().finite().parse(0)).toBe(0);
  });

  test('rejects Infinity and -Infinity', () => {
    expect(v.number().finite().safeParse(Infinity).success).toBe(false);
    expect(v.number().finite().safeParse(-Infinity).success).toBe(false);
  });
});

describe('Schema.readonly()', () => {
  test('parse returns same value at runtime', () => {
    const result = v.object({ id: v.number() }).readonly().parse({ id: 1 });

    expect(result).toEqual({ id: 1 });
  });

  test('schema.readonly() works on composed schemas', () => {
    const schema = v.array(v.string()).readonly();

    expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('InferInput type utility', () => {
  test('coerce schemas accept unknown input at runtime', () => {
    // Type test: coerce.number() should accept string input at runtime
    expect(v.coerce.number().parse('42')).toBe(42);
    expect(v.coerce.boolean().parse('true')).toBe(true);
    expect(v.coerce.date().parse('2024-01-01')).toBeInstanceOf(Date);
    expect(v.coerce.bigint().parse('10')).toBe(10n);
  });
});
