import { diagnostics, type ParseResult, SpellError, SpellValidationError, s } from '../index';

const { createParseContext, prependIssuePath } = diagnostics;

describe('SpellValidationError', () => {
  it('formats root and nested failures', () => {
    expect(new SpellValidationError([{ code: 'custom', message: 'Invalid', path: [] }]).message).toBe(
      'value: Invalid [custom]',
    );
    expect(new SpellValidationError([{ code: 'custom', message: 'Invalid', path: ['items', 0, 'name'] }]).message).toBe(
      'items.0.name: Invalid [custom]',
    );
  });

  it('flattens errors and returns messages at an exact path', () => {
    const error = new SpellValidationError([
      { code: 'custom', message: 'Email invalid', path: ['user', 'email'] },
      { code: 'custom', message: 'Email unavailable', path: ['user', 'email'] },
      { code: 'custom', message: 'Blocked', path: ['__proto__', 'polluted'] },
      { code: 'custom', message: 'Form invalid', path: [] },
    ]);

    expect(error.flatten()).toEqual({
      fieldErrors: [
        { messages: ['Email invalid', 'Email unavailable'], path: ['user', 'email'] },
        { messages: ['Blocked'], path: ['__proto__', 'polluted'] },
      ],
      formErrors: ['Form invalid'],
    });
    expect(error.messagesAt('user', 'email')).toEqual(['Email invalid', 'Email unavailable']);
    expect(error.messagesAt('__proto__', 'polluted')).toEqual(['Blocked']);
    expect('format' in error).toBe(false);
    expect(error.messagesAt('user')).toEqual([]);
    expect(error.messagesAt()).toEqual(['Form invalid']);
  });

  it('returns nearest union branch failure', () => {
    const result = s
      .union(
        s.object({ type: s.literal('a'), value: s.string() }),
        s.object({ type: s.literal('b'), value: s.number() }),
      )
      .safeParse({ type: 'a', value: 123 });

    expect(result).toMatchObject({ success: false });

    if (!result.success) expect(result.error.bestMatch()?.[0]?.path).toEqual(['value']);
  });

  it('keeps subtype narrowing on the base error type only', () => {
    const error = new SpellValidationError([{ code: 'custom', message: 'Invalid', path: [] }]);

    expect(SpellError.is(error)).toBe(true);
    expect(SpellError.is(new Error('plain'))).toBe(false);
  });
});

describe('diagnostics helpers', () => {
  it('keeps issue paths immutable', () => {
    const original = [{ code: 'custom', message: 'Bad', path: ['name'] }];

    expect(prependIssuePath(original, 'user')).toEqual([{ code: 'custom', message: 'Bad', path: ['user', 'name'] }]);
    expect(original).toEqual([{ code: 'custom', message: 'Bad', path: ['name'] }]);
  });

  it('uses request-local messages for structural and check failures', () => {
    const check = s.string().check(() => false);
    const context = createParseContext({ check: { default: () => 'Localized check failure' } });
    const checkResult = check.safeParse('value', context);

    expect(checkResult).toMatchObject({ success: false });

    if (!checkResult.success) expect(checkResult.error.issues[0]?.message).toBe('Localized check failure');

    const schema = s.object({ email: s.string() });
    const objectContext = createParseContext({ object: { invalidKeys: () => 'Unexpected request field' } });
    const localized = schema.safeParse({ email: 'a@b.com', extra: true }, objectContext);
    const builtin = schema.safeParse({ email: 'a@b.com', extra: true });

    expect(localized).toMatchObject({ success: false });
    expect(builtin).toMatchObject({ success: false });

    if (!localized.success) expect(localized.error.issues[0]?.message).toBe('Unexpected request field');

    if (!builtin.success) expect(builtin.error.issues[0]?.message).toBe('Unrecognized keys: extra');
  });

  it('uses request-local messages for omitted built-in constraint messages', () => {
    const context = createParseContext({
      array: { min: ({ min }) => `Localized array minimum ${min}` },
      number: { min: ({ min }) => `Localized number minimum ${min}` },
      string: {
        email: () => 'Localized email',
        min: ({ min }) => `Localized string minimum ${min}`,
      },
    });

    const cases: readonly [ParseResult<unknown>, string][] = [
      [s.string().min(3).safeParse('x', context), 'Localized string minimum 3'],
      [s.string().email().safeParse('invalid', context), 'Localized email'],
      [s.number().min(3).safeParse(1, context), 'Localized number minimum 3'],
      [s.array(s.string()).min(2).safeParse(['one'], context), 'Localized array minimum 2'],
    ];

    for (const [result, expected] of cases) {
      expect(result).toMatchObject({ success: false });

      if (!result.success) expect(result.error.issues[0]?.message).toBe(expected);
    }

    const custom = s.string().min(3, 'Explicit custom message').safeParse('x', context);

    expect(custom).toMatchObject({ success: false });

    if (!custom.success) expect(custom.error.issues[0]?.message).toBe('Explicit custom message');
  });

  it('propagates independent request-local messages through async nested parsing', async () => {
    const schema = s.array(
      s
        .string()
        .email()
        .checkAsync(async () => {
          await Promise.resolve();

          return true;
        }),
    );
    const [first, second] = await Promise.all([
      schema.safeParseAsync(['invalid'], createParseContext({ string: { email: () => 'First nested email' } })),
      schema.safeParseAsync(['invalid'], createParseContext({ string: { email: () => 'Second nested email' } })),
    ]);

    expect(first).toMatchObject({ success: false });
    expect(second).toMatchObject({ success: false });

    if (!first.success) expect(first.error.issues[0]).toMatchObject({ message: 'First nested email', path: [0] });

    if (!second.success) expect(second.error.issues[0]).toMatchObject({ message: 'Second nested email', path: [0] });
  });
});
