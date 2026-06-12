/**
 * Security regression tests covering the findings from the security review.
 *
 * Findings addressed:
 *   [MEDIUM] Prototype mutation via __proto__ key in relaxed ObjectSchema and RecordSchema
 *   [MEDIUM] DoS via BigInt coercion with arbitrarily large digit strings
 *   [LOW]    configure() now accepts a logger option to silence / redirect warnings
 */

import { describe, expect, it, vi } from 'vitest';

import {
  configure,
  currentLocale,
  descriptorToJsonSchema,
  fromDescriptor,
  registerLocale,
  reset,
  s,
  useLocale,
} from '../index';

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

describe('prototype mutation — descriptor-driven object schemas', () => {
  it('parses declared __proto__ fields without mutating the output prototype', () => {
    const schema = fromDescriptor(
      JSON.parse('{"kind":"object","strict":true,"fields":{"safe":{"kind":"string"},"__proto__":{"kind":"string"}}}'),
    );
    const input = JSON.parse('{"safe":"ok","__proto__":"declared"}');

    const result = schema.parse(input) as Record<string, unknown>;

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result, '__proto__')?.value).toBe('declared');
    expect(result.safe).toBe('ok');
  });

  it('serializes descriptor fields named __proto__ without mutating schema output objects', () => {
    const jsonSchema = descriptorToJsonSchema(
      JSON.parse('{"kind":"object","strict":true,"fields":{"__proto__":{"kind":"string"}}}'),
    ) as Record<string, unknown>;
    const properties = jsonSchema.properties as Record<string, unknown>;

    expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(properties, '__proto__')?.value).toEqual({ type: 'string' });
  });
});

// ---------------------------------------------------------------------------
// Prototype mutation — IntersectSchema merge
// ---------------------------------------------------------------------------

describe('prototype mutation — IntersectSchema merge', () => {
  it('deep-merges declared __proto__ branches without mutating the result prototype', () => {
    const left = fromDescriptor(
      JSON.parse(
        '{"kind":"object","strict":true,"fields":{"safe":{"kind":"string"},"__proto__":{"kind":"object","strict":false,"fields":{"left":{"kind":"boolean"}}}}}',
      ),
    );
    const right = fromDescriptor(
      JSON.parse(
        '{"kind":"object","strict":true,"fields":{"safe":{"kind":"string"},"__proto__":{"kind":"object","strict":false,"fields":{"right":{"kind":"boolean"}}}}}',
      ),
    );
    const schema = s.intersect(left, right);
    const input = JSON.parse('{"safe":"ok","__proto__":{"left":true,"right":true}}');

    const result = schema.parse(input) as Record<string, unknown>;
    const protoField = Object.getOwnPropertyDescriptor(result, '__proto__')?.value as Record<string, unknown>;

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(protoField).toEqual({ left: true, right: true });
  });
});

// ---------------------------------------------------------------------------
// RegExp validator hardening
// ---------------------------------------------------------------------------

describe('RegExp validator hardening', () => {
  it('does not let stateful global regexes bypass repeated validation', () => {
    const schema = s.string().regex(/^a$/g);

    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('b').success).toBe(false);
  });

  it('does not let stateful sticky regexes bypass repeated validation', () => {
    const schema = s.string().regex(/^a$/y);

    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('b').success).toBe(false);
  });

  it('wraps invalid descriptor patterns in a stable error message', () => {
    expect(() => fromDescriptor({ kind: 'string', pattern: '[' } as any)).toThrow(
      '[@vielzeug/spell] fromDescriptor(): invalid string pattern in descriptor.',
    );
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

  it('ignores unsafe message override keys without mutating global prototypes', () => {
    const captured: string[] = [];

    configure({ logger: (msg) => captured.push(msg) });
    configure({ messages: JSON.parse('{"__proto__":{"polluted":true}}') as any });

    try {
      expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();
      expect(s.string().email().safeParse('bad').success).toBe(false);
    } finally {
      reset();
    }

    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain('Ignoring unsafe message override key');
  });

  it('ignores constructor and prototype message override keys without mutating global prototypes', () => {
    const captured: string[] = [];
    const unsafeMessages = JSON.parse('{"constructor":{"polluted":true},"prototype":{"polluted":true}}') as NonNullable<
      Parameters<typeof configure>[0]['messages']
    >;

    configure({ logger: (msg) => captured.push(msg) });
    configure({ messages: unsafeMessages });

    try {
      expect((Object.prototype as { polluted?: boolean }).polluted).toBeUndefined();

      const result = s.string().email().safeParse('bad');

      expect(result.success).toBe(false);

      if (!result.success) expect(result.error.issues[0]!.message).toBe('Invalid email address');
    } finally {
      reset();
    }

    expect(captured).toHaveLength(2);
    expect(captured).toEqual(
      expect.arrayContaining([expect.stringContaining('"constructor"'), expect.stringContaining('"prototype"')]),
    );
  });

  it('composes message overrides across multiple configure() calls', () => {
    configure({
      messages: {
        string: {
          min: () => 'custom min',
        },
      },
    });
    configure({
      messages: {
        string: {
          max: () => 'custom max',
        },
      },
    });

    try {
      const minResult = s.string().min(2).safeParse('');
      const maxResult = s.string().max(1).safeParse('ab');

      expect(minResult.success).toBe(false);
      expect(maxResult.success).toBe(false);

      if (!minResult.success) expect(minResult.error.issues[0]!.message).toBe('custom min');

      if (!maxResult.success) expect(maxResult.error.issues[0]!.message).toBe('custom max');
    } finally {
      reset();
    }
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

  it('reset() restores the active locale to en without clearing the registry', () => {
    registerLocale('pirate', {
      string: {
        email: () => 'Arrr, bad email',
      },
    });
    useLocale('pirate');

    expect(currentLocale()).toBe('pirate');

    reset();

    try {
      expect(currentLocale()).toBe('en');

      const defaultResult = s.string().email().safeParse('bad');

      expect(defaultResult.success).toBe(false);

      if (!defaultResult.success) expect(defaultResult.error.issues[0]!.message).toBe('Invalid email address');

      useLocale('pirate');
      expect(currentLocale()).toBe('pirate');
    } finally {
      reset();
    }
  });
});
