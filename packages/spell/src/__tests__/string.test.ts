import { s, SpellValidationError } from '../index';

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

    if (!urlResult.success) expect(urlResult.error.issues[0].code).toBe('invalid_url');

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

  it('nonEmpty() message function receives { min, value } context', () => {
    const schema = s.string().nonEmpty(({ min, value }) => `Need at least ${min}, got "${value}"`);

    expect(() => schema.parse('')).toThrow('Need at least 1, got ""');
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

describe('string format validators — params.format', () => {
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

  it('isoDate() includes params.format = "iso-date"', () => {
    const result = s.string().isoDate().safeParse('not-a-date');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('iso-date');
    }
  });

  it('isoDateTime() includes params.format = "iso-datetime"', () => {
    const result = s.string().isoDateTime().safeParse('not-a-datetime');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect((result.error.issues[0] as any).params?.format).toBe('iso-datetime');
    }
  });
});

describe('string pattern validators — params', () => {
  it('startsWith() includes params.prefix', () => {
    const result = s.string().startsWith('foo').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ prefix: 'foo' });
  });

  it('endsWith() includes params.suffix', () => {
    const result = s.string().endsWith('baz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ suffix: 'baz' });
  });

  it('includes() includes params.includes', () => {
    const result = s.string().includes('xyz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ includes: 'xyz' });
  });

  it('regex() includes params.pattern (source string)', () => {
    const result = s.string().regex(/^\d+$/).safeParse('abc');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ pattern: '^\\d+$' });
  });
});

describe('StringSchema.nonempty() alias', () => {
  it('accepts non-empty strings', () => {
    expect(s.string().nonempty().parse('hello')).toBe('hello');
  });

  it('rejects empty strings', () => {
    expect(() => s.string().nonempty().parse('')).toThrow();
  });

  it('accepts custom message', () => {
    const result = s
      .string()
      .nonempty(() => 'Required field')
      .safeParse('');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Required field');
    }
  });

  it('behaves identically to nonEmpty()', () => {
    const a = s.string().nonempty();
    const b = s.string().nonEmpty();

    expect(a.safeParse('').success).toBe(b.safeParse('').success);
    expect(a.safeParse('x').success).toBe(b.safeParse('x').success);
  });
});
