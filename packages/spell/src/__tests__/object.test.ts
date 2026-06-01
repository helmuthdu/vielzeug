import { s } from '../index';

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

    it('partial() preserves refinements', () => {
      const base = User.check((d) => d.name !== 'admin' || 'Reserved name');

      expect(() => base.partial().parse({ name: 'admin' })).toThrow('Reserved name');
    });
  });

  describe('required()', () => {
    it('makes all optional fields required again', () => {
      const schema = User.partial().required();

      expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
      expect(() => schema.parse({ name: 'Alice' })).toThrow();
    });

    it('required() preserves refinements', () => {
      const base = User.partial().check((d) => d.name !== 'admin' || 'Reserved name');

      expect(() => base.required().parse({ id: 1, name: 'admin' })).toThrow('Reserved name');
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

    it('preserves refinements', () => {
      const refined = User.check((d) => d.name !== 'admin' || 'Reserved name');

      expect(() => refined.extend({ role: s.string() }).parse({ id: 1, name: 'admin', role: 'x' })).toThrow(
        'Reserved name',
      );
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

    it('pick() and omit() preserve refinements', () => {
      const refined = Full.check((d) => d.email.includes('@') || 'Invalid email format');

      expect(() => refined.pick('email').parse({ email: 'bad' })).toThrow('Invalid email format');
      expect(() => refined.omit('id').parse({ email: 'bad', name: 'Alice' })).toThrow('Invalid email format');
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

describe('object — field-level transforms', () => {
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

  it('keyof() kind is union', () => {
    const schema = s.object({ x: s.string() });

    expect(schema.keyof().kind).toBe('union');
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
  it('allows .pick() after .relaxed() — confirms .pick() is callable', () => {
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

describe('ObjectSchema shape-transform methods preserve metadata', () => {
  it('pick() preserves check() validators', () => {
    const schema = s.object({ a: s.string(), b: s.number() }).check(() => 'always fails');

    expect(schema.pick('a').safeParse({ a: 'hello' }).success).toBe(false);
  });

  it('partial() preserves description', () => {
    const schema = s.object({ a: s.string() }).label('My object');

    expect(schema.partial().description).toBe('My object');
  });

  it('extend() preserves description', () => {
    const schema = s.object({ a: s.string() }).label('My object');

    expect(schema.extend({ b: s.number() }).description).toBe('My object');
  });

  it('omit() preserves nullable — parse(null) returns null', () => {
    const schema = s.object({ a: s.string(), b: s.number() }).omit('a').nullable();

    expect(schema.parse(null)).toBeNull();
  });
});
