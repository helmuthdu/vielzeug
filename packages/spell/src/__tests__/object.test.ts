import { SpellDefinitionError, s } from '../index';

describe('s.object()', () => {
  const User = s.object({ id: s.number(), name: s.string() });

  it('accepts a matching object', () => {
    expect(User.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
  });

  it('rejects non-objects', () => {
    for (const val of ['str', 123, [], null]) {
      expect(() => User.parse(val)).toThrow('Expected object');
    }
  });

  it('includes property key in error path', () => {
    const result = User.safeParse({ id: 'bad', name: 123 });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'id')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
    }
  });

  it('includes nested path in errors', () => {
    const schema = s.object({ user: s.object({ email: s.string().email() }) });
    const result = schema.safeParse({ user: { email: 'bad@' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['user', 'email']);
    }
  });

  describe('unknown key modes', () => {
    it('strict (default) rejects unknown keys', () => {
      const result = User.safeParse({ extra: true, id: 1, name: 'Alice' } as any);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_keys');
      }
    });

    it('relaxed() keeps unknown keys', () => {
      const parsed = User.relaxed().parse({ extra: true, id: 1, name: 'Alice' } as any);

      expect((parsed as any).extra).toBe(true);
    });
  });

  describe('partial()', () => {
    it('makes all fields optional', () => {
      const schema = User.partial();

      expect(schema.parse({})).toEqual({});
      expect(schema.parse({ name: 'Alice' })).toEqual({ name: 'Alice' });
      expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
    });

    it('partial(keys) makes only specified fields optional', () => {
      const schema = s.object({ email: s.string(), id: s.number(), name: s.string() });
      const partial = schema.partial('email', 'name');

      expect(partial.parse({ id: 1 })).toEqual({ id: 1 });
      expect(partial.parse({ email: 'a@b.c', id: 1, name: 'Alice' })).toEqual({
        email: 'a@b.c',
        id: 1,
        name: 'Alice',
      });
      expect(() => partial.parse({ name: 'Alice' })).toThrow();
    });

    it('partial() rejects schemas with checks', () => {
      const base = User.check((d) => d.name !== 'admin' || 'Reserved name');

      expect(() => base.partial()).toThrow(SpellDefinitionError);
    });
  });

  describe('required()', () => {
    it('rejects undefined again after optional()', () => {
      const schema = User.optional().required();

      expect(schema.safeParse(undefined).success).toBe(false);
      expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
    });
  });

  describe('extend()', () => {
    it('adds new fields', () => {
      const Admin = User.extend({ role: s.string() });

      expect(Admin.parse({ id: 1, name: 'Alice', role: 'admin' })).toEqual({
        id: 1,
        name: 'Alice',
        role: 'admin',
      });
    });

    it('overrides existing fields with the same key', () => {
      const schema = User.extend({ name: s.string().min(5) });

      expect(() => schema.parse({ id: 1, name: 'Al' })).toThrow();
      expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
    });

    it('rejects schemas with checks, defaults, or catches', () => {
      expect(() => User.check(() => true).extend({ role: s.string() })).toThrow(SpellDefinitionError);
      expect(() => User.default({ id: 1, name: 'A' }).extend({ role: s.string() })).toThrow(SpellDefinitionError);
      expect(() => User.catch({ id: 1, name: 'A' }).extend({ role: s.string() })).toThrow(SpellDefinitionError);
    });
  });

  describe('pick() / omit()', () => {
    const Full = s.object({ email: s.string(), id: s.number(), name: s.string() });

    it('pick() selects specified keys', () => {
      const schema = Full.pick('name', 'email');

      expect(schema.parse({ email: 'alice@example.com', name: 'Alice' })).toEqual({
        email: 'alice@example.com',
        name: 'Alice',
      });
    });

    it('omit() removes specified keys', () => {
      const schema = Full.omit('id');

      expect(schema.parse({ email: 'alice@example.com', name: 'Alice' })).toEqual({
        email: 'alice@example.com',
        name: 'Alice',
      });
    });

    it('pick() and omit() reject schemas with checks that may read removed fields', () => {
      const refined = Full.check((d) => d.email.includes('@') || 'Invalid email format');

      expect(() => refined.pick('email')).toThrow(SpellDefinitionError);
      expect(() => refined.omit('id')).toThrow(SpellDefinitionError);
    });
  });

  describe('shape property', () => {
    it('is publicly accessible', () => {
      expect(User.shape.id).toBeDefined();
      expect(User.shape.name).toBeDefined();
    });

    it('can be spread to compose a new schema', () => {
      const Admin = s.object({ ...User.shape, role: s.string() });

      expect(Admin.parse({ id: 1, name: 'Alice', role: 'admin' })).toEqual({
        id: 1,
        name: 'Alice',
        role: 'admin',
      });
    });
  });
});

describe('object: field-level transforms', () => {
  it('trim() on a string field preserves the trimmed value in output', () => {
    const schema = s.object({ name: s.string().trim() });

    expect(schema.parse({ name: '  alice  ' })).toEqual({ name: 'alice' });
  });

  it('default() on an object field fills missing keys', () => {
    const schema = s.object({ role: s.string().default('user') });

    expect(schema.parse({})).toEqual({ role: 'user' });
    expect(schema.parse({ role: 'admin' })).toEqual({ role: 'admin' });
  });

  it('coerce.number() inside object coerces the field value', () => {
    const schema = s.object({ age: s.coerce.number() });

    expect(schema.parse({ age: '42' })).toEqual({ age: 42 });
  });
});

describe('ObjectSchema unsafe field names', () => {
  it('writes declared constructor and prototype fields as own data properties', () => {
    const schema = s.object({ constructor: s.string(), prototype: s.number() });
    const result = schema.parse({ constructor: 'safe', prototype: 1 }) as Record<string, unknown>;

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result, 'constructor')?.value).toBe('safe');
    expect(Object.getOwnPropertyDescriptor(result, 'prototype')?.value).toBe(1);
  });
});

describe('ObjectSchema optional/nullable guards', () => {
  it('parse(undefined) returns undefined when optional', () => {
    expect(s.object({ a: s.string() }).optional().parse(undefined)).toBeUndefined();
  });

  it('parse(null) returns null when nullable', () => {
    expect(s.object({ a: s.string() }).nullable().parse(null)).toBeNull();
  });

  it('parseAsync(undefined) returns undefined when optional', async () => {
    expect(await s.object({ a: s.string() }).optional().parseAsync(undefined)).toBeUndefined();
  });

  it('parseAsync(null) returns null when nullable', async () => {
    expect(await s.object({ a: s.string() }).nullable().parseAsync(null)).toBeNull();
  });

  it('catch() fallback works on object parse failure', () => {
    const fallback = { a: 'default' };

    expect(
      s
        .object({ a: s.string() })
        .catch(fallback)
        .parse('not-an-object' as any),
    ).toEqual(fallback);
  });
});

describe('ObjectSchema.keyof()', () => {
  it('validates keys of a simple object', () => {
    const schema = s.object({ id: s.number(), name: s.string() });
    const keys = schema.keyof();

    expect(keys.parse('id')).toBe('id');
    expect(keys.parse('name')).toBe('name');
    expect(() => keys.parse('unknown')).toThrow();
  });

  it('infers the correct union type', () => {
    const schema = s.object({ a: s.string(), b: s.number(), c: s.boolean() });
    const keys = schema.keyof();

    expect(keys.parse('a')).toBe('a');
    expect(keys.parse('b')).toBe('b');
    expect(keys.parse('c')).toBe('c');
    expect(() => keys.parse('d')).toThrow();
  });

  it('keyof() is an enum of the shape keys', () => {
    const schema = s.object({ x: s.string(), y: s.number() });

    expect(schema.keyof().kind).toBe('enum');
    expect(schema.keyof().values).toEqual(['x', 'y']);
  });
});

describe('ObjectSchema.extend() preserves relaxed mode', () => {
  it('extend() on a relaxed schema stays relaxed', () => {
    const schema = s.object({ a: s.string() }).relaxed().extend({ b: s.number() });

    expect(schema.parse({ a: 'hello', b: 1, extra: true })).toMatchObject({ a: 'hello', b: 1, extra: true });
  });

  it('extend() on a strict schema stays strict', () => {
    const schema = s.object({ a: s.string() }).extend({ b: s.number() });

    expect(schema.safeParse({ a: 'hello', b: 1, extra: true }).success).toBe(false);
  });
});

describe('ObjectSchema.relaxed() preserves fluent chain', () => {
  it('allows .pick() after .relaxed(): confirms .pick() is callable', () => {
    const schema = s.object({ a: s.string(), b: s.number() }).relaxed();
    const picked = schema.pick('a');

    expect(picked.parse({ a: 'hello' })).toEqual({ a: 'hello' });
    expect(picked.parse({ a: 'hello', extra: true })).toMatchObject({ a: 'hello' });
  });

  it('allows .omit() after .relaxed()', () => {
    const schema = s.object({ a: s.string(), b: s.number() }).relaxed();
    const omitted = schema.omit('b');

    expect(omitted.parse({ a: 'hello', extra: 'yes' })).toEqual({ a: 'hello', extra: 'yes' });
  });

  it('allows .partial() after .relaxed()', () => {
    const schema = s.object({ a: s.string() }).relaxed();
    const partial = schema.partial();

    expect(partial.parse({ extra: 1 })).toEqual({ extra: 1 });
  });
});

describe('ObjectSchema.strict() after relaxed()', () => {
  it('strict() after relaxed() reverts to rejecting unknown keys', () => {
    const schema = s.object({ a: s.string() }).relaxed().strict();

    expect(schema.safeParse({ a: 'hello', extra: true }).success).toBe(false);
    expect(schema.parse({ a: 'hello' })).toEqual({ a: 'hello' });
  });
});

describe('ObjectSchema derivations keep slot metadata', () => {
  it('partial() preserves description', () => {
    const schema = s.object({ a: s.string() }).describe('My object');

    expect(schema.partial().description).toBe('My object');
  });

  it('extend() preserves description', () => {
    const schema = s.object({ a: s.string() }).describe('My object');

    expect(schema.extend({ b: s.number() }).description).toBe('My object');
  });

  it('omit() preserves nullable: parse(null) returns null', () => {
    const schema = s.object({ a: s.string(), b: s.number() }).omit('a').nullable();

    expect(schema.parse(null)).toBeNull();
  });
});

describe('ObjectSchema.parseAsync() concurrent field parsing', () => {
  it('parses all fields concurrently', async () => {
    const schema = s.object({
      email: s.string().checkAsync(async (v) => v.includes('@') || 'Invalid email'),
      name: s.string().checkAsync(async (v) => v.length > 0 || 'Required'),
    });

    await expect(schema.parseAsync({ email: 'a@b.com', name: 'Alice' })).resolves.toEqual({
      email: 'a@b.com',
      name: 'Alice',
    });
  });

  it('collects errors from all failing fields concurrently', async () => {
    const schema = s.object({
      a: s.string().checkAsync(async (v) => v !== 'bad' || 'Bad A'),
      b: s.number().checkAsync(async (v) => v > 0 || 'Bad B'),
    });
    const result = await schema.safeParseAsync({ a: 'bad', b: -1 });

    expect(result.success).toBe(false);

    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);

      expect(paths).toContain('a');
      expect(paths).toContain('b');
    }
  });

  it('rejects non-object input', async () => {
    await expect(s.object({ x: s.string() }).parseAsync('not-an-object')).rejects.toThrow();
  });

  it('respects catch() on the object schema', async () => {
    const fallback = { x: 'default' };
    const schema = s.object({ x: s.string() }).catch(fallback);

    await expect(schema.parseAsync(null)).resolves.toEqual(fallback);
  });

  it('runs object-level validators after fields pass', async () => {
    const schema = s
      .object({ confirm: s.string(), pass: s.string() })
      .checkAsync(async (obj) => obj.pass === obj.confirm || 'Passwords must match');

    await expect(schema.parseAsync({ confirm: 'a', pass: 'b' })).rejects.toThrow('Passwords must match');
    await expect(schema.parseAsync({ confirm: 'x', pass: 'x' })).resolves.toEqual({ confirm: 'x', pass: 'x' });
  });
});

describe('ObjectSchema.tolerate()', () => {
  const Hunter = s.object({ name: s.string() });

  it('accepts and drops the named keys', () => {
    expect(Hunter.tolerate('woundCount').parse({ name: 'Ada', woundCount: 3 })).toEqual({ name: 'Ada' });
  });

  it('still rejects other unknown keys', () => {
    const result = Hunter.tolerate('woundCount').safeParse({ extra: true, name: 'Ada', woundCount: 3 });

    expect(result.success).toBe(false);

    if (!result.success)
      expect(result.error.issues[0]).toMatchObject({ code: 'invalid_keys', params: { keys: ['extra'] } });
  });

  it('keeps declared field validation and the object type', () => {
    const schema = Hunter.tolerate('woundCount').pick('name');

    expect(schema.safeParse({ name: 1, woundCount: 3 }).success).toBe(false);
  });

  it('drops tolerated keys even in relaxed mode', () => {
    expect(Hunter.relaxed().tolerate('legacy').parse({ extra: 1, legacy: 2, name: 'Ada' })).toEqual({
      extra: 1,
      name: 'Ada',
    });
  });

  it('is part of the definition', () => {
    expect(Hunter.tolerate('legacy').definition()).toMatchObject({
      kind: 'object',
      strict: true,
      tolerated: ['legacy'],
    });
  });
});

describe('ObjectSchema output keys', () => {
  it('omits optional keys absent from the input', () => {
    const output = s.object({ a: s.string(), b: s.string().optional() }).parse({ a: 'x' });

    expect(Object.keys(output)).toEqual(['a']);
  });

  it('keeps optional keys present as undefined in the input', () => {
    const output = s.object({ b: s.string().optional() }).parse({ b: undefined });

    expect(Object.hasOwn(output, 'b')).toBe(true);
  });

  it('writes defaults for absent keys', () => {
    expect(s.object({ role: s.string().default('viewer') }).parse({})).toEqual({ role: 'viewer' });
  });
});

describe('ObjectSchema unknown-key modes', () => {
  test('strict (default) rejects unknown keys', () => {
    const schema = s.object({ id: s.number() });

    expect(schema.safeParse({ extra: true, id: 1 }).success).toBe(false);
  });

  test('relaxed mode preserves unknown keys', () => {
    const result = s.object({ id: s.number() }).relaxed().parse({ extra: 'kept', id: 1 });

    expect((result as any).extra).toBe('kept');
  });

  test('relaxed mode survives extend/pick/omit', () => {
    const base = s.object({ a: s.string(), b: s.number() }).relaxed();
    const extended = (base as any).extend({ c: s.boolean() });
    const result = extended.parse({ a: 'x', b: 1, c: true, unknown: 99 });

    expect(result.a).toBe('x');
    expect(result.b).toBe(1);
    expect(result.c).toBe(true);
    expect((result as any).unknown).toBe(99);
  });
});
