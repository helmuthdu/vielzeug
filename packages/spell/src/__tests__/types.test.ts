import { expectTypeOf } from 'vitest';

import { type AnySchema, type InferInput, type InferOutput, type InferSchemaMode, s, schemaMode } from '../index';

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

  it('removes synchronous parsing from direct and chained asynchronous schemas', () => {
    const asyncString = s.string().checkAsync(async () => true);
    const chained = asyncString
      .min(1)
      .optional()
      .default('value')
      .transform((value) => value?.length ?? 0);

    expectTypeOf<InferSchemaMode<typeof asyncString>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferInput<typeof asyncString>>().toEqualTypeOf<string>();
    expectTypeOf<InferSchemaMode<typeof chained>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferInput<typeof chained>>().toEqualTypeOf<string | undefined>();
    expectTypeOf(asyncString.min).toBeFunction();
    expectTypeOf(chained.parseAsync('value')).toEqualTypeOf<Promise<number>>();
    expectTypeOf(chained.safeParseAsync('value')).toMatchTypeOf<Promise<unknown>>();

    const assertSyncParsersAreUnavailable = (): void => {
      // @ts-expect-error Async schemas require parseAsync().
      asyncString.parse('value');
      // @ts-expect-error Async schemas require safeParseAsync().
      asyncString.safeParse('value');
      // @ts-expect-error Chained async schemas require parseAsync().
      chained.parse('value');
      // @ts-expect-error Chained async schemas require safeParseAsync().
      chained.safeParse('value');
    };

    expectTypeOf(assertSyncParsersAreUnavailable).toBeFunction();
  });

  it('preserves object methods after mode-changing modifiers', () => {
    const asyncObject = s.object({ value: s.string() }).checkAsync(async () => true);
    const requiredObject = asyncObject.required().extend({ count: s.number() });
    const optionalObject = asyncObject.optional().extend({ count: s.number() });

    expectTypeOf<InferSchemaMode<typeof requiredObject>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof optionalObject>>().toEqualTypeOf<'async'>();
    expectTypeOf(requiredObject.pick).toBeFunction();
    expectTypeOf(optionalObject.omit).toBeFunction();

    const assertObjectSyncParsersAreUnavailable = (): void => {
      // @ts-expect-error Async object schemas require parseAsync().
      requiredObject.parse({ count: 1, value: 'value' });
      // @ts-expect-error Async object schemas require safeParseAsync().
      optionalObject.safeParse({ count: 1, value: 'value' });
    };

    expectTypeOf(assertObjectSyncParsersAreUnavailable).toBeFunction();
  });

  it('propagates asynchronous mode through every composite schema', () => {
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

    expectTypeOf<InferSchemaMode<typeof array>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof asyncObject>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof union>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof intersect>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof tuple>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof restTuple>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof map>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof record>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof set>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof lazy>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof pipe>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof variant>>().toEqualTypeOf<'async'>();
  });

  it('infers modes from structural custom schemas and retains their input types', () => {
    const customAsync = null as unknown as AnySchema<number, { source: string }, 'async'> & {
      readonly [schemaMode]: 'async';
    };
    const composite = s.array(customAsync);

    expectTypeOf<InferSchemaMode<typeof customAsync>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferSchemaMode<typeof composite>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferInput<typeof customAsync>>().toEqualTypeOf<{ source: string }>();
  });
});
