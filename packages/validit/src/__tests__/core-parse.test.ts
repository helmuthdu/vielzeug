import { ValidationError, v } from '../index';

describe('safeParse and safeParseAsync', () => {
  it('safeParse() returns parsed data on success', () => {
    const result = v.string().safeParse('hello');

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('safeParse() returns ValidationError instead of throwing', () => {
    const result = v.string().safeParse(123);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.issues).toHaveLength(1);
    }
  });

  it('safeParse() aggregates object field errors', () => {
    const result = v.object({ a: v.string(), b: v.number() }).safeParse({ a: 1, b: 'x' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues.map((issue) => issue.path.join('.')).sort()).toEqual(['a', 'b']);
    }
  });

  it('parseAsync() supports schemas without async checks', async () => {
    await expect(v.string().min(2).parseAsync('hi')).resolves.toBe('hi');
  });

  it('safeParseAsync() returns error result for invalid input', async () => {
    const result = await v.string().safeParseAsync(42);

    expect(result.success).toBe(false);
  });
});
