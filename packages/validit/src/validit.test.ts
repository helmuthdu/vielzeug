/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { type Infer, pipe, v, ValidationError } from './validit';

describe('validit', () => {
  /* ============================================
     ValidationError
     ============================================ */

  describe('ValidationError', () => {
    it('formats a root-level issue as "value: message"', () => {
      const err = new ValidationError([{ message: 'Invalid', path: [] }]);
      expect(err.message).toBe('value: Invalid');
    });

    it('formats nested paths with dots', () => {
      const err = new ValidationError([{ message: 'Required', path: ['user', 'address', 'city'] }]);
      expect(err.message).toBe('user.address.city: Required');
    });

    it('formats array-index paths', () => {
      const err = new ValidationError([{ message: 'Invalid', path: ['items', 0, 'name'] }]);
      expect(err.message).toBe('items.0.name: Invalid');
    });

    it('includes error code in square brackets', () => {
      const err = new ValidationError([{ code: 'too_small', message: 'Too short', path: ['name'] }]);
      expect(err.message).toBe('name: Too short [too_small]');
    });

    it('surfaces code and params from schema validators', () => {
      const result = v.string().min(5).safeParse('hi');
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues[0];
        expect(issue.code).toBe('too_small');
        expect(issue.params).toEqual({ minimum: 5, type: 'string' });
      }
    });
  });

  /* ============================================
     Type-mismatch bail-out (Change 1)
     ============================================ */

  describe('bail on type mismatch', () => {
    it('returns only one issue when type check fails, not constraint errors too', () => {
      const result = v.string().min(3).max(10).safeParse(42);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].code).toBe('invalid_type');
      }
    });

    it('runs constraint validators once type is correct', () => {
      const result = v.string().min(10).safeParse('hi');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('too_small');
      }
    });
  });

  /* ============================================
     v.string()
     ============================================ */

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

    it('pattern / email / url / uuid', () => {
      expect(
        v
          .string()
          .pattern(/^[a-z]+$/)
          .parse('hello'),
      ).toBe('hello');
      expect(() =>
        v
          .string()
          .pattern(/^[a-z]+$/)
          .parse('Hello'),
      ).toThrow('Invalid format');

      expect(v.email().parse('user@example.com')).toBe('user@example.com');
      expect(() => v.email().parse('bad')).toThrow('Invalid email address');

      expect(v.url().parse('https://example.com')).toBe('https://example.com');
      expect(() => v.url().parse('not-a-url')).toThrow('Invalid URL');

      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(v.uuid().parse(id)).toBe(id);
      expect(() => v.uuid().parse('bad-uuid')).toThrow();
    });

    it('trim() strips whitespace before validation', () => {
      expect(v.string().trim().min(3).parse('  hello  ')).toBe('hello');
      expect(() => v.string().trim().min(3).parse('  hi  ')).toThrow('Must be at least 3 characters');
    });

    it('supports custom error messages', () => {
      expect(() => v.string().min(5, 'Too short!').parse('hi')).toThrow('Too short!');
    });

    it('chains multiple validators', () => {
      const s = v
        .string()
        .min(3)
        .max(10)
        .pattern(/^[a-z]+$/);
      expect(s.parse('hello')).toBe('hello');
      expect(() => s.parse('hi')).toThrow();
      expect(() => s.parse('toolongstring')).toThrow();
    });
  });

  /* ============================================
     v.number()
     ============================================ */

  describe('v.number()', () => {
    it('accepts numbers', () => {
      expect(v.number().parse(0)).toBe(0);
      expect(v.number().parse(-3.14)).toBe(-3.14);
    });

    it('rejects non-numbers and NaN', () => {
      for (const val of ['1', true, null, NaN]) {
        expect(() => v.number().parse(val)).toThrow(ValidationError);
      }
    });

    it('min / max / int / positive / negative / nonNegative / nonPositive', () => {
      expect(v.number().min(0).parse(0)).toBe(0);
      expect(() => v.number().min(1).parse(0)).toThrow('Must be at least 1');

      expect(v.number().max(5).parse(5)).toBe(5);
      expect(() => v.number().max(5).parse(6)).toThrow('Must be at most 5');

      expect(v.int().parse(3)).toBe(3);
      expect(() => v.int().parse(3.14)).toThrow('Must be an integer');

      expect(() => v.number().positive().parse(0)).toThrow('Must be positive');
      expect(v.number().positive().parse(0.1)).toBe(0.1);

      expect(() => v.number().negative().parse(0)).toThrow('Must be negative');
      expect(v.number().negative().parse(-0.1)).toBe(-0.1);

      expect(v.number().nonNegative().parse(0)).toBe(0);
      expect(() => v.number().nonNegative().parse(-1)).toThrow();

      expect(v.number().nonPositive().parse(0)).toBe(0);
      expect(() => v.number().nonPositive().parse(1)).toThrow();
    });
  });

  /* ============================================
     v.boolean()
     ============================================ */

  describe('v.boolean()', () => {
    it('accepts true and false', () => {
      expect(v.boolean().parse(true)).toBe(true);
      expect(v.boolean().parse(false)).toBe(false);
    });

    it('rejects truthy/falsy non-booleans', () => {
      for (const val of [1, 0, 'true', null]) {
        expect(() => v.boolean().parse(val)).toThrow(ValidationError);
      }
    });
  });

  /* ============================================
     v.date()
     ============================================ */

  describe('v.date()', () => {
    const d = new Date('2024-06-01');

    it('accepts a valid Date', () => {
      expect(v.date().parse(d)).toBe(d);
    });

    it('rejects an invalid Date, strings, and numbers', () => {
      expect(() => v.date().parse(new Date('invalid'))).toThrow('Expected valid date');
      expect(() => v.date().parse('2024-01-01')).toThrow(ValidationError);
      expect(() => v.date().parse(1700000000000)).toThrow(ValidationError);
    });

    it('min / max', () => {
      const min = new Date('2024-01-01');
      const max = new Date('2024-12-31');
      expect(v.date().min(min).parse(d)).toBe(d);
      expect(() => v.date().min(max).parse(d)).toThrow();
      expect(v.date().max(max).parse(d)).toBe(d);
      expect(() => v.date().max(min).parse(d)).toThrow();
    });
  });

  /* ============================================
     v.literal()
     ============================================ */

  describe('v.literal()', () => {
    it('accepts the exact value', () => {
      expect(v.literal('active').parse('active')).toBe('active');
      expect(v.literal(42).parse(42)).toBe(42);
      expect(v.literal(true).parse(true)).toBe(true);
    });

    it('rejects anything else', () => {
      expect(() => v.literal('active').parse('inactive')).toThrow('Expected "active"');
      expect(() => v.literal(42).parse(43)).toThrow('Expected 42');
    });
  });

  /* ============================================
     v.array()
     ============================================ */

  describe('v.array()', () => {
    it('accepts arrays, rejects non-arrays', () => {
      expect(v.array(v.string()).parse(['a', 'b'])).toEqual(['a', 'b']);
      expect(v.array(v.string()).parse([])).toEqual([]);
      expect(() => v.array(v.string()).parse('not an array')).toThrow('Expected array');
    });

    it('validates each item and puts the index in the path', () => {
      const result = v.array(v.string()).safeParse([1, 2]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual([0]);
        expect(result.error.issues[1].path).toEqual([1]);
      }
    });

    it('min / max / length', () => {
      expect(v.array(v.number()).min(2).parse([1, 2])).toEqual([1, 2]);
      expect(() => v.array(v.number()).min(2).parse([1])).toThrow('Must have at least 2 items');
      expect(() => v.array(v.number()).max(2).parse([1, 2, 3])).toThrow('Must have at most 2 items');
      expect(() => v.array(v.number()).length(2).parse([1])).toThrow('Must have exactly 2 items');
    });

    it('validates nested arrays', () => {
      const schema = v.array(v.array(v.number()));
      expect(schema.parse([[1, 2], [3]])).toEqual([[1, 2], [3]]);
      expect(() => schema.parse([[1, 'x']])).toThrow(ValidationError);
    });
  });

  /* ============================================
     v.object()
     ============================================ */

  describe('v.object()', () => {
    const User = v.object({ id: v.number(), name: v.string() });

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
      const schema = v.object({ user: v.object({ email: v.string().email() }) });
      const result = schema.safeParse({ user: { email: 'bad' } });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['user', 'email']);
      }
    });

    describe('unknown key modes (Change 3)', () => {
      it('strip (default) removes unknown keys', () => {
        const parsed = User.parse({ id: 1, name: 'Alice', extra: true } as any);
        expect(parsed).toEqual({ id: 1, name: 'Alice' });
        expect((parsed as any).extra).toBeUndefined();
      });

      it('passthrough() keeps unknown keys', () => {
        const parsed = User.passthrough().parse({ id: 1, name: 'Alice', extra: true } as any);
        expect((parsed as any).extra).toBe(true);
      });

      it('strict() rejects unknown keys', () => {
        const result = User.strict().safeParse({ id: 1, name: 'Alice', extra: true } as any);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].code).toBe('unrecognized_keys');
        }
      });
    });

    describe('partial()', () => {
      it('makes all fields optional', () => {
        const schema = User.partial();
        expect(schema.parse({})).toEqual({});
        expect(schema.parse({ name: 'Alice' })).toEqual({ name: 'Alice' });
        expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
      });
    });

    describe('extend() (Change 3)', () => {
      it('adds new fields', () => {
        const Admin = User.extend({ role: v.string() });
        expect(Admin.parse({ id: 1, name: 'Alice', role: 'admin' })).toEqual({
          id: 1,
          name: 'Alice',
          role: 'admin',
        });
      });

      it('overrides existing fields with the same key', () => {
        const schema = User.extend({ name: v.string().min(5) });
        expect(() => schema.parse({ id: 1, name: 'Al' })).toThrow();
        expect(schema.parse({ id: 1, name: 'Alice' })).toEqual({ id: 1, name: 'Alice' });
      });
    });

    describe('pick() / omit()', () => {
      const Full = v.object({ email: v.string(), id: v.number(), name: v.string() });

      it('pick() selects specified keys', () => {
        const schema = Full.pick('name', 'email');
        expect(schema.parse({ name: 'Alice', email: 'alice@example.com' })).toEqual({
          email: 'alice@example.com',
          name: 'Alice',
        });
      });

      it('omit() removes specified keys', () => {
        const schema = Full.omit('id');
        expect(schema.parse({ name: 'Alice', email: 'alice@example.com' })).toEqual({
          email: 'alice@example.com',
          name: 'Alice',
        });
      });
    });

    describe('shape property (Change 3)', () => {
      it('is publicly accessible', () => {
        expect(User.shape.id).toBeDefined();
        expect(User.shape.name).toBeDefined();
      });

      it('can be spread to compose a new schema', () => {
        const Admin = v.object({ ...User.shape, role: v.string() });
        expect(Admin.parse({ id: 1, name: 'Alice', role: 'admin' })).toEqual({
          id: 1,
          name: 'Alice',
          role: 'admin',
        });
      });
    });
  });

  /* ============================================
     v.oneOf() — replaces union
     ============================================ */

  describe('v.oneOf()', () => {
    it('passes when exactly one branch matches', () => {
      const schema = v.oneOf(v.string(), v.number());
      expect(schema.parse('hello')).toBe('hello');
      expect(schema.parse(42)).toBe(42);
    });

    it('fails when no branch matches', () => {
      const result = v.oneOf(v.string(), v.number()).safeParse(true);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_one_of');
        expect(result.error.issues[0].message).toContain('Does not match');
      }
    });

    it('fails when more than one branch matches (mutual exclusion)', () => {
      const result = v.oneOf(v.string(), v.string().min(1)).safeParse('hello');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('more than one');
      }
    });

    it('works with discriminated unions', () => {
      const schema = v.oneOf(
        v.object({ data: v.string(), type: v.literal('ok') }),
        v.object({ message: v.string(), type: v.literal('error') }),
      );
      expect(schema.parse({ data: 'yes', type: 'ok' })).toEqual({ data: 'yes', type: 'ok' });
      expect(schema.parse({ message: 'oops', type: 'error' })).toEqual({ message: 'oops', type: 'error' });
      expect(() => schema.parse({ type: 'unknown' })).toThrow();
    });

    it('infers the union type', () => {
      const schema = v.oneOf(v.string(), v.number());
      type T = Infer<typeof schema>;
      const a: T = 'hello';
      const b: T = 42;
      expect(schema.parse(a)).toBe('hello');
      expect(schema.parse(b)).toBe(42);
    });

    it('accepts raw literal values as shorthand for v.literal()', () => {
      const schema = v.oneOf('a', 'b', 'c');
      expect(schema.parse('a')).toBe('a');
      expect(schema.parse('b')).toBe('b');
      expect(() => schema.parse('d')).toThrow();
    });

    it('mixes raw values and schemas', () => {
      const schema = v.oneOf('yes', 'no', v.number());
      expect(schema.parse('yes')).toBe('yes');
      expect(schema.parse(42)).toBe(42);
      expect(() => schema.parse(true)).toThrow();
    });

    it('infers correct type for raw value shorthand', () => {
      const schema = v.oneOf('light', 'dark');
      type T = Infer<typeof schema>;
      const t: T = 'light';
      expect(schema.parse(t)).toBe('light');
    });
  });

  /* ============================================
     v.allOf()
     ============================================ */

  describe('v.allOf()', () => {
    it('passes when all schemas match', () => {
      const schema = v.allOf(v.string(), v.string().min(5));
      expect(schema.parse('hello')).toBe('hello');
    });

    it('collects issues from failing branches', () => {
      const schema = v.allOf(v.string().min(3), v.string().max(5));
      const result = schema.safeParse('toolongstring');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('fails if any branch fails', () => {
      const result = v.allOf(v.string(), v.number()).safeParse('hello');
      expect(result.success).toBe(false);
    });

    it('works for object-level combined validation', () => {
      const A = v.object({ id: v.number() });
      const B = v.object({ name: v.string() });
      const schema = v.allOf(A, B);
      expect(schema.safeParse({ id: 1, name: 'Alice' }).success).toBe(true);
      expect(schema.safeParse({ id: 1 }).success).toBe(false);
    });

    it('accepts raw literal values as shorthand for v.literal()', () => {
      // allOf with raw values — every item must pass, so only matches the exact value
      const schema = v.allOf('hello', 'hello');
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse('world')).toThrow();
    });
  });

  /* ============================================
     v.noneOf() — blocklist / exclusion schema
     ============================================ */

  describe('v.noneOf()', () => {
    it('passes when value matches none of the schemas', () => {
      expect(v.noneOf(v.string(), v.number()).parse(true)).toBe(true);
      expect(v.noneOf(v.string(), v.number()).parse(null)).toBeNull();
    });

    it('fails when value matches any schema', () => {
      expect(() => v.noneOf(v.string(), v.number()).parse('hello')).toThrow();
      expect(() => v.noneOf(v.string(), v.number()).parse(42)).toThrow();
    });

    it('uses code invalid_none_of', () => {
      const result = v.noneOf(v.string(), v.number()).safeParse('x');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_none_of');
      }
    });

    it('works as a blocklist of literals', () => {
      const schema = v.noneOf(v.literal('admin'), v.literal('system'));
      expect(schema.parse('user')).toBe('user');
      expect(() => schema.parse('admin')).toThrow('Matches a disallowed schema');
      expect(() => schema.parse('system')).toThrow('Matches a disallowed schema');
    });

    it('runs full validators, not just type checks', () => {
      // 'hi' does NOT pass v.string().min(3) → so noneOf passes
      const schema = v.noneOf(v.string().min(3));
      expect(schema.parse('hi')).toBe('hi');
      // 'hello' DOES pass v.string().min(3) → so noneOf fails
      expect(() => schema.parse('hello')).toThrow('Matches a disallowed schema');
    });

    it('accepts raw literal values as shorthand for v.literal()', () => {
      const schema = v.noneOf('admin', 'system');
      expect(schema.parse('user')).toBe('user');
      expect(() => schema.parse('admin')).toThrow('Matches a disallowed schema');
      expect(() => schema.parse('system')).toThrow('Matches a disallowed schema');
    });

    it('mixes raw values and schemas', () => {
      const schema = v.noneOf('admin', v.number());
      expect(schema.parse('user')).toBe('user');
      expect(() => schema.parse('admin')).toThrow();
      expect(() => schema.parse(42)).toThrow();
    });
  });

  /* ============================================
     v.never()
     ============================================ */

  describe('v.never()', () => {
    it('always fails', () => {
      for (const val of ['x', 0, true, null, undefined, {}]) {
        expect(() => v.never().parse(val)).toThrow('Value is not allowed');
      }
    });
  });

  /* ============================================
     Modifiers: optional / nullable / default
     ============================================ */

  describe('optional() (Change 2)', () => {
    it('allows undefined, still validates defined values', () => {
      const schema = v.string().optional();
      expect(schema.parse(undefined)).toBe(undefined);
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse(123)).toThrow(ValidationError);
    });

    it('preserves subclass methods — constraints before optional still enforced', () => {
      const schema = v.string().min(3).optional();
      expect(schema.parse(undefined)).toBe(undefined);
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse('hi')).toThrow();
    });

    it('optional number with constraint', () => {
      const schema = v.object({ age: v.number().min(0).optional() });
      expect(schema.parse({})).toEqual({});
      expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
      expect(() => schema.parse({ age: -1 })).toThrow();
    });

    it('infers Output | undefined', () => {
      const schema = v.string().optional();
      type T = Infer<typeof schema>;
      const val: T = undefined;
      expect(schema.parse(val)).toBeUndefined();
    });
  });

  describe('nullable() (Change 2)', () => {
    it('allows null, still validates non-null values', () => {
      const schema = v.string().nullable();
      expect(schema.parse(null)).toBe(null);
      expect(schema.parse('hello')).toBe('hello');
      expect(() => schema.parse(123)).toThrow(ValidationError);
    });

    it('preserves subclass methods — constraints before nullable still enforced', () => {
      const schema = v.number().min(0).nullable();
      expect(schema.parse(null)).toBe(null);
      expect(schema.parse(5)).toBe(5);
      expect(() => schema.parse(-1)).toThrow();
    });
  });

  describe('default()', () => {
    it('substitutes a default for undefined', () => {
      expect(v.string().default('x').parse(undefined)).toBe('x');
      expect(v.string().default('x').parse('y')).toBe('y');
    });

    it('works with objects', () => {
      const schema = v.object({ color: v.string() }).default({ color: 'blue' });
      expect(schema.parse(undefined)).toEqual({ color: 'blue' });
      expect(schema.parse({ color: 'red' })).toEqual({ color: 'red' });
    });
  });

  /* ============================================
     refine() — unified sync + async (Change 4)
     ============================================ */

  describe('refine()', () => {
    it('adds sync custom validation', () => {
      const schema = v.number().refine((n) => n % 2 === 0, 'Must be even');
      expect(schema.parse(4)).toBe(4);
      expect(() => schema.parse(3)).toThrow('Must be even');
    });

    it('chains multiple refinements', () => {
      const schema = v
        .string()
        .refine((s) => s.includes('@'), 'Must contain @')
        .refine((s) => s.includes('.'), 'Must contain .');
      expect(schema.parse('a@b.c')).toBe('a@b.c');
      expect(() => schema.parse('nope')).toThrow('Must contain @');
    });

    it('works for cross-field object validation', () => {
      const schema = v
        .object({ confirm: v.string(), password: v.string() })
        .refine((d) => d.password === d.confirm, 'Passwords must match');
      expect(schema.parse({ confirm: 'abc', password: 'abc' })).toEqual({ confirm: 'abc', password: 'abc' });
      expect(() => schema.parse({ confirm: 'xyz', password: 'abc' })).toThrow('Passwords must match');
    });

    it('accepts an async function and defers to parseAsync', async () => {
      const schema = v.string().refine(async (s) => {
        await new Promise((r) => setTimeout(r, 1));
        return s.length >= 3;
      }, 'Too short');

      expect(await schema.parseAsync('hello')).toBe('hello');
      await expect(schema.parseAsync('hi')).rejects.toThrow('Too short');
    });

    it('throws when an async refinement is used with sync parse()', () => {
      const schema = v.string().refine(async () => true);
      expect(() => schema.parse('x')).toThrow('async validators');
    });
  });

  /* ============================================
     is() type guard (Change 5)
     ============================================ */

  describe('is()', () => {
    it('returns true for valid values', () => {
      expect(v.string().is('hello')).toBe(true);
      expect(v.number().is(42)).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(v.string().is(123)).toBe(false);
      expect(v.number().is('text')).toBe(false);
    });

    it('narrows the type', () => {
      const val: unknown = 'hi';
      if (v.string().is(val)) {
        expect(val.toUpperCase()).toBe('HI');
      }
    });
  });

  /* ============================================
     v.coerce.*  — returns proper subclass (Change 6)
     ============================================ */

  describe('v.coerce', () => {
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

    describe('coerce.number()', () => {
      it('coerces numeric strings, rejects non-numeric', () => {
        expect(v.coerce.number().int().parse('42')).toBe(42);
        expect(() => v.coerce.number().parse('abc')).toThrow();
      });

      it('preserves actual numbers and chains constraints', () => {
        expect(v.coerce.number().positive().parse(3)).toBe(3);
      });
    });

    describe('coerce.boolean()', () => {
      it('coerces "true"/1 to true and "false"/0 to false', () => {
        expect(v.coerce.boolean().parse('true')).toBe(true);
        expect(v.coerce.boolean().parse(1)).toBe(true);
        expect(v.coerce.boolean().parse('false')).toBe(false);
        expect(v.coerce.boolean().parse(0)).toBe(false);
      });

      it('rejects unrecognised values', () => {
        expect(() => v.coerce.boolean().parse('yes')).toThrow();
      });
    });

    describe('coerce.date()', () => {
      it('coerces ISO strings and timestamps', () => {
        expect(v.coerce.date().min(new Date('2000-01-01')).parse('2024-01-01')).toBeInstanceOf(Date);
        expect(v.coerce.date().parse(1700000000000)).toBeInstanceOf(Date);
      });

      it('rejects unparseable strings', () => {
        expect(() => v.coerce.date().parse('not-a-date')).toThrow();
      });
    });
  });

  /* ============================================
     pipe() (Change 9)
     ============================================ */

  describe('pipe()', () => {
    it('threads through a sequence of schemas', () => {
      const schema = pipe(v.string(), v.coerce.number(), v.number().int().min(0));
      expect(schema.parse('42')).toBe(42);
    });

    it('fails at the first failing step', () => {
      const schema = pipe(v.string(), v.coerce.number(), v.number().int());
      expect(() => schema.parse(true)).toThrow(ValidationError);
    });

    it('single-schema pipe is a pass-through', () => {
      const schema = pipe(v.string().min(3));
      expect(schema.parse('hello')).toBe('hello');
    });
  });

  /* ============================================
     safeParse / parseAsync / safeParseAsync
     ============================================ */

  describe('safeParse()', () => {
    it('returns { success: true, data } for valid input', () => {
      const result = v.string().safeParse('hello');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('hello');
    });

    it('returns { success: false, error } for invalid input without throwing', () => {
      const result = v.string().safeParse(123);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.issues).toHaveLength(1);
      }
    });

    it('collects multiple field errors for objects', () => {
      const result = v.object({ a: v.string(), b: v.number() }).safeParse({ a: 1, b: 'x' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('parseAsync() / safeParseAsync()', () => {
    it('parses synchronous schemas asynchronously', async () => {
      expect(await v.string().min(2).parseAsync('hi')).toBe('hi');
    });

    it('runs async refine', async () => {
      const schema = v.number().refine(async (n) => n > 0, 'Must be positive');
      expect(await schema.parseAsync(1)).toBe(1);
      await expect(schema.parseAsync(-1)).rejects.toThrow('Must be positive');
    });

    it('safeParseAsync returns success/error without throwing', async () => {
      const ok = await v.string().safeParseAsync('x');
      expect(ok.success).toBe(true);

      const fail = await v.string().safeParseAsync(42);
      expect(fail.success).toBe(false);
    });
  });

  /* ============================================
     Type inference
     ============================================ */

  describe('Infer<>', () => {
    it('infers primitives', () => {
      const s = v.string();
      type S = Infer<typeof s>;
      const val: S = 'hello';
      expect(s.parse(val)).toBe(val);
    });

    it('infers object types', () => {
      const schema = v.object({ id: v.number(), name: v.string() });
      type T = Infer<typeof schema>;
      const obj: T = { id: 1, name: 'Alice' };
      expect(schema.parse(obj)).toEqual(obj);
    });

    it('infers array types', () => {
      const schema = v.array(v.boolean());
      type T = Infer<typeof schema>;
      const arr: T = [true, false];
      expect(schema.parse(arr)).toEqual(arr);
    });

    it('infers optional as T | undefined', () => {
      const schema = v.number().optional();
      type T = Infer<typeof schema>;
      const undef: T = undefined;
      expect(schema.parse(undef)).toBeUndefined();
    });

    it('infers nullable as T | null', () => {
      const schema = v.string().nullable();
      type T = Infer<typeof schema>;
      const nul: T = null;
      expect(schema.parse(nul)).toBeNull();
    });
  });

  /* ============================================
     Field-level transforms propagate through containers
     ============================================ */

  describe('field-level transforms in containers', () => {
    describe('object fields', () => {
      it('trim() on a string field preserves the trimmed value in output', () => {
        const schema = v.object({ name: v.string().trim() });
        expect(schema.parse({ name: '  alice  ' })).toEqual({ name: 'alice' });
      });

      it('default() on an object field fills missing keys', () => {
        const schema = v.object({ role: v.string().default('user') });
        expect(schema.parse({})).toEqual({ role: 'user' });
        expect(schema.parse({ role: 'admin' })).toEqual({ role: 'admin' });
      });

      it('coerce.number() inside object coerces the field value', () => {
        const schema = v.object({ age: v.coerce.number() });
        expect(schema.parse({ age: '42' })).toEqual({ age: 42 });
      });
    });

    describe('array items', () => {
      it('coerce.number() inside array coerces each item', () => {
        expect(v.array(v.coerce.number()).parse(['1', '2', '3'])).toEqual([1, 2, 3]);
      });

      it('trim() inside array items preserves trimmed values', () => {
        expect(v.array(v.string().trim()).parse(['  a  ', '  b  '])).toEqual(['a', 'b']);
      });

      it('default() inside array fills missing item values', () => {
        expect(v.array(v.string().default('x')).parse([undefined, 'hello'])).toEqual(['x', 'hello']);
      });
    });
  });

  /* ============================================
     Complex integration
     ============================================ */

  describe('complex schemas', () => {
    it('validates a user registration form', () => {
      const schema = v
        .object({
          age: v.number().int().min(13),
          confirmPassword: v.string(),
          email: v.string().email(),
          password: v
            .string()
            .min(8)
            .refine((s) => /[A-Z]/.test(s), 'Must contain uppercase')
            .refine((s) => /[0-9]/.test(s), 'Must contain number'),
          terms: v.boolean().refine((b) => b === true, 'Must accept terms'),
          username: v
            .string()
            .min(3)
            .max(20)
            .pattern(/^[a-zA-Z0-9_]+$/),
        })
        .refine((d) => d.password === d.confirmPassword, 'Passwords must match');

      const valid = {
        age: 25,
        confirmPassword: 'SecurePass1',
        email: 'alice@example.com',
        password: 'SecurePass1',
        terms: true,
        username: 'alice_99',
      };

      expect(schema.parse(valid)).toEqual(valid);
      expect(() => schema.parse({ ...valid, confirmPassword: 'Different1' })).toThrow('Passwords must match');
    });

    it('validates an array of objects with deep paths', () => {
      const schema = v.array(v.object({ id: v.number(), name: v.string() }));
      const result = schema.safeParse([
        { id: 1, name: 'A' },
        { id: 'bad', name: 'B' },
      ]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual([1, 'id']);
      }
    });

    it('validates a complex nested structure', () => {
      const schema = v.object({
        email: v.string().email(),
        id: v.number().int().positive(),
        profile: v.object({
          address: v.object({ city: v.string(), zip: v.string().pattern(/^\d{5}$/) }).optional(),
          firstName: v.string(),
        }),
        roles: v.array(v.oneOf(v.literal('admin'), v.literal('user'), v.literal('guest'))).min(1),
        settings: v.object({
          theme: v.oneOf(v.literal('light'), v.literal('dark')).default('light' as 'light' | 'dark'),
        }),
      });

      const data = {
        email: 'alice@example.com',
        id: 1,
        profile: { address: { city: 'NY', zip: '10001' }, firstName: 'Alice' },
        roles: ['admin'],
        settings: { theme: 'dark' as const },
      };

      expect(schema.parse(data)).toEqual(data);
    });
  });
});
