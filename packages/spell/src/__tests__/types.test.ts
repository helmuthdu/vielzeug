import { expectTypeOf } from 'vitest';

import {
  type InferInput,
  type InferOutput,
  type IssuePath,
  type StandardSchemaV1,
  type SyncParsable,
  s,
} from '../index';

describe('public type contracts', () => {
  it('keeps coercion input separate from parsed output', () => {
    const schema = s.object({
      enabled: s.coerce.boolean(),
      limit: s.coerce.number().int(),
    });

    expectTypeOf<InferInput<typeof schema>>().toEqualTypeOf<{ enabled: unknown; limit: unknown }>();
    expectTypeOf<InferOutput<typeof schema>>().toEqualTypeOf<{ enabled: boolean; limit: number }>();
  });

  it('rejects asynchronous callbacks passed to check()', () => {
    // @ts-expect-error Async callbacks must use checkAsync().
    s.string().check(async () => 'Rejected');
  });

  it('keeps check callbacks typed to parsed data', () => {
    const schema = s.object({ email: s.string() }).check((value, context) => {
      expectTypeOf(value.email).toEqualTypeOf<string>();
      expectTypeOf(context.addIssue).parameter(0).toMatchTypeOf<{ code: string; message: string }>();

      return value.email.includes('@') || 'Invalid email';
    });

    expectTypeOf(schema.parse({ email: 'ada@example.com' })).toEqualTypeOf<{ email: string }>();
  });

  it('keeps checkAsync chainable and preserves input types', () => {
    const asyncString = s.string().checkAsync(async () => true);
    const chained = asyncString
      .min(1)
      .optional()
      .default('value')
      .transform((value) => value?.length ?? 0);

    expectTypeOf<InferInput<typeof asyncString>>().toEqualTypeOf<string>();
    expectTypeOf<InferInput<typeof chained>>().toEqualTypeOf<string | undefined>();
    expectTypeOf(asyncString.min).toBeFunction();
    expectTypeOf(chained.parseAsync('value')).toEqualTypeOf<Promise<number>>();
    expectTypeOf(chained.safeParseAsync('value')).toMatchTypeOf<Promise<unknown>>();
  });

  it('rejects at runtime when sync parsing meets async checks', async () => {
    const asyncString = s.string().checkAsync(async () => true);

    expect(() => asyncString.parse('value')).toThrow('async checks');
    expect(asyncString.safeParse('value').success).toBe(false);
    await expect(asyncString.parseAsync('value')).resolves.toBe('value');
  });

  it('preserves object methods after async modifiers', () => {
    const asyncObject = s.object({ value: s.string() }).checkAsync(async () => true);
    const requiredObject = asyncObject.required().extend({ count: s.number() });
    const optionalObject = asyncObject.optional().extend({ count: s.number() });

    expectTypeOf(requiredObject.pick).toBeFunction();
    expectTypeOf(optionalObject.omit).toBeFunction();
  });

  it('infers output and input through every composite schema', async () => {
    const asyncString = s.string().checkAsync(async () => true);
    const asyncObject = s.object({ value: asyncString });
    const array = s.array(asyncString);
    const union = s.union(s.string(), asyncString);
    const intersect = s.intersect(s.string(), asyncString);
    const tuple = s.tuple([asyncString]);
    const restTuple = s.tuple([s.string()]).rest(asyncString);
    const map = s.map(s.string(), asyncString);
    const record = s.record(s.string(), asyncString);
    const set = s.set(asyncString);
    const lazy = s.lazy(() => asyncString);
    const pipe = s.string().pipe(asyncString);
    const variant = s.discriminatedUnion('kind', { async: asyncObject });

    expectTypeOf<InferOutput<typeof array>>().toEqualTypeOf<string[]>();
    expectTypeOf<InferOutput<typeof asyncObject>>().toEqualTypeOf<{ value: string }>();

    await expect(array.parseAsync(['a'])).resolves.toEqual(['a']);
    await expect(asyncObject.parseAsync({ value: 'a' })).resolves.toEqual({ value: 'a' });
    await expect(union.parseAsync('a')).resolves.toBe('a');
    await expect(intersect.parseAsync('a')).resolves.toBe('a');
    await expect(tuple.parseAsync(['a'])).resolves.toEqual(['a']);
    await expect(restTuple.parseAsync(['a', 'b'])).resolves.toEqual(['a', 'b']);
    await expect(map.parseAsync(new Map([['k', 'a']]))).resolves.toEqual(new Map([['k', 'a']]));
    await expect(record.parseAsync({ k: 'a' })).resolves.toEqual({ k: 'a' });
    await expect(set.parseAsync(new Set(['a']))).resolves.toEqual(new Set(['a']));
    await expect(lazy.parseAsync('a')).resolves.toBe('a');
    await expect(pipe.parseAsync('a')).resolves.toBe('a');
    await expect(variant.parseAsync({ kind: 'async', value: 'a' })).resolves.toEqual({ kind: 'async', value: 'a' });
  });

  it('exposes the complete Standard Schema type contract', () => {
    const schema = s.coerce.number().int();
    const result = schema['~standard'].validate('42', { libraryOptions: { source: 'test' } });

    expectTypeOf<StandardSchemaV1.InferInput<typeof schema>>().toEqualTypeOf<unknown>();
    expectTypeOf<StandardSchemaV1.InferOutput<typeof schema>>().toEqualTypeOf<number>();
    expectTypeOf(result).toEqualTypeOf<StandardSchemaV1.Result<number> | Promise<StandardSchemaV1.Result<number>>>();
  });

  it('preserves input types through composition', () => {
    const textLength = s.string().transform((value) => value.length);
    const array = s.array(textLength);
    const set = s.set(textLength);
    const map = s.map(textLength, textLength);
    const record = s.record(s.string(), textLength);
    const tuple = s.tuple([textLength, s.boolean()]);
    const union = s.union(textLength, s.boolean());
    const intersection = s.intersect(textLength, s.string().min(1));
    const lazy = s.lazy(() => textLength);
    const object = s.object({ count: s.coerce.number(), note: s.string().optional() });
    const partial = object.partial();
    const defaults = s.object({ name: s.string().default('anonymous'), retries: s.number().catch(0) });
    const variant = s.discriminatedUnion('kind', { text: s.object({ value: textLength }) });

    expectTypeOf<InferInput<typeof array>>().toEqualTypeOf<string[]>();
    expectTypeOf<InferInput<typeof set>>().toEqualTypeOf<Set<string>>();
    expectTypeOf<InferInput<typeof map>>().toEqualTypeOf<Map<string, string>>();
    expectTypeOf<InferInput<typeof record>>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<InferInput<typeof tuple>>().toEqualTypeOf<readonly [string, boolean]>();
    expectTypeOf<InferInput<typeof union>>().toEqualTypeOf<string | boolean>();
    expectTypeOf<InferInput<typeof intersection>>().toEqualTypeOf<string>();
    expectTypeOf<InferInput<typeof lazy>>().toEqualTypeOf<string>();
    expectTypeOf<InferInput<typeof object>>().toEqualTypeOf<{ count: unknown; note?: string | undefined }>();
    expectTypeOf<InferInput<typeof partial>>().toEqualTypeOf<{ count?: unknown; note?: string | undefined }>();
    expectTypeOf<InferInput<typeof defaults>>().toEqualTypeOf<{
      name?: string | undefined;
      retries?: number | undefined;
    }>();
    expectTypeOf<InferInput<typeof variant>>().toEqualTypeOf<{ kind: 'text'; value: string }>();
  });

  it('accepts built schemas where a synchronous parse surface is required', () => {
    const schema = s.object({ email: s.string() });

    expectTypeOf(schema).toMatchTypeOf<SyncParsable<{ email: string }>>();
    expectTypeOf<StandardSchemaV1.Issue['path']>().toMatchTypeOf<IssuePath | undefined>();
  });
});
