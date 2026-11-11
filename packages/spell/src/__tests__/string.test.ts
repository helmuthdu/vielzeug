import { SpellValidationError, s } from '../index';

describe('s.string()', () => {
  it('accepts strings including empty string', () => {
    expect(s.string().parse('hello')).toBe('hello');
    expect(s.string().parse('')).toBe('');
  });

  it('rejects non-strings', () => {
    for (const val of [123, true, null, undefined, {}]) {
      expect(() => s.string().parse(val)).toThrow(SpellValidationError);
    }
  });

  it('min / max / length', () => {
    expect(s.string().min(3).parse('abc')).toBe('abc');
    expect(() => s.string().min(3).parse('ab')).toThrow('Must be at least 3 characters');

    expect(s.string().max(5).parse('hello')).toBe('hello');
    expect(() => s.string().max(5).parse('toolong')).toThrow('Must be at most 5 characters');

    expect(s.string().length(5).parse('hello')).toBe('hello');
    expect(() => s.string().length(5).parse('hi')).toThrow('Must be exactly 5 characters');
  });

  it('regex / email / url / uuid', () => {
    expect(
      s
        .string()
        .regex(/^[a-z]+$/)
        .parse('hello'),
    ).toBe('hello');
    expect(() =>
      s
        .string()
        .regex(/^[a-z]+$/)
        .parse('Hello'),
    ).toThrow('Invalid format');

    expect(s.string().email().parse('user@example.com')).toBe('user@example.com');
    expect(() => s.string().email().parse('bad')).toThrow('Invalid email address');

    expect(s.string().url().parse('https://example.com')).toBe('https://example.com');
    expect(() => s.string().url().parse('not-a-url')).toThrow('Invalid URL');
    expect(() => s.string().url().parse('javascript:alert(1)')).toThrow('Invalid URL');
    expect(
      s
        .string()
        .url({ protocols: ['ftp'] })
        .parse('ftp://example.com'),
    ).toBe('ftp://example.com');

    const urlResult = s.string().url().safeParse('not-a-url');

    if (!urlResult.success) expect(urlResult.error.issues[0].code).toBe('invalid_format');

    const id = '550e8400-e29b-41d4-a716-446655440000';

    expect(s.string().uuid().parse(id)).toBe(id);
    expect(() => s.string().uuid().parse('bad-uuid')).toThrow();
  });

  it('trim() strips whitespace before validation', () => {
    expect(s.string().trim().min(3).parse('  hello  ')).toBe('hello');
    expect(() => s.string().trim().min(3).parse('  hi  ')).toThrow('Must be at least 3 characters');
  });

  it('includes() validates substring presence', () => {
    expect(s.string().includes('@').parse('user@example.com')).toBe('user@example.com');
    expect(() => s.string().includes('@').parse('noemail')).toThrow('Must include "@"');
  });

  it('lowercase() and uppercase() normalize before validation', () => {
    expect(s.string().lowercase().parse('HELLO')).toBe('hello');
    expect(s.string().uppercase().parse('hello')).toBe('HELLO');
    expect(
      s
        .string()
        .lowercase()
        .regex(/^[a-z]+$/)
        .parse('HELLO'),
    ).toBe('hello');
  });

  it('date() and datetime() validate ISO formats', () => {
    expect(s.string().isoDate().parse('2024-01-15')).toBe('2024-01-15');
    expect(() => s.string().isoDate().parse('not-a-date')).toThrow('Invalid date');
    expect(() => s.string().isoDate().parse('2024-01-15T10:00:00Z')).toThrow();
    expect(s.string().isoDateTime().parse('2024-01-15T10:00:00Z')).toBe('2024-01-15T10:00:00Z');
    expect(() => s.string().isoDateTime().parse('2024-01-15')).toThrow('Invalid datetime');
  });

  it('date() rejects non-existent calendar dates (roll-over guard)', () => {
    expect(() => s.string().isoDate().parse('2024-02-30')).toThrow('Invalid date');
    expect(() => s.string().isoDate().parse('2024-04-31')).toThrow('Invalid date');
    expect(s.string().isoDate().parse('2024-02-29')).toBe('2024-02-29');
  });

  it('isoDateTime() rejects strings that merely contain T', () => {
    expect(() => s.string().isoDateTime().parse('abcTdef')).toThrow('Invalid datetime');
    expect(() => s.string().isoDateTime().parse('T')).toThrow('Invalid datetime');
  });

  it('isoDateTime() validates structural format precisely', () => {
    expect(s.string().isoDateTime().parse('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
    expect(s.string().isoDateTime().parse('2024-01-15T10:30:00.123Z')).toBe('2024-01-15T10:30:00.123Z');
    expect(s.string().isoDateTime().parse('2024-01-15T10:30:00+05:30')).toBe('2024-01-15T10:30:00+05:30');
    expect(s.string().isoDateTime().parse('2024-01-15T10:30')).toBe('2024-01-15T10:30');
    expect(() => s.string().isoDateTime().parse('2024-01-15T:::Z')).toThrow('Invalid datetime');
    expect(() => s.string().isoDateTime().parse('2024-01-15T10:30:00+99:99')).toThrow('Invalid datetime');
  });

  it('supports custom error messages', () => {
    expect(() => s.string().min(5, 'Too short!').parse('hi')).toThrow('Too short!');
  });

  it('nonEmpty() message function receives { value } context', () => {
    const schema = s.string().nonEmpty(({ value }) => `Required, got "${value}"`);

    expect(() => schema.parse('')).toThrow('Required, got ""');
  });

  it('chains multiple validators', () => {
    const schema = s
      .string()
      .min(3)
      .max(10)
      .regex(/^[a-z]+$/);

    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow();
    expect(() => schema.parse('toolongstring')).toThrow();
  });
});

describe('coerce.string()', () => {
  it('coerces numbers and booleans to string', () => {
    expect(s.coerce.string().min(1).parse(42)).toBe('42');
    expect(s.coerce.string().min(1).parse(true)).toBe('true');
  });

  it('rejects null and undefined', () => {
    expect(() => s.coerce.string().parse(null)).toThrow();
    expect(() => s.coerce.string().parse(undefined)).toThrow();
  });
});

describe('string format validators: params.format', () => {
  it('email() includes params.format = "email"', () => {
    const result = s.string().email().safeParse('bad');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('email');
    }
  });

  it('url() includes params.format = "url"', () => {
    const result = s.string().url().safeParse('not-a-url');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('url');
    }
  });

  it('uuid() includes params.format = "uuid"', () => {
    const result = s.string().uuid().safeParse('bad-uuid');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('uuid');
    }
  });

  it('isoDate() includes params.format = "isoDate"', () => {
    const result = s.string().isoDate().safeParse('not-a-date');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('isoDate');
    }
  });

  it('isoDateTime() includes params.format = "isoDateTime"', () => {
    const result = s.string().isoDateTime().safeParse('not-a-datetime');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('isoDateTime');
    }
  });
});

describe('string pattern validators: params', () => {
  it('startsWith() includes params.prefix', () => {
    const result = s.string().startsWith('foo').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ format: 'startsWith', prefix: 'foo' });
  });

  it('endsWith() includes params.suffix', () => {
    const result = s.string().endsWith('baz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ format: 'endsWith', suffix: 'baz' });
  });

  it('includes() includes params.includes', () => {
    const result = s.string().includes('xyz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ format: 'includes', includes: 'xyz' });
  });

  it('regex() includes params.pattern (source string)', () => {
    const result = s.string().regex(/^\d+$/).safeParse('abc');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ format: 'regex', pattern: '^\\d+$' });
  });
});

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

  test('nanoid(length) validates custom-length NanoID strings', () => {
    const schema = s.string().nanoid(10);

    expect(schema.safeParse('V1StGXR8_Z').success).toBe(true);
    expect(schema.safeParse('V1StGXR8_Z5jdHi6B-myT').success).toBe(false);
    expect(schema.safeParse('short').success).toBe(false);
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
