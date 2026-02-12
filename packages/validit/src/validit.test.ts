/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { type Infer, ValidationError, v } from './validit';

/* ============================================
   ValidationError Tests
   ============================================ */

describe('ValidationError', () => {
  it('should format error messages correctly', () => {
    const error = new ValidationError([
      { message: 'Required', path: ['name'] },
      { message: 'Must be a number', path: ['age'] },
    ]);

    expect(error.name).toBe('ValidationError');
    expect(error.issues).toHaveLength(2);
    expect(error.message).toContain('name: Required');
    expect(error.message).toContain('age: Must be a number');
  });

  it('should format root path as "value"', () => {
    const error = new ValidationError([{ message: 'Invalid', path: [] }]);
    expect(error.message).toBe('value: Invalid');
  });

  it('should format nested paths correctly', () => {
    const error = new ValidationError([{ message: 'Required', path: ['user', 'address', 'city'] }]);
    expect(error.message).toBe('user.address.city: Required');
  });

  it('should format array paths correctly', () => {
    const error = new ValidationError([{ message: 'Invalid', path: ['items', 0, 'name'] }]);
    expect(error.message).toBe('items.0.name: Invalid');
  });

  it('should include error codes in formatted output', () => {
    const error = new ValidationError([
      { code: 'too_small', message: 'Too short', params: { minimum: 5 }, path: ['name'] },
    ]);
    expect(error.message).toBe('name: Too short [too_small]');
  });

  it('should support error codes and params for i18n', () => {
    const schema = v.string().min(5);
    const result = schema.safeParse('hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue.code).toBe('too_small');
      expect(issue.params).toEqual({ minimum: 5, type: 'string' });
      expect(issue.message).toBe('Must be at least 5 characters');
    }
  });
});

/* ============================================
   String Schema Tests
   ============================================ */

describe('v.string()', () => {
  it('should validate strings', () => {
    const schema = v.string();
    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse('')).toBe('');
  });

  it('should reject non-strings', () => {
    const schema = v.string();
    expect(() => schema.parse(123)).toThrow(ValidationError);
    expect(() => schema.parse(true)).toThrow(ValidationError);
    expect(() => schema.parse(null)).toThrow(ValidationError);
    expect(() => schema.parse(undefined)).toThrow(ValidationError);
  });

  it('should validate min length', () => {
    const schema = v.string().min(3);
    expect(schema.parse('abc')).toBe('abc');
    expect(schema.parse('abcd')).toBe('abcd');
    expect(() => schema.parse('ab')).toThrow('Must be at least 3 characters');
  });

  it('should validate max length', () => {
    const schema = v.string().max(5);
    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse('hi')).toBe('hi');
    expect(() => schema.parse('toolong')).toThrow('Must be at most 5 characters');
  });

  it('should validate exact length', () => {
    const schema = v.string().length(5);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow('Must be exactly 5 characters');
    expect(() => schema.parse('toolong')).toThrow('Must be exactly 5 characters');
  });

  it('should validate pattern', () => {
    const schema = v.string().pattern(/^[a-z]+$/);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('Hello')).toThrow('Invalid format');
    expect(() => schema.parse('hello123')).toThrow('Invalid format');
  });

  it('should validate email', () => {
    const schema = v.string().email();
    expect(schema.parse('user@example.com')).toBe('user@example.com');
    expect(schema.parse('test+tag@domain.co.uk')).toBe('test+tag@domain.co.uk');
    expect(() => schema.parse('invalid')).toThrow('Invalid email address');
    expect(() => schema.parse('invalid@')).toThrow('Invalid email address');
    expect(() => schema.parse('@example.com')).toThrow('Invalid email address');
  });

  it('should validate URL', () => {
    const schema = v.string().url();
    expect(schema.parse('https://example.com')).toBe('https://example.com');
    expect(schema.parse('http://localhost:3000')).toBe('http://localhost:3000');
    expect(() => schema.parse('invalid')).toThrow('Invalid URL');
    expect(() => schema.parse('not a url')).toThrow('Invalid URL');
  });

  it('should chain validations', () => {
    const schema = v
      .string()
      .min(3)
      .max(10)
      .pattern(/^[a-z]+$/);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow('Must be at least 3 characters');
    expect(() => schema.parse('toolongstring')).toThrow('Must be at most 10 characters');
    expect(() => schema.parse('Hello')).toThrow('Invalid format');
  });

  it('should support custom error messages', () => {
    const schema = v.string().min(3, 'Too short!').max(10, 'Too long!');
    expect(() => schema.parse('hi')).toThrow('Too short!');
    expect(() => schema.parse('verylongstring')).toThrow('Too long!');
  });
});

/* ============================================
   Number Schema Tests
   ============================================ */

describe('v.number()', () => {
  it('should validate numbers', () => {
    const schema = v.number();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(123)).toBe(123);
    expect(schema.parse(-456)).toBe(-456);
    expect(schema.parse(Math.PI)).toBe(Math.PI);
  });

  it('should reject non-numbers', () => {
    const schema = v.number();
    expect(() => schema.parse('123')).toThrow(ValidationError);
    expect(() => schema.parse(true)).toThrow(ValidationError);
    expect(() => schema.parse(null)).toThrow(ValidationError);
    expect(() => schema.parse(undefined)).toThrow(ValidationError);
  });

  it('should reject NaN', () => {
    const schema = v.number();
    expect(() => schema.parse(Number.NaN)).toThrow('Expected number');
  });

  it('should validate min value', () => {
    const schema = v.number().min(0);
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(100)).toBe(100);
    expect(() => schema.parse(-1)).toThrow('Must be at least 0');
  });

  it('should validate max value', () => {
    const schema = v.number().max(100);
    expect(schema.parse(100)).toBe(100);
    expect(schema.parse(50)).toBe(50);
    expect(() => schema.parse(101)).toThrow('Must be at most 100');
  });

  it('should validate integer', () => {
    const schema = v.number().int();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(123)).toBe(123);
    expect(schema.parse(-456)).toBe(-456);
    expect(() => schema.parse(3.14)).toThrow('Must be an integer');
  });

  it('should validate positive numbers', () => {
    const schema = v.number().positive();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse(-1)).toThrow('Must be positive');
  });

  it('should validate negative numbers', () => {
    const schema = v.number().negative();
    expect(schema.parse(0)).toBe(0);
    expect(schema.parse(-1)).toBe(-1);
    expect(() => schema.parse(1)).toThrow('Must be negative');
  });

  it('should chain validations', () => {
    const schema = v.number().int().min(0).max(100);
    expect(schema.parse(50)).toBe(50);
    expect(() => schema.parse(3.14)).toThrow('Must be an integer');
    expect(() => schema.parse(-1)).toThrow('Must be at least 0');
    expect(() => schema.parse(101)).toThrow('Must be at most 100');
  });
});

/* ============================================
   Boolean Schema Tests
   ============================================ */

describe('v.boolean()', () => {
  it('should validate booleans', () => {
    const schema = v.boolean();
    expect(schema.parse(true)).toBe(true);
    expect(schema.parse(false)).toBe(false);
  });

  it('should reject non-booleans', () => {
    const schema = v.boolean();
    expect(() => schema.parse(1)).toThrow(ValidationError);
    expect(() => schema.parse(0)).toThrow(ValidationError);
    expect(() => schema.parse('true')).toThrow(ValidationError);
    expect(() => schema.parse(null)).toThrow(ValidationError);
  });
});

/* ============================================
   Date Schema Tests
   ============================================ */

describe('v.date()', () => {
  it('should validate dates', () => {
    const schema = v.date();
    const date = new Date('2024-01-01');
    expect(schema.parse(date)).toBe(date);
  });

  it('should reject invalid dates', () => {
    const schema = v.date();
    expect(() => schema.parse(new Date('invalid'))).toThrow('Expected valid date');
    expect(() => schema.parse('2024-01-01')).toThrow(ValidationError);
    expect(() => schema.parse(1234567890)).toThrow(ValidationError);
  });

  it('should validate min date', () => {
    const minDate = new Date('2024-01-01');
    const schema = v.date().min(minDate);
    expect(schema.parse(new Date('2024-06-01'))).toBeInstanceOf(Date);
    expect(schema.parse(minDate)).toBe(minDate);
    expect(() => schema.parse(new Date('2023-12-31'))).toThrow();
  });

  it('should validate max date', () => {
    const maxDate = new Date('2024-12-31');
    const schema = v.date().max(maxDate);
    expect(schema.parse(new Date('2024-06-01'))).toBeInstanceOf(Date);
    expect(schema.parse(maxDate)).toBe(maxDate);
    expect(() => schema.parse(new Date('2025-01-01'))).toThrow();
  });

  it('should chain date validations', () => {
    const minDate = new Date('2024-01-01');
    const maxDate = new Date('2024-12-31');
    const schema = v.date().min(minDate).max(maxDate);
    expect(schema.parse(new Date('2024-06-01'))).toBeInstanceOf(Date);
    expect(() => schema.parse(new Date('2023-12-31'))).toThrow();
    expect(() => schema.parse(new Date('2025-01-01'))).toThrow();
  });
});

/* ============================================
   Literal Schema Tests
   ============================================ */

describe('v.literal()', () => {
  it('should validate exact string literals', () => {
    const schema = v.literal('active');
    expect(schema.parse('active')).toBe('active');
    expect(() => schema.parse('inactive')).toThrow('Expected "active"');
    expect(() => schema.parse('')).toThrow();
  });

  it('should validate exact number literals', () => {
    const schema = v.literal(42);
    expect(schema.parse(42)).toBe(42);
    expect(() => schema.parse(43)).toThrow('Expected 42');
  });

  it('should validate exact boolean literals', () => {
    const schema = v.literal(true);
    expect(schema.parse(true)).toBe(true);
    expect(() => schema.parse(false)).toThrow('Expected true');
  });
});

/* ============================================
   OneOf (Enum) Schema Tests
   ============================================ */

describe('v.oneOf()', () => {
  it('should validate string enums', () => {
    const schema = v.oneOf('red', 'green', 'blue');
    expect(schema.parse('red')).toBe('red');
    expect(schema.parse('green')).toBe('green');
    expect(schema.parse('blue')).toBe('blue');
    expect(() => schema.parse('yellow')).toThrow('Expected one of: red, green, blue');
  });

  it('should validate number enums', () => {
    const schema = v.oneOf(1, 2, 3);
    expect(schema.parse(1)).toBe(1);
    expect(schema.parse(2)).toBe(2);
    expect(() => schema.parse(4)).toThrow('Expected one of: 1, 2, 3');
  });

  it('should validate mixed enums', () => {
    const schema = v.oneOf('active', 1, 'inactive', 0);
    expect(schema.parse('active')).toBe('active');
    expect(schema.parse(1)).toBe(1);
    expect(() => schema.parse('pending')).toThrow();
  });

  it('should infer correct type', () => {
    const schema = v.oneOf('admin', 'user', 'guest');
    type Role = Infer<typeof schema>;
    const role: Role = 'admin';
    expect(schema.parse(role)).toBe('admin');
  });
});

/* ============================================
   Array Schema Tests
   ============================================ */

describe('v.array()', () => {
  it('should validate arrays', () => {
    const schema = v.array(v.string());
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(schema.parse([])).toEqual([]);
  });

  it('should reject non-arrays', () => {
    const schema = v.array(v.string());
    expect(() => schema.parse('not an array')).toThrow('Expected array');
    expect(() => schema.parse(123)).toThrow(ValidationError);
    expect(() => schema.parse({})).toThrow(ValidationError);
  });

  it('should validate array items', () => {
    const schema = v.array(v.number());
    expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3]);
    expect(() => schema.parse([1, 'two', 3])).toThrow(ValidationError);
  });

  it('should include item index in error path', () => {
    const schema = v.array(v.string());
    const result = schema.safeParse([1, 2, 3]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([0]);
      expect(result.error.issues[1].path).toEqual([1]);
      expect(result.error.issues[2].path).toEqual([2]);
    }
  });

  it('should validate min length', () => {
    const schema = v.array(v.string()).min(2);
    expect(schema.parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => schema.parse(['a'])).toThrow('Must have at least 2 items');
  });

  it('should validate max length', () => {
    const schema = v.array(v.string()).max(3);
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(() => schema.parse(['a', 'b', 'c', 'd'])).toThrow('Must have at most 3 items');
  });

  it('should validate exact length', () => {
    const schema = v.array(v.string()).length(3);
    expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(() => schema.parse(['a', 'b'])).toThrow('Must have exactly 3 items');
  });

  it('should validate nonempty', () => {
    const schema = v.array(v.string()).nonempty();
    expect(schema.parse(['a'])).toEqual(['a']);
    expect(() => schema.parse([])).toThrow('Must not be empty');
  });

  it('should validate nested arrays', () => {
    const schema = v.array(v.array(v.number()));
    expect(
      schema.parse([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(() =>
      schema.parse([
        [1, 'two'],
        [3, 4],
      ]),
    ).toThrow(ValidationError);
  });
});

/* ============================================
   Object Schema Tests
   ============================================ */

describe('v.object()', () => {
  it('should validate objects', () => {
    const schema = v.object({
      age: v.number(),
      name: v.string(),
    });
    expect(schema.parse({ age: 30, name: 'John' })).toEqual({ age: 30, name: 'John' });
  });

  it('should reject non-objects', () => {
    const schema = v.object({ name: v.string() });
    expect(() => schema.parse('not an object')).toThrow('Expected object');
    expect(() => schema.parse(123)).toThrow(ValidationError);
    expect(() => schema.parse([])).toThrow(ValidationError);
    expect(() => schema.parse(null)).toThrow(ValidationError);
  });

  it('should validate object properties', () => {
    const schema = v.object({
      age: v.number(),
      name: v.string(),
    });
    expect(() => schema.parse({ age: 30, name: 123 })).toThrow(ValidationError);
    expect(() => schema.parse({ age: 'thirty', name: 'John' })).toThrow(ValidationError);
  });

  it('should include property name in error path', () => {
    const schema = v.object({
      age: v.number(),
      name: v.string(),
    });
    const result = schema.safeParse({ age: 'thirty', name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'age')).toBe(true);
    }
  });

  it('should validate nested objects', () => {
    const schema = v.object({
      user: v.object({
        email: v.string().email(),
        name: v.string(),
      }),
    });
    expect(schema.parse({ user: { email: 'john@example.com', name: 'John' } })).toEqual({
      user: { email: 'john@example.com', name: 'John' },
    });
    expect(() => schema.parse({ user: { email: 'invalid', name: 'John' } })).toThrow(ValidationError);
  });

  it('should include nested path in errors', () => {
    const schema = v.object({
      user: v.object({
        email: v.string().email(),
      }),
    });
    const result = schema.safeParse({ user: { email: 'invalid' } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['user', 'email']);
    }
  });

  it('should support partial()', () => {
    const schema = v
      .object({
        age: v.number(),
        name: v.string(),
      })
      .partial();

    expect(schema.parse({})).toEqual({});
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
    expect(schema.parse({ age: 30 })).toEqual({ age: 30 });
    expect(schema.parse({ age: 30, name: 'John' })).toEqual({ age: 30, name: 'John' });
  });

  it('should support pick()', () => {
    const schema = v
      .object({
        age: v.number(),
        email: v.string(),
        name: v.string(),
      })
      .pick('name', 'email');

    expect(schema.parse({ email: 'john@example.com', name: 'John' })).toEqual({
      email: 'john@example.com',
      name: 'John',
    });
  });

  it('should support omit()', () => {
    const schema = v
      .object({
        age: v.number(),
        email: v.string(),
        name: v.string(),
      })
      .omit('age');

    expect(schema.parse({ email: 'john@example.com', name: 'John' })).toEqual({
      email: 'john@example.com',
      name: 'John',
    });
  });

  it('should infer correct type', () => {
    const schema = v.object({
      active: v.boolean(),
      id: v.number(),
      name: v.string(),
    });

    type User = Infer<typeof schema>;
    const user: User = { active: true, id: 1, name: 'John' };
    expect(schema.parse(user)).toEqual(user);
  });
});

/* ============================================
   Union Schema Tests
   ============================================ */

describe('v.union()', () => {
  it('should validate union of primitives', () => {
    const schema = v.union(v.string(), v.number());
    expect(schema.parse('hello')).toBe('hello');
    expect(schema.parse(123)).toBe(123);
    expect(() => schema.parse(true)).toThrow('Does not match any union type');
  });

  it('should validate union of objects (discriminated union)', () => {
    const schema = v.union(
      v.object({ data: v.string(), type: v.literal('success') }),
      v.object({ message: v.string(), type: v.literal('error') }),
    );

    expect(schema.parse({ data: 'ok', type: 'success' })).toEqual({ data: 'ok', type: 'success' });
    expect(schema.parse({ message: 'fail', type: 'error' })).toEqual({ message: 'fail', type: 'error' });
    expect(() => schema.parse({ type: 'unknown' })).toThrow();
  });

  it('should validate multiple types', () => {
    const schema = v.union(v.string(), v.number(), v.boolean());
    expect(schema.parse('test')).toBe('test');
    expect(schema.parse(42)).toBe(42);
    expect(schema.parse(true)).toBe(true);
    expect(() => schema.parse(null)).toThrow();
  });

  it('should infer correct union type', () => {
    const schema = v.union(v.string(), v.number());
    type Value = Infer<typeof schema>;
    const strValue: Value = 'hello';
    const numValue: Value = 123;
    expect(schema.parse(strValue)).toBe('hello');
    expect(schema.parse(numValue)).toBe(123);
  });
});

/* ============================================
   Modifier Tests
   ============================================ */

describe('optional()', () => {
  it('should allow undefined', () => {
    const schema = v.string().optional();
    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse('hello')).toBe('hello');
  });

  it('should still validate defined values', () => {
    const schema = v.number().min(0).optional();
    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });

  it('should work with objects', () => {
    const schema = v.object({
      age: v.number().optional(),
      name: v.string(),
    });
    expect(schema.parse({ name: 'John' })).toEqual({ name: 'John' });
    expect(schema.parse({ age: 30, name: 'John' })).toEqual({ age: 30, name: 'John' });
  });

  it('should infer correct type', () => {
    const schema = v.string().optional();
    type Value = Infer<typeof schema>;
    const val: Value = undefined;
    expect(schema.parse(val)).toBe(undefined);
  });
});

describe('nullable()', () => {
  it('should allow null', () => {
    const schema = v.string().nullable();
    expect(schema.parse(null)).toBe(null);
    expect(schema.parse('hello')).toBe('hello');
  });

  it('should still validate non-null values', () => {
    const schema = v.number().min(0).nullable();
    expect(schema.parse(null)).toBe(null);
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-1)).toThrow();
  });

  it('should infer correct type', () => {
    const schema = v.string().nullable();
    type Value = Infer<typeof schema>;
    const val: Value = null;
    expect(schema.parse(val)).toBe(null);
  });
});

describe('default()', () => {
  it('should use default value for undefined', () => {
    const schema = v.string().default('default');
    expect(schema.parse(undefined)).toBe('default');
    expect(schema.parse('custom')).toBe('custom');
  });

  it('should work with numbers', () => {
    const schema = v.number().default(0);
    expect(schema.parse(undefined)).toBe(0);
    expect(schema.parse(42)).toBe(42);
  });

  it('should work with objects', () => {
    const schema = v
      .object({
        color: v.string(),
      })
      .default({ color: 'blue' });

    expect(schema.parse(undefined)).toEqual({ color: 'blue' });
    expect(schema.parse({ color: 'red' })).toEqual({ color: 'red' });
  });
});

describe('refine()', () => {
  it('should add custom validation', () => {
    const schema = v.number().refine((val) => val % 2 === 0, 'Must be even');
    expect(schema.parse(2)).toBe(2);
    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow('Must be even');
  });

  it('should chain multiple refinements', () => {
    const schema = v
      .string()
      .refine((val) => val.includes('@'), 'Must contain @')
      .refine((val) => val.includes('.'), 'Must contain .');

    expect(schema.parse('test@example.com')).toBe('test@example.com');
    expect(() => schema.parse('test')).toThrow('Must contain @');
    expect(() => schema.parse('test@domain')).toThrow('Must contain .');
  });

  it('should work with objects', () => {
    const schema = v
      .object({
        confirm: v.string(),
        password: v.string(),
      })
      .refine((data) => data.password === data.confirm, 'Passwords must match');

    expect(schema.parse({ confirm: 'secret', password: 'secret' })).toEqual({
      confirm: 'secret',
      password: 'secret',
    });
    expect(() => schema.parse({ confirm: 'different', password: 'secret' })).toThrow('Passwords must match');
  });

  it('should use default error message', () => {
    const schema = v.number().refine((val) => val > 0);
    expect(() => schema.parse(-1)).toThrow('Invalid value');
  });
});

/* ============================================
   safeParse Tests
   ============================================ */

describe('safeParse()', () => {
  it('should return success result for valid data', () => {
    const schema = v.string();
    const result = schema.safeParse('hello');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('should return error result for invalid data', () => {
    const schema = v.string();
    const result = schema.safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0].message).toBe('Expected string');
    }
  });

  it('should not throw exceptions', () => {
    const schema = v.number();
    expect(() => schema.safeParse('invalid')).not.toThrow();
  });

  it('should collect all validation errors', () => {
    const schema = v.object({
      age: v.number().min(0),
      email: v.string().email(),
      name: v.string(),
    });

    const result = schema.safeParse({
      age: -5,
      email: 'invalid',
      name: 123,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

/* ============================================
   Utility Schema Tests
   ============================================ */

describe('v.any()', () => {
  it('should accept any value', () => {
    const schema = v.any();
    expect(schema.parse('string')).toBe('string');
    expect(schema.parse(123)).toBe(123);
    expect(schema.parse(true)).toBe(true);
    expect(schema.parse(null)).toBe(null);
    expect(schema.parse(undefined)).toBe(undefined);
    expect(schema.parse({})).toEqual({});
    expect(schema.parse([])).toEqual([]);
  });
});

describe('v.unknown()', () => {
  it('should accept any value', () => {
    const schema = v.unknown();
    expect(schema.parse('string')).toBe('string');
    expect(schema.parse(123)).toBe(123);
    expect(schema.parse({})).toEqual({});
  });
});

describe('v.null()', () => {
  it('should only accept null', () => {
    const schema = v.null();
    expect(schema.parse(null)).toBe(null);
    expect(() => schema.parse(undefined)).toThrow();
    expect(() => schema.parse('null')).toThrow();
  });
});

describe('v.undefined()', () => {
  it('should only accept undefined', () => {
    const schema = v.undefined();
    expect(schema.parse(undefined)).toBe(undefined);
    expect(() => schema.parse(null)).toThrow();
    expect(() => schema.parse('undefined')).toThrow();
  });
});

describe('v.void()', () => {
  it('should only accept undefined', () => {
    const schema = v.void();
    expect(schema.parse(undefined)).toBe(undefined);
    expect(() => schema.parse(null)).toThrow();
  });
});

/* ============================================
   Complex Integration Tests
   ============================================ */

describe('Complex schemas', () => {
  it('should validate complex nested structures', () => {
    const schema = v.object({
      email: v.string().email(),
      id: v.number().int().positive(),
      profile: v.object({
        address: v
          .object({
            city: v.string(),
            street: v.string(),
            zipCode: v.string().pattern(/^\d{5}$/),
          })
          .optional(),
        age: v.number().int().min(0).optional(),
        firstName: v.string(),
        lastName: v.string(),
      }),
      roles: v.array(v.oneOf('admin', 'user', 'guest')).min(1),
      settings: v.object({
        notifications: v.boolean().default(true),
        theme: v.oneOf('light', 'dark').default('light'),
      }),
      username: v.string().min(3).max(20),
    });

    const validData = {
      email: 'john@example.com',
      id: 1,
      profile: {
        address: {
          city: 'New York',
          street: '123 Main St',
          zipCode: '10001',
        },
        age: 30,
        firstName: 'John',
        lastName: 'Doe',
      },
      roles: ['user'],
      settings: {
        notifications: true,
        theme: 'dark' as const,
      },
      username: 'johndoe',
    };

    expect(schema.parse(validData)).toEqual(validData);
  });

  it('should handle array of objects', () => {
    const schema = v.array(
      v.object({
        id: v.number(),
        name: v.string(),
      }),
    );

    expect(
      schema.parse([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    ).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    const result = schema.safeParse([
      { id: 1, name: 'Alice' },
      { id: 'invalid', name: 'Bob' },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual([1, 'id']);
    }
  });

  it('should handle discriminated unions', () => {
    const schema = v.union(
      v.object({
        radius: v.number().positive(),
        type: v.literal('circle'),
      }),
      v.object({
        height: v.number().positive(),
        type: v.literal('rectangle'),
        width: v.number().positive(),
      }),
      v.object({
        base: v.number().positive(),
        height: v.number().positive(),
        type: v.literal('triangle'),
      }),
    );

    expect(schema.parse({ radius: 5, type: 'circle' })).toEqual({ radius: 5, type: 'circle' });
    expect(schema.parse({ height: 20, type: 'rectangle', width: 10 })).toEqual({
      height: 20,
      type: 'rectangle',
      width: 10,
    });
  });

  it('should validate form data', () => {
    const registrationSchema = v
      .object({
        age: v.number().int().min(13),
        confirmPassword: v.string(),
        email: v.string().email(),
        password: v
          .string()
          .min(8)
          .refine((val) => /[A-Z]/.test(val), 'Must contain uppercase')
          .refine((val) => /[a-z]/.test(val), 'Must contain lowercase')
          .refine((val) => /[0-9]/.test(val), 'Must contain number'),
        terms: v.boolean().refine((val) => val === true, 'Must accept terms'),
        username: v
          .string()
          .min(3)
          .max(20)
          .pattern(/^[a-zA-Z0-9_]+$/),
      })
      .refine((data) => data.password === data.confirmPassword, 'Passwords must match');

    const validData = {
      age: 25,
      confirmPassword: 'SecurePass123',
      email: 'john@example.com',
      password: 'SecurePass123',
      terms: true,
      username: 'john_doe',
    };

    expect(registrationSchema.parse(validData)).toEqual(validData);

    const invalidData = {
      ...validData,
      confirmPassword: 'DifferentPass123',
    };

    expect(() => registrationSchema.parse(invalidData)).toThrow('Passwords must match');
  });
});

/* ============================================
   Type Inference Tests
   ============================================ */

describe('Type inference', () => {
  it('should infer primitive types', () => {
    const stringSchema = v.string();
    const numberSchema = v.number();
    const booleanSchema = v.boolean();

    type StringType = Infer<typeof stringSchema>;
    type NumberType = Infer<typeof numberSchema>;
    type BooleanType = Infer<typeof booleanSchema>;

    const str: StringType = 'hello';
    const num: NumberType = 123;
    const bool: BooleanType = true;

    expect(stringSchema.parse(str)).toBe(str);
    expect(numberSchema.parse(num)).toBe(num);
    expect(booleanSchema.parse(bool)).toBe(bool);
  });

  it('should infer object types', () => {
    const userSchema = v.object({
      email: v.string().email(),
      id: v.number(),
      name: v.string(),
    });

    type User = Infer<typeof userSchema>;

    const user: User = {
      email: 'john@example.com',
      id: 1,
      name: 'John',
    };

    expect(userSchema.parse(user)).toEqual(user);
  });

  it('should infer array types', () => {
    const schema = v.array(v.string());
    type StringArray = Infer<typeof schema>;

    const arr: StringArray = ['a', 'b', 'c'];
    expect(schema.parse(arr)).toEqual(arr);
  });

  it('should infer union types', () => {
    const schema = v.union(v.string(), v.number());
    type StringOrNumber = Infer<typeof schema>;

    const str: StringOrNumber = 'hello';
    const num: StringOrNumber = 123;

    expect(schema.parse(str)).toBe(str);
    expect(schema.parse(num)).toBe(num);
  });

  it('should infer optional types', () => {
    const schema = v.string().optional();
    type OptionalString = Infer<typeof schema>;

    const str: OptionalString = 'hello';
    const undef: OptionalString = undefined;

    expect(schema.parse(str)).toBe(str);
    expect(schema.parse(undef)).toBe(undef);
  });

  it('should infer nullable types', () => {
    const schema = v.number().nullable();
    type NullableNumber = Infer<typeof schema>;

    const num: NullableNumber = 123;
    const nul: NullableNumber = null;

    expect(schema.parse(num)).toBe(num);
    expect(schema.parse(nul)).toBe(nul);
  });
});

/* ============================================
   Async Validation Tests
   ============================================ */

describe('Async validation', () => {
  describe('parseAsync()', () => {
    it('should validate asynchronously', async () => {
      const schema = v.string().min(3);
      const result = await schema.parseAsync('hello');
      expect(result).toBe('hello');
    });

    it('should throw ValidationError for invalid data', async () => {
      const schema = v.number().min(10);
      await expect(schema.parseAsync(5)).rejects.toThrow(ValidationError);
    });

    it('should work with complex schemas', async () => {
      const schema = v.object({
        email: v.string().email(),
        name: v.string().min(2),
      });
      const result = await schema.parseAsync({ email: 'test@example.com', name: 'John' });
      expect(result).toEqual({ email: 'test@example.com', name: 'John' });
    });
  });

  describe('safeParseAsync()', () => {
    it('should return success result for valid data', async () => {
      const schema = v.string();
      const result = await schema.safeParseAsync('hello');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('hello');
      }
    });

    it('should return error result for invalid data', async () => {
      const schema = v.string();
      const result = await schema.safeParseAsync(123);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should not throw exceptions', async () => {
      const schema = v.number();
      await expect(schema.safeParseAsync('invalid')).resolves.toBeDefined();
    });
  });

  describe('refineAsync()', () => {
    it('should add async custom validation', async () => {
      const schema = v.string().refineAsync(async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return val.length >= 3;
      }, 'Must be at least 3 characters');

      const result = await schema.parseAsync('hello');
      expect(result).toBe('hello');
      await expect(schema.parseAsync('hi')).rejects.toThrow('Must be at least 3 characters');
    });

    it('should work with sync functions', async () => {
      const schema = v.string().refineAsync((val) => (val.length >= 3) as any, 'Too short');
      await expect(schema.parseAsync('hello')).resolves.toBe('hello');
      await expect(schema.parseAsync('hi')).rejects.toThrow('Too short');
    });

    it('should chain multiple async refinements', async () => {
      const schema = v
        .string()
        .min(3)
        .refineAsync(async (val) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return val.startsWith('test');
        }, 'Must start with test')
        .refineAsync(async (val) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return val.endsWith('123');
        }, 'Must end with 123');

      await expect(schema.parseAsync('test123')).resolves.toBe('test123');
      await expect(schema.parseAsync('test')).rejects.toThrow('Must end with 123');
      await expect(schema.parseAsync('hello123')).rejects.toThrow('Must start with test');
    });

    it('should work with objects', async () => {
      const schema = v
        .object({
          email: v.string().email(),
          username: v.string(),
        })
        .refineAsync(async (data) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return data.username !== 'admin';
        }, 'Username already taken');

      const result = await schema.parseAsync({
        email: 'user@example.com',
        username: 'john',
      });
      expect(result).toEqual({
        email: 'user@example.com',
        username: 'john',
      });

      await expect(
        schema.parseAsync({
          email: 'admin@example.com',
          username: 'admin',
        }),
      ).rejects.toThrow('Username already taken');
    });

    it('should combine sync and async refinements', async () => {
      const schema = v
        .string()
        .min(3)
        .refine((val) => val.startsWith('test'), 'Must start with test')
        .refineAsync(async (val) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return val.endsWith('123');
        }, 'Must end with 123');

      await expect(schema.parseAsync('test123')).resolves.toBe('test123');
      await expect(schema.parseAsync('hi')).rejects.toThrow('Must be at least 3 characters');
      await expect(schema.parseAsync('hello')).rejects.toThrow('Must start with test');
      await expect(schema.parseAsync('test')).rejects.toThrow('Must end with 123');
    });

    it('should work with safeParseAsync', async () => {
      const schema = v.string().refineAsync(async (val) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return val.length >= 3;
      }, 'Too short');

      const result = await schema.safeParseAsync('hello');
      expect(result.success).toBe(true);

      const errorResult = await schema.safeParseAsync('hi');
      expect(errorResult.success).toBe(false);
    });

    it('should include error code for async refinements', async () => {
      const schema = v.string().refineAsync(async () => false, 'Async check failed');
      const result = await schema.safeParseAsync('test');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Async check failed');
      }
    });

    it('should throw error when calling parse() with async validators', () => {
      const schema = v.string().refineAsync(async () => true, 'Async check');
      expect(() => schema.parse('hello')).toThrow(
        'Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().',
      );
    });

    it('should work with arrays', async () => {
      const schema = v.array(
        v.string().refineAsync(async (val) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return val.length >= 3;
        }, 'Item must be at least 3 characters'),
      );

      const result = await schema.parseAsync(['hello', 'world']);
      expect(result).toEqual(['hello', 'world']);
      await expect(schema.parseAsync(['hi', 'world'])).rejects.toThrow('Item must be at least 3 characters');
    });
  });
});

/* ============================================
   Convenience Schemas Tests
   ============================================ */

describe('Convenience schemas', () => {
  it('should validate emails with v.email()', () => {
    const schema = v.email();
    expect(schema.parse('user@example.com')).toBe('user@example.com');
    expect(() => schema.parse('invalid')).toThrow('Invalid email');
  });

  it('should validate URLs with v.url()', () => {
    const schema = v.url();
    expect(schema.parse('https://example.com')).toBe('https://example.com');
    expect(() => schema.parse('not a url')).toThrow('Invalid URL');
  });

  it('should validate UUIDs with v.uuid()', () => {
    const schema = v.uuid();
    expect(schema.parse('123e4567-e89b-12d3-a456-426614174000')).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(() => schema.parse('not-a-uuid')).toThrow('Invalid UUID');
  });

  it('should validate positive integers with v.positiveInt()', () => {
    const schema = v.positiveInt();
    expect(schema.parse(5)).toBe(5);
    expect(() => schema.parse(-5)).toThrow();
    expect(() => schema.parse(3.14)).toThrow('Must be an integer');
  });

  it('should validate negative integers with v.negativeInt()', () => {
    const schema = v.negativeInt();
    expect(schema.parse(-5)).toBe(-5);
    expect(() => schema.parse(5)).toThrow();
    expect(() => schema.parse(-3.14)).toThrow('Must be an integer');
  });
});

/* ============================================
   Required Helper Tests
   ============================================ */

describe('required()', () => {
  it('should reject undefined values', () => {
    const schema = v.string().required();
    expect(() => schema.parse(undefined)).toThrow('Required');
  });

  it('should reject null values', () => {
    const schema = v.string().required();
    expect(() => schema.parse(null)).toThrow('Required');
  });

  it('should accept valid values', () => {
    const schema = v.string().required();
    expect(schema.parse('hello')).toBe('hello');
  });

  it('should support custom error messages', () => {
    const schema = v.string().required('Name is required');
    expect(() => schema.parse(null)).toThrow('Name is required');
  });

  it('should work with other validators', () => {
    const schema = v.string().required().min(3);
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse(null)).toThrow('Required');
    expect(() => schema.parse('hi')).toThrow('Must be at least 3 characters');
  });

  it('should work in objects', () => {
    const schema = v.object({
      age: v.number().optional(),
      email: v.email().required('Email is required'),
      name: v.string().required(),
    });

    expect(schema.parse({ email: 'john@example.com', name: 'John' })).toEqual({
      email: 'john@example.com',
      name: 'John',
    });

    expect(() => schema.parse({ email: 'john@example.com', name: null })).toThrow('Required');
    expect(() => schema.parse({ name: 'John' })).toThrow('Email is required');
  });

  it('should include error code', () => {
    const schema = v.string().required();
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('required');
    }
  });
});

/* ============================================
   Describe Helper Tests
   ============================================ */

describe('describe()', () => {
  it('should preserve schema behavior', () => {
    const schema = v.string().min(3).describe('username');
    expect(schema.parse('hello')).toBe('hello');
    expect(() => schema.parse('hi')).toThrow();
  });

  it('should work with all schema types', () => {
    const stringSchema = v.string().describe('name');
    const numberSchema = v.number().describe('age');
    const booleanSchema = v.boolean().describe('active');

    expect(stringSchema.parse('test')).toBe('test');
    expect(numberSchema.parse(25)).toBe(25);
    expect(booleanSchema.parse(true)).toBe(true);
  });

  it('should be chainable', () => {
    const schema = v.string().describe('email').email();
    expect(schema.parse('test@example.com')).toBe('test@example.com');
  });

  it('should work with objects', () => {
    const schema = v.object({
      age: v.number().int().min(0).describe('age'),
      username: v.string().min(3).describe('username'),
    });

    expect(schema.parse({ age: 25, username: 'john' })).toEqual({ age: 25, username: 'john' });
  });
});
