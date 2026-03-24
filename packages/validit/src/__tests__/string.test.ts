import { ValidationError, v } from '../index';

describe('v.string()', () => {
  it('accepts strings including empty string', () => {
    expect(v.string().parse('hello')).toBe('hello');
    expect(v.string().parse('')).toBe('');
  });

  it('rejects non-strings', () => {
    for (const val of [123, true, null, undefined, {}]) {
      expect(() => v.string().parse(val)).toThrow(ValidationError);
    }
  });

  it('min / max / length', () => {
    expect(v.string().min(3).parse('abc')).toBe('abc');
    expect(() => v.string().min(3).parse('ab')).toThrow('Must be at least 3 characters');

    expect(v.string().max(5).parse('hello')).toBe('hello');
    expect(() => v.string().max(5).parse('toolong')).toThrow('Must be at most 5 characters');

    expect(v.string().length(5).parse('hello')).toBe('hello');
    expect(() => v.string().length(5).parse('hi')).toThrow('Must be exactly 5 characters');
  });

  it('regex / email / url / uuid', () => {
    expect(
      v
        .string()
        .regex(/^[a-z]+$/)
        .parse('hello'),
    ).toBe('hello');
    expect(() =>
      v
        .string()
        .regex(/^[a-z]+$/)
        .parse('Hello'),
    ).toThrow('Invalid format');

    expect(v.string().email().parse('user@example.com')).toBe('user@example.com');
    expect(() => v.string().email().parse('bad')).toThrow('Invalid email address');

    expect(v.string().url().parse('https://example.com')).toBe('https://example.com');
    expect(() => v.string().url().parse('not-a-url')).toThrow('Invalid URL');

    const urlResult = v.string().url().safeParse('not-a-url');

    if (!urlResult.success) expect(urlResult.error.issues[0].code).toBe('invalid_url');

    const id = '550e8400-e29b-41d4-a716-446655440000';

    expect(v.string().uuid().parse(id)).toBe(id);
    expect(() => v.string().uuid().parse('bad-uuid')).toThrow();
  });

  it('trim() strips whitespace before validation', () => {
    expect(v.string().trim().min(3).parse('  hello  ')).toBe('hello');
    expect(() => v.string().trim().min(3).parse('  hi  ')).toThrow('Must be at least 3 characters');
  });

  it('includes() validates substring presence', () => {
    expect(v.string().includes('@').parse('user@example.com')).toBe('user@example.com');
    expect(() => v.string().includes('@').parse('noemail')).toThrow('Must include "@"');
  });

  it('lowercase() and uppercase() normalize before validation', () => {
    expect(v.string().lowercase().parse('HELLO')).toBe('hello');
    expect(v.string().uppercase().parse('hello')).toBe('HELLO');
    expect(
      v
        .string()
        .lowercase()
        .regex(/^[a-z]+$/)
        .parse('HELLO'),
    ).toBe('hello');
  });

  it('date() and datetime() validate ISO formats', () => {
    expect(v.string().date().parse('2024-01-15')).toBe('2024-01-15');
    expect(() => v.string().date().parse('not-a-date')).toThrow('Invalid date');
    expect(() => v.string().date().parse('2024-01-15T10:00:00Z')).toThrow();
    expect(v.string().datetime().parse('2024-01-15T10:00:00Z')).toBe('2024-01-15T10:00:00Z');
    expect(() => v.string().datetime().parse('2024-01-15')).toThrow('Invalid datetime');
  });

  it('date() rejects non-existent calendar dates (roll-over guard)', () => {
    expect(() => v.string().date().parse('2024-02-30')).toThrow('Invalid date');
    expect(() => v.string().date().parse('2024-04-31')).toThrow('Invalid date');
    expect(v.string().date().parse('2024-02-29')).toBe('2024-02-29');
  });

  it('datetime() rejects strings that merely contain T', () => {
    expect(() => v.string().datetime().parse('abcTdef')).toThrow('Invalid datetime');
    expect(() => v.string().datetime().parse('T')).toThrow('Invalid datetime');
  });

  it('supports custom error messages', () => {
    expect(() => v.string().min(5, 'Too short!').parse('hi')).toThrow('Too short!');
  });

  it('nonempty() message function receives { min, value } context', () => {
    const schema = v.string().nonempty(({ min, value }) => `Need at least ${min}, got "${value}"`);

    expect(() => schema.parse('')).toThrow('Need at least 1, got ""');
  });

  it('chains multiple validators', () => {
    const s = v
      .string()
      .min(3)
      .max(10)
      .regex(/^[a-z]+$/);

    expect(s.parse('hello')).toBe('hello');
    expect(() => s.parse('hi')).toThrow();
    expect(() => s.parse('toolongstring')).toThrow();
  });
});

describe('coerce.string()', () => {
  it('coerces numbers and booleans to string', () => {
    expect(v.coerce.string().min(1).parse(42)).toBe('42');
    expect(v.coerce.string().min(1).parse(true)).toBe('true');
  });

  it('rejects null and undefined', () => {
    expect(() => v.coerce.string().parse(null)).toThrow();
    expect(() => v.coerce.string().parse(undefined)).toThrow();
  });
});

describe('string format validators — params.format', () => {
  it('email() includes params.format = "email"', () => {
    const result = v.string().email().safeParse('bad');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params?.format).toBe('email');
    }
  });

  it('url() includes params.format = "url"', () => {
    const result = v.string().url().safeParse('not-a-url');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params?.format).toBe('url');
    }
  });

  it('uuid() includes params.format = "uuid"', () => {
    const result = v.string().uuid().safeParse('bad-uuid');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params?.format).toBe('uuid');
    }
  });

  it('date() includes params.format = "date"', () => {
    const result = v.string().date().safeParse('not-a-date');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params?.format).toBe('date');
    }
  });

  it('datetime() includes params.format = "datetime"', () => {
    const result = v.string().datetime().safeParse('not-a-datetime');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].params?.format).toBe('datetime');
    }
  });
});

describe('string pattern validators — params', () => {
  it('startsWith() includes params.prefix', () => {
    const result = v.string().startsWith('foo').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ prefix: 'foo' });
  });

  it('endsWith() includes params.suffix', () => {
    const result = v.string().endsWith('baz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ suffix: 'baz' });
  });

  it('includes() includes params.includes', () => {
    const result = v.string().includes('xyz').safeParse('bar');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ includes: 'xyz' });
  });

  it('regex() includes params.pattern (source string)', () => {
    const result = v.string().regex(/^\d+$/).safeParse('abc');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0].params).toEqual({ pattern: '^\\d+$' });
  });
});
