import { describe, expect, test } from 'vitest';

import { s } from '../s';

describe('StringSchema - new format validators', () => {
  test('cuid() accepts valid-looking CUIDs', () => {
    expect(s.string().cuid().safeParse('c1234567890').success).toBe(true);
    expect(s.string().cuid().safeParse('notcuid').success).toBe(false);
    expect(s.string().cuid().safeParse('C1234567890').success).toBe(false);
  });

  test('cuid2() accepts 24-char lower-alphanumeric starting with a letter', () => {
    expect(s.string().cuid2().safeParse('a23456789012345678901234').success).toBe(true);
    expect(s.string().cuid2().safeParse('too-short').success).toBe(false);
  });

  test('ulid() validates ULID format', () => {
    expect(s.string().ulid().safeParse('01ARZ3NDEKTSV4RRFFQ69G5FAV').success).toBe(true);
    expect(s.string().ulid().safeParse('not-ulid').success).toBe(false);
  });

  test('nanoid() accepts valid NanoID strings', () => {
    expect(s.string().nanoid().safeParse('V1StGXR8_Z5jdHi6B-myT').success).toBe(true);
    expect(s.string().nanoid().safeParse('short').success).toBe(false);
  });

  test('base64() validates base64 strings', () => {
    expect(s.string().base64().safeParse('SGVsbG8=').success).toBe(true);
    expect(s.string().base64().safeParse('not!base64$$').success).toBe(false);
    expect(s.string().base64().safeParse('').success).toBe(false);
  });

  test('base64url() validates url-safe base64', () => {
    expect(s.string().base64url().safeParse('SGVsbG8').success).toBe(true);
    expect(s.string().base64url().safeParse('bad base64!').success).toBe(false);
  });

  test('hex() validates hex strings', () => {
    expect(s.string().hex().safeParse('deadBEEF').success).toBe(true);
    expect(s.string().hex().safeParse('nothex').success).toBe(false);
  });

  test('hexColor() validates hex color codes', () => {
    expect(s.string().hexColor().safeParse('#abc').success).toBe(true);
    expect(s.string().hexColor().safeParse('#aabbcc').success).toBe(true);
    expect(s.string().hexColor().safeParse('aabbcc').success).toBe(false);
    expect(s.string().hexColor().safeParse('#gg0000').success).toBe(false);
  });

  test('emoji() validates emoji strings', () => {
    expect(s.string().emoji().safeParse('😀').success).toBe(true);
    expect(s.string().emoji().safeParse('not emoji').success).toBe(false);
  });

  test('jwt() validates JWT structure', () => {
    expect(s.string().jwt().safeParse('aaa.bbb.ccc').success).toBe(true);
    expect(s.string().jwt().safeParse('aaa.bbb').success).toBe(false);
  });

  test('time() validates HH:MM and HH:MM:SS', () => {
    expect(s.string().time().safeParse('09:30').success).toBe(true);
    expect(s.string().time().safeParse('23:59:59').success).toBe(true);
    expect(s.string().time().safeParse('25:00').success).toBe(false);
  });

  test('duration() validates ISO 8601 durations', () => {
    expect(s.string().duration().safeParse('PT2H30M').success).toBe(true);
    expect(s.string().duration().safeParse('P1Y').success).toBe(true);
    expect(s.string().duration().safeParse('not-duration').success).toBe(false);
  });

  test('semver() validates semantic versions', () => {
    expect(s.string().semver().safeParse('1.0.0').success).toBe(true);
    expect(s.string().semver().safeParse('1.0.0-alpha.1').success).toBe(true);
    expect(s.string().semver().safeParse('01.0.0').success).toBe(false);
  });

  test('slug() validates url-friendly slugs', () => {
    expect(s.string().slug().safeParse('hello-world').success).toBe(true);
    expect(s.string().slug().safeParse('hello world').success).toBe(false);
    expect(s.string().slug().safeParse('-starts-with-dash').success).toBe(false);
  });

  test('numeric() validates numeric strings', () => {
    expect(s.string().numeric().safeParse('42').success).toBe(true);
    expect(s.string().numeric().safeParse('-3.14').success).toBe(true);
    expect(s.string().numeric().safeParse('1e10').success).toBe(true);
    expect(s.string().numeric().safeParse('not-a-number').success).toBe(false);
  });
});

describe('NumberSchema.finite()', () => {
  test('accepts finite numbers', () => {
    expect(s.number().finite().parse(42)).toBe(42);
    expect(s.number().finite().parse(-1.5)).toBe(-1.5);
    expect(s.number().finite().parse(0)).toBe(0);
  });

  test('rejects Infinity and -Infinity', () => {
    expect(s.number().finite().safeParse(Infinity).success).toBe(false);
    expect(s.number().finite().safeParse(-Infinity).success).toBe(false);
  });
});

describe('InferInput type utility', () => {
  test('coerce schemas accept unknown input at runtime', () => {
    // Type test: coerce.number() should accept string input at runtime
    expect(s.coerce.number().parse('42')).toBe(42);
    expect(s.coerce.boolean().parse('true')).toBe(true);
    expect(s.coerce.date().parse('2024-01-01')).toBeInstanceOf(Date);
    expect(s.coerce.bigint().parse('10')).toBe(10n);
  });
});
