import { composeValidators, fieldValidator } from '../../adapters/validators';

// Matches the SafeParseSchema structural type defined in types.ts (Zod-style).
type MockSchema = {
  safeParse(
    data: unknown,
  ): { success: true } | { error: { issues: { message: string; path: (string | number)[] }[] }; success: false };
};

describe('composeValidators (F3)', () => {
  test('returns undefined when all validators pass', async () => {
    const v1 = (_v: unknown) => undefined;
    const v2 = (_v: unknown) => undefined;
    const composed = composeValidators(v1, v2);

    await expect(composed('hello')).resolves.toBeUndefined();
  });

  test('returns the first error and short-circuits remaining validators', async () => {
    let secondCalled = false;

    const v1 = (_v: unknown) => 'First error';
    const v2 = (_v: unknown) => {
      secondCalled = true;

      return 'Second error';
    };
    const composed = composeValidators(v1, v2);

    await expect(composed('hello')).resolves.toBe('First error');
    expect(secondCalled).toBe(false);
  });

  test('runs each validator in sequence until one fails', async () => {
    const order: number[] = [];

    const v1 = (_v: unknown) => {
      order.push(1);

      return undefined;
    };
    const v2 = (_v: unknown) => {
      order.push(2);

      return 'Error from v2';
    };
    const v3 = (_v: unknown) => {
      order.push(3);

      return undefined;
    };
    const composed = composeValidators(v1, v2, v3);

    await expect(composed('x')).resolves.toBe('Error from v2');
    expect(order).toEqual([1, 2]);
  });

  test('async validators are awaited before proceeding', async () => {
    const v1 = async (_v: unknown) => {
      await new Promise<void>((res) => setTimeout(res, 0));

      return undefined;
    };
    const v2 = async (_v: unknown) => {
      await new Promise<void>((res) => setTimeout(res, 0));

      return 'Async error';
    };
    const composed = composeValidators(v1, v2);

    await expect(composed('x')).resolves.toBe('Async error');
  });

  test('respects AbortSignal — returns undefined when aborted mid-chain', async () => {
    const controller = new AbortController();

    const v1 = async (_v: unknown, signal?: AbortSignal) => {
      controller.abort();
      await new Promise<void>((res) => setTimeout(res, 0));

      if (signal?.aborted) return undefined;

      return 'Not aborted error';
    };
    const composed = composeValidators(v1);

    await expect(composed('x', controller.signal)).resolves.toBeUndefined();
  });

  test('with zero validators returns undefined for any value', async () => {
    const composed = composeValidators<string>();

    await expect(composed('anything')).resolves.toBeUndefined();
  });
});

describe('fieldValidator (F3)', () => {
  test('returns undefined when schema safeParse succeeds', () => {
    const schema: MockSchema = {
      safeParse: (_v) => ({ success: true }),
    };
    const validator = fieldValidator(schema);

    expect(validator('valid')).toBeUndefined();
  });

  test('returns the first issue message when schema safeParse fails', () => {
    const schema: MockSchema = {
      safeParse: (_v) => ({
        error: {
          issues: [
            { message: 'Must be a string', path: [] },
            { message: 'Too short', path: [] },
          ],
        },
        success: false,
      }),
    };
    const validator = fieldValidator(schema);

    expect(validator(42)).toBe('Must be a string');
  });

  test('returns undefined when issues array is empty on failure', () => {
    const schema: MockSchema = {
      safeParse: (_v) => ({ error: { issues: [] }, success: false }),
    };
    const validator = fieldValidator(schema);

    expect(validator(null)).toBeUndefined();
  });

  test('works with any safeParse-compatible schema (structural typing)', () => {
    const emailSchema: MockSchema = {
      safeParse: (v) => {
        if (typeof v === 'string' && v.includes('@')) return { success: true };

        return { error: { issues: [{ message: 'Invalid email', path: [] }] }, success: false };
      },
    };
    const emailValidator = fieldValidator(emailSchema);

    expect(emailValidator('user@example.com')).toBeUndefined();
    expect(emailValidator('not-an-email')).toBe('Invalid email');
  });

  test('can be combined with composeValidators', async () => {
    const requiredSchema: MockSchema = {
      safeParse: (v) => {
        if (v) return { success: true };

        return { error: { issues: [{ message: 'Required', path: [] }] }, success: false };
      },
    };
    const minLengthSchema: MockSchema = {
      safeParse: (v) => {
        if (typeof v === 'string' && v.length >= 3) return { success: true };

        return { error: { issues: [{ message: 'Min 3 chars', path: [] }] }, success: false };
      },
    };

    const validator = composeValidators(fieldValidator(requiredSchema), fieldValidator(minLengthSchema));

    await expect(validator('')).resolves.toBe('Required');
    await expect(validator('ab')).resolves.toBe('Min 3 chars');
    await expect(validator('abc')).resolves.toBeUndefined();
  });
});
