import { s, Schema, SpellValidationError } from '../index';

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

describe('sync/async schema mismatch guardrails', () => {
  class AsyncOnlySchema extends Schema<string> {
    protected override _parse() {
      return Promise.resolve({ data: 'x', issues: [], typeOk: true });
    }
  }

  it('parse() throws a clear error when the schema resolves asynchronously', () => {
    expect(() => new AsyncOnlySchema().parse('x')).toThrow('Use parseAsync() instead');
  });

  it('_parseFullSync() throws a clear error when a nested schema resolves asynchronously', () => {
    expect(() => new AsyncOnlySchema()._parseFullSync('x')).toThrow('received an async schema');
  });

  it('sync parse() throws when a custom type validator returns a Promise', () => {
    const schema = new Schema(async () => null);

    expect(() => schema.parse('x')).toThrow(
      'Type validator returned a Promise. Use parseAsync() for async validation.',
    );
  });
});
