import { describe, expect, test } from 'vitest';

import { ErrorCode, ValidationError } from '../core';
import { v } from '../v';

describe('superRefine', () => {
  test('passes when check adds no issues', () => {
    const schema = v.string().superRefine(() => {});

    expect(schema.parse('hello')).toBe('hello');
  });

  test('reports single addIssue call', () => {
    const schema = v.string().superRefine((value, ctx) => {
      if (value !== 'ok') {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Not ok' });
      }
    });

    const result = schema.safeParse('bad');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('Not ok');
      expect(result.error.issues[0]!.code).toBe(ErrorCode.custom);
    }
  });

  test('reports multiple addIssue calls', () => {
    const schema = v.object({ a: v.string(), b: v.string() }).superRefine(({ a, b }, ctx) => {
      if (a === b) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'a and b must differ', path: ['a'] });
        ctx.addIssue({ code: ErrorCode.custom, message: 'a and b must differ', path: ['b'] });
      }
    });

    const result = schema.safeParse({ a: 'same', b: 'same' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.length).toBe(2);
      expect(result.error.issues[0]!.path).toEqual(['a']);
      expect(result.error.issues[1]!.path).toEqual(['b']);
    }
  });

  test('passes explicit path through to issue', () => {
    const schema = v.object({ confirm: v.string(), password: v.string() }).superRefine(({ confirm, password }, ctx) => {
      if (password !== confirm) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Mismatch', path: ['confirm'] });
      }
    });

    const result = schema.safeParse({ confirm: 'xyz', password: 'abc' });

    expect(result.success).toBe(false);

    if (!result.success) {
      const issue = result.error.issues[0]!;

      expect(issue.path).toEqual(['confirm']);
    }
  });

  test('defaults path to schema root when not specified', () => {
    const schema = v.string().superRefine((_, ctx) => {
      ctx.addIssue({ code: ErrorCode.custom, message: 'Root error' });
    });

    const result = schema.safeParse('anything');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual([]);
    }
  });
});

describe('superRefineAsync', () => {
  test('passes when async check adds no issues', async () => {
    const schema = v.string().superRefineAsync(async () => {});

    await expect(schema.parseAsync('hello')).resolves.toBe('hello');
  });

  test('reports issues from async check', async () => {
    const schema = v.string().superRefineAsync(async (value, ctx) => {
      await Promise.resolve();

      if (value.length < 5) {
        ctx.addIssue({ code: ErrorCode.custom, message: 'Too short' });
      }
    });

    const result = await schema.safeParseAsync('hi');

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('Too short');
    }
  });
});

describe('ValidationError.format()', () => {
  test('produces nested error tree', () => {
    const schema = v.object({
      user: v.object({
        age: v.number().min(18),
        email: v.string().email(),
      }),
    });

    const result = schema.safeParse({ user: { age: 10, email: 'bad' } });

    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = result.error.format();

      expect(formatted._errors).toEqual([]);
      expect((formatted['user'] as any)?.['email']?.['_errors']).toBeDefined();
      expect((formatted['user'] as any)?.['age']?.['_errors']).toBeDefined();
    }
  });

  test('root-level issues appear in _errors', () => {
    const schema = v.string().superRefine((_, ctx) => {
      ctx.addIssue({ code: ErrorCode.custom, message: 'Root problem' });
    });

    const result = schema.safeParse('x');

    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = result.error.format();

      expect(formatted._errors).toContain('Root problem');
    }
  });

  test('ValidationError.is() narrows correctly', () => {
    const result = v.string().safeParse(42);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(ValidationError.is(result.error)).toBe(true);
      expect(ValidationError.is(new Error('plain'))).toBe(false);
    }
  });
});
