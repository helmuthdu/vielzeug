import { expectTypeOf } from 'vitest';

import { s, type InferInput, type InferOutput, type InferSchemaMode } from '../index';

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

  it('removes synchronous parsing from asynchronous schemas while preserving specialized fluent methods', () => {
    const asyncString = s.string().checkAsync(async () => true);

    expectTypeOf<InferSchemaMode<typeof asyncString>>().toEqualTypeOf<'async'>();

    const chained = asyncString
      .min(1)
      .optional()
      .default('value')
      .transform((value) => value?.length ?? 0);

    expectTypeOf<InferSchemaMode<typeof chained>>().toEqualTypeOf<'async'>();
    expectTypeOf<InferInput<typeof chained>>().toEqualTypeOf<string | undefined>();
    expectTypeOf(asyncString.min).toBeFunction();
    expectTypeOf(chained.parseAsync('value')).toEqualTypeOf<Promise<number>>();
  });

  it('propagates asynchronous mode through compositional schemas', () => {
    const asyncString = s.string().checkAsync(async () => true);
    const asyncObject = s.object({ value: asyncString });
    const schemas = [
      s.array(asyncString),
      asyncObject,
      s.union(s.string(), asyncString),
      s.intersect(s.string(), asyncString),
      s.tuple([asyncString]),
      s.tuple([s.string()]).rest(asyncString),
      s.map(s.string(), asyncString),
      s.record(s.string(), asyncString),
      s.set(asyncString),
      s.lazy(() => asyncString),
      s.string().pipe(asyncString),
      s.discriminatedUnion('kind', { async: asyncObject }),
    ];

    expectTypeOf(schemas).toMatchTypeOf<readonly unknown[]>();
  });
});
