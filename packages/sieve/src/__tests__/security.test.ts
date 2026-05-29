/**
 * Security regression tests covering the findings from the security review.
 *
 * Findings addressed:
 *   [MEDIUM] Prototype mutation via __proto__ key in relaxed ObjectSchema and RecordSchema
 *   [MEDIUM] DoS via BigInt coercion with arbitrarily large digit strings
 *   [LOW]    withMessages does not preserve context across async boundaries → withMessagesAsync
 *   [LOW]    configure() now accepts a logger option to silence / redirect warnings
 */

import { describe, expect, it, vi } from 'vitest';

import { configure, reset, s, withMessages } from '../index';

// ---------------------------------------------------------------------------
// Prototype mutation — relaxed ObjectSchema
// ---------------------------------------------------------------------------

describe('prototype mutation — relaxed ObjectSchema', () => {
  it('does not mutate the output prototype when __proto__ appears in input', () => {
    const schema = s.object({ name: s.string() }).relaxed();
    // JSON.parse creates __proto__ as an own enumerable data property
    const input = JSON.parse('{"name":"Alice","__proto__":{"isAdmin":true}}');

    const result = schema.parse(input);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((result as any).isAdmin).toBeUndefined();
  });

  it('silently drops __proto__ from relaxed output rather than copying it', () => {
    const schema = s.object({ x: s.number() }).relaxed();
    const input = JSON.parse('{"x":1,"__proto__":{"evil":true},"extra":"ok"}');

    const result = schema.parse(input) as any;

    expect(result.x).toBe(1);
    expect(result.extra).toBe('ok');
    expect(result.evil).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
  });

  it('silently drops "constructor" and "prototype" keys from relaxed output', () => {
    const schema = s.object({}).relaxed();
    const input = JSON.parse('{"constructor":{"polluted":true},"prototype":{"polluted":true},"safe":"yes"}');

    const result = schema.parse(input) as any;

    expect(result.safe).toBe('yes');
    expect(result.polluted).toBeUndefined();
  });

  it('does not affect Object.prototype globally', () => {
    const schema = s.object({ x: s.string() }).relaxed();
    const input = JSON.parse('{"x":"a","__proto__":{"globalEvil":true}}');

    schema.parse(input);

    expect((Object.prototype as any).globalEvil).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Prototype mutation — RecordSchema
// ---------------------------------------------------------------------------

describe('prototype mutation — RecordSchema', () => {
  it('does not mutate output prototype when __proto__ appears in input', () => {
    const schema = s.record(s.string(), s.unknown());
    const input = JSON.parse('{"key":"value","__proto__":{"isAdmin":true}}');

    const result = schema.parse(input);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((result as any).isAdmin).toBeUndefined();
  });

  it('silently drops __proto__ from record output', () => {
    const schema = s.record(s.string(), s.string());
    const input = JSON.parse('{"a":"1","__proto__":"injected","b":"2"}');

    const result = schema.parse(input);

    expect(result).toEqual({ a: '1', b: '2' });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it('silently drops "constructor" and "prototype" keys from record output', () => {
    const schema = s.record(s.string(), s.string());
    const input = JSON.parse('{"safe":"yes","constructor":"bad","prototype":"bad"}');

    const result = schema.parse(input);

    expect(result).toEqual({ safe: 'yes' });
  });

  it('handles __proto__ in async record parse without mutating prototype', async () => {
    const schema = s.record(s.string(), s.unknown());
    const input = JSON.parse('{"key":"value","__proto__":{"isAdmin":true}}');

    const result = await schema.parseAsync(input);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect((result as any).isAdmin).toBeUndefined();
  });

  it('does not affect Object.prototype globally', () => {
    const schema = s.record(s.string(), s.unknown());
    const input = JSON.parse('{"__proto__":{"globalEvil2":true}}');

    schema.parse(input);

    expect((Object.prototype as any).globalEvil2).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BigInt coercion DoS guard
// ---------------------------------------------------------------------------

describe('BigInt coercion DoS guard', () => {
  it('coerces normally-sized digit strings', () => {
    expect(s.coerce.bigint().parse('12345')).toBe(12345n);
    expect(s.coerce.bigint().parse('0')).toBe(0n);
    expect(s.coerce.bigint().parse('-999')).toBe(-999n);
  });

  it('coerces strings up to 1000 digits', () => {
    const digits = '9'.repeat(1000);
    const result = s.coerce.bigint().safeParse(digits);

    expect(result.success).toBe(true);

    if (result.success) expect(typeof result.data).toBe('bigint');
  });

  it('rejects coercion of strings longer than 1000 digits (passes raw string to type check, which fails)', () => {
    const hugeDigits = '9'.repeat(1001);
    // The preprocessor passes the raw string through; the type validator then rejects it.
    const result = s.coerce.bigint().safeParse(hugeDigits);

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });

  it('rejects coercion of very large digit strings without significant delay', () => {
    // 100 000 digits — would take ~3 ms without the guard
    const hugeDigits = '9'.repeat(100_000);
    const start = Date.now();
    const result = s.coerce.bigint().safeParse(hugeDigits);
    const elapsed = Date.now() - start;

    expect(result.success).toBe(false);
    // Should return almost instantly — well under 50 ms
    expect(elapsed).toBeLessThan(50);
  });

  it('still coerces numbers and bigints normally', () => {
    expect(s.coerce.bigint().parse(42)).toBe(42n);
    expect(s.coerce.bigint().parse(42n)).toBe(42n);
  });

  it('passes through non-numeric strings as-is (type check fails cleanly)', () => {
    const result = s.coerce.bigint().safeParse('not-a-number');

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]!.code).toBe('invalid_type');
  });
});

// ---------------------------------------------------------------------------
// configure() logger option
// ---------------------------------------------------------------------------

describe('configure() logger option', () => {
  it('routes internal warnings to the provided logger function', () => {
    const captured: string[] = [];

    configure({ logger: (msg) => captured.push(msg) });

    try {
      // Trigger the multiple-regex constraint warning
      s.string().regex(/^a+$/).regex(/^b+$/);
    } finally {
      reset();
    }

    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain('Multiple .regex() constraints');
  });

  it('silences warnings when logger is null', () => {
    const spy = vi.spyOn(console, 'warn');

    configure({ logger: null });

    try {
      s.string().regex(/^a+$/).regex(/^b+$/);
    } finally {
      reset();
    }

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reset() restores console.warn as the default logger', () => {
    configure({ logger: null });
    reset();

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      s.string().regex(/^a+$/).regex(/^b+$/);
    } finally {
      reset();
    }

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
