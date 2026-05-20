import type { DepositLogger, RecordValidator } from '../index';

import { createMemory, table } from '../index';

type User = { id: number; name: string };

const schema = { users: table<User>('id') };

describe('DepositLogger plugin', () => {
  test('routes observer errors to logger.error instead of console.error', async () => {
    const errorCalls: unknown[][] = [];
    const logger: DepositLogger = {
      error: (...args) => errorCalls.push(args),
    };

    const db = createMemory({ logger, schema });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    db.observe(
      'users',
      () => {
        throw new Error('observer boom');
      },
      { immediate: false },
    );

    await db.put('users', { id: 1, name: 'Alice' });
    await new Promise<void>((r) => setTimeout(r, 20));

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(errorCalls).toHaveLength(1);
    expect((errorCalls[0] as unknown[])[0]).toBeInstanceOf(Error);

    consoleSpy.mockRestore();
    db.dispose();
  });

  test('falls back to console.error when no logger is provided', async () => {
    const db = createMemory({ schema });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    db.observe(
      'users',
      () => {
        throw new Error('observer boom');
      },
      { immediate: false },
    );

    await db.put('users', { id: 1, name: 'Alice' });
    await new Promise<void>((r) => setTimeout(r, 20));

    expect(consoleSpy).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
    db.dispose();
  });
});

describe('RecordValidator (validators) plugin', () => {
  test('validator transforms value before storage', async () => {
    const userValidator: RecordValidator<User> = {
      parse(value) {
        const r = value as Record<string, unknown>;

        return { id: r['id'] as number, name: (r['name'] as string).trim() };
      },
    };

    const db = createMemory({ schema, validators: { users: userValidator } });

    await db.put('users', { id: 1, name: '  Alice  ' } as unknown as User);

    const stored = await db.get('users', 1);

    expect(stored).toEqual({ id: 1, name: 'Alice' });
    db.dispose();
  });

  test('validator throwing rejects the put and nothing is stored', async () => {
    const strictValidator: RecordValidator<User> = {
      parse(value) {
        const r = value as Record<string, unknown>;

        if (typeof r['id'] !== 'number') throw new Error('id must be a number');

        return r as unknown as User;
      },
    };

    const db = createMemory({ schema, validators: { users: strictValidator } });

    await expect(db.put('users', { id: 'bad' as unknown as number, name: 'Alice' })).rejects.toThrow(
      'id must be a number',
    );
    expect(await db.count('users')).toBe(0);
    db.dispose();
  });

  test('validator runs on putAll for every record', async () => {
    const parsed: unknown[] = [];
    const userValidator: RecordValidator<User> = {
      parse(value) {
        parsed.push(value);

        return value as User;
      },
    };

    const db = createMemory({ schema, validators: { users: userValidator } });

    await db.putAll('users', [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]);

    expect(parsed).toHaveLength(3);
    db.dispose();
  });

  test('validator runs inside batch transactions', async () => {
    const parsed: unknown[] = [];
    const userValidator: RecordValidator<User> = {
      parse(value) {
        parsed.push(value);

        return value as User;
      },
    };

    const db = createMemory({ schema, validators: { users: userValidator } });

    await db.batch(['users'], async (tx) => {
      await tx.put('users', { id: 1, name: 'Alice' });
      await tx.put('users', { id: 2, name: 'Bob' });
    });

    expect(parsed).toHaveLength(2);
    db.dispose();
  });

  test('validator runs on upsert and update result', async () => {
    const parsed: unknown[] = [];
    const userValidator: RecordValidator<User> = {
      parse(value) {
        parsed.push(value);

        return value as User;
      },
    };

    const db = createMemory({ schema, validators: { users: userValidator } });

    await db.upsert('users', 1, () => ({ id: 1, name: 'Alice' }));
    await db.update('users', 1, { name: 'Alice Updated' });

    expect(parsed).toHaveLength(2);
    db.dispose();
  });

  test('tables without a validator are unaffected', async () => {
    type Post = { authorId: number; id: number; title: string };

    const ms = { posts: table<Post>('id'), users: table<User>('id') };
    const parsed: unknown[] = [];
    const userValidator: RecordValidator<User> = {
      parse(value) {
        parsed.push(value);

        return value as User;
      },
    };

    const db = createMemory({ schema: ms, validators: { users: userValidator } });

    await db.put('posts', { authorId: 1, id: 10, title: 'Hello' });
    await db.put('users', { id: 1, name: 'Alice' });

    expect(parsed).toHaveLength(1);
    db.dispose();
  });

  test('a validit-shaped schema satisfies RecordValidator structurally', async () => {
    const validitLike = {
      parse(value: unknown) {
        const r = value as Record<string, unknown>;

        if (typeof r['id'] !== 'number') throw new Error('id must be a number');

        return { id: r['id'] as number, name: String(r['name'] ?? '').trim() };
      },
    };
    const db = createMemory({ schema, validators: { users: validitLike } });

    await db.put('users', { id: 1, name: ' Alice ' } as User);

    expect(await db.get('users', 1)).toEqual({ id: 1, name: 'Alice' });
    db.dispose();
  });

  test('a logit-shaped logger satisfies DepositLogger structurally', () => {
    // Simulate the shape of a logit Logger without importing logit
    const logitLike = {
      bindings: {},
      child: () => logitLike,
      config: { logLevel: 'debug', namespace: 'test', timestamp: true, variant: 'symbol' },
      debug: (_m: unknown, _s?: string) => {},
      enabled: () => true,
      error: (_m: unknown, _s?: string) => {},
      fatal: (_m: unknown, _s?: string) => {},
      group: <T>(_l: string, fn: () => T) => fn(),
      groupCollapsed: <T>(_l: string, fn: () => T) => fn(),
      info: (_m: unknown, _s?: string) => {},
      scope: () => logitLike,
      time: <T>(_l: string, fn: () => T) => fn(),
      warn: (_m: unknown, _s?: string) => {},
      withBindings: () => logitLike,
    };

    createMemory({ logger: logitLike, schema });

    expect(true).toBe(true);
  });

  test('a minimal error-only logger satisfies DepositLogger', () => {
    createMemory({ logger: { error: () => {} }, schema });

    expect(true).toBe(true);
  });
});
