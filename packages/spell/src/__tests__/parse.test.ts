import { Schema, SpellError, SpellValidationError, s } from '../index';

describe('safeParse and safeParseAsync', () => {
  it('safeParse() returns parsed data on success', () => {
    const result = s.string().safeParse('hello');

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('safeParse() returns SpellValidationError instead of throwing', () => {
    const result = s.string().safeParse(123);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(SpellValidationError);
      expect(result.error.issues).toHaveLength(1);
    }
  });

  it('safeParse() aggregates object field errors', () => {
    const result = s.object({ a: s.string(), b: s.number() }).safeParse({ a: 1, b: 'x' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues.map((issue) => issue.path.join('.')).sort()).toEqual(['a', 'b']);
    }
  });

  it('parseAsync() supports schemas without async checks', async () => {
    await expect(s.string().min(2).parseAsync('hi')).resolves.toBe('hi');
  });

  it('safeParseAsync() returns error result for invalid input', async () => {
    const result = await s.string().safeParseAsync(42);

    expect(result.success).toBe(false);
  });
});

describe('sync/async mismatch guardrails', () => {
  it('safeParse() throws SpellError when a check returns a Promise at runtime', () => {
    const schema = s.string().check((() => Promise.resolve(true)) as unknown as () => boolean);

    expect(() => schema.safeParse('x')).toThrow(SpellError);
    expect(() => schema.safeParse('x')).not.toThrow(SpellValidationError);
  });

  it('does not invoke an async check during synchronous parsing', () => {
    const calls: string[] = [];
    const schema = s.object({ name: s.string().checkAsync(async (value) => calls.push(value) > 0) });

    expect(() => schema.safeParse({ name: 'Ada' })).toThrow('use parseAsync()');
    expect(calls).toEqual([]);
  });

  it('is() and catch() do not swallow async misuse', () => {
    const schema = s.object({ name: s.string().checkAsync(async () => true) });

    expect(() => schema.is({ name: 'Ada' })).toThrow(SpellError);
    expect(() => schema.catch({ name: 'fallback' }).parse({ name: 'Ada' })).toThrow(SpellError);
  });

  it('subclass _parse overrides drive validation', () => {
    class EvenSchema extends Schema<number> {
      protected override _parse(value: unknown) {
        return typeof value === 'number' && value % 2 === 0
          ? { issues: [], typeOk: true, value }
          : { issues: [{ code: 'custom', message: 'Expected even', path: [] }], typeOk: false, value };
      }
    }

    expect(new EvenSchema().safeParse(2)).toEqual({ data: 2, success: true });
    expect(new EvenSchema().safeParse(3).success).toBe(false);
  });
});
