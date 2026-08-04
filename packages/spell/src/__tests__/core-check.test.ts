import { vi } from 'vitest';

import { ErrorCode, s } from '../index';

describe('explicit checks', () => {
  it('check() accepts boolean and string shorthand', () => {
    const schema = s.number().check((value) => value % 2 === 0 || 'Must be even');

    expect(schema.parse(4)).toBe(4);
    expect(() => schema.parse(3)).toThrow('Must be even');
  });

  it('check() supports multiple relative issues', () => {
    const schema = s.object({ confirm: s.string(), password: s.string() }).check((value, context) => {
      if (value.password !== value.confirm) {
        context.addIssue({ code: ErrorCode.custom, message: 'Passwords must match', path: ['confirm'] });
      }
    });

    const result = schema.safeParse({ confirm: 'wrong', password: 'correct' });

    expect(result).toMatchObject({ success: false });

    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['confirm']);
  });

  it('check() runs only after successful structural parsing', () => {
    const check = vi.fn(() => 'Must not run');
    const result = s.string().check(check).safeParse(42);

    expect(result).toMatchObject({ success: false });
    expect(check).not.toHaveBeenCalled();
  });

  it('checkAsync() rejects synchronous parsing before validation', () => {
    const schema = s.string().checkAsync(async () => 'Rejected');

    const parseSync = schema.parse as unknown as (value: unknown) => unknown;

    expect(() => parseSync.call(schema, 'value')).toThrow('cannot evaluate async checks');
  });

  it('checkAsync() awaits asynchronous domain rules', async () => {
    const schema = s.string().checkAsync(async (value) => value === 'available' || 'Already taken');

    await expect(schema.parseAsync('available')).resolves.toBe('available');
    await expect(schema.parseAsync('taken')).rejects.toThrow('Already taken');
  });

  it('removes ambiguous validate() and refine() aliases', () => {
    const schema = s.string();

    expect('validate' in schema).toBe(false);
    expect('refine' in schema).toBe(false);
  });
});
