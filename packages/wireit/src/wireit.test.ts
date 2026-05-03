import { beforeEach, describe, expect, it } from 'vitest';

import {
  AliasCycleError,
  CircularDependencyError,
  type Container,
  ContainerDisposedError,
  createContainer,
  createTestContainer,
  createToken,
  ProviderNotFoundError,
  type Token,
  type TokenValues,
} from './wireit';

describe('createToken', () => {
  it('creates unique symbols and preserves description', () => {
    const a = createToken<string>('Service');
    const b = createToken<string>('Service');

    expect(a).not.toBe(b);
    expect(a.description).toBe('Service');
  });
});

describe('Container - registration and resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves value, class, and factory providers', async () => {
    class Svc {
      readonly tag = 'class';
    }

    const V = createToken<string>('V');
    const C = createToken<Svc>('C');
    const F = createToken<number>('F');

    container
      .value(V, 'v')
      .bind(C, Svc)
      .factory(F, () => 42);

    await expect(container.resolve(V)).resolves.toBe('v');
    await expect(container.resolve(C)).resolves.toBeInstanceOf(Svc);
    await expect(container.resolve(F)).resolves.toBe(42);
  });

  it('throws when replacing without overwrite, preserves original value', async () => {
    const T = createToken<string>('T');

    container.value(T, 'original');
    expect(() => container.value(T, 'replacement')).toThrow(/already registered/);
    await expect(container.resolve(T)).resolves.toBe('original');
  });

  it('overwrites with overwrite=true', async () => {
    const T = createToken<string>('T');

    container.value(T, 'first');
    container.value(T, 'second', { overwrite: true });

    await expect(container.resolve(T)).resolves.toBe('second');
  });

  it('unregister removes token', async () => {
    const T = createToken<string>('T');

    container.value(T, 'v').unregister(T);

    await expect(container.resolve(T)).rejects.toThrow(ProviderNotFoundError);
  });

  it('clear removes registrations and aliases', async () => {
    const Source = createToken<string>('Source');
    const Alias = createToken<string>('Alias');

    container.value(Source, 'v').alias(Alias, Source);
    container.clear();

    expect(container.has(Source)).toBe(false);
    await expect(container.resolve(Alias)).rejects.toThrow(ProviderNotFoundError);
  });

  it('resolveAll returns typed tuple and resolveOptional handles missing', async () => {
    const A = createToken<string>('A');
    const B = createToken<number>('B');
    const Missing = createToken<boolean>('Missing');

    container.value(A, 'hello').value(B, 7);

    const result = await container.resolveAll([A, B]);
    const typed: TokenValues<[typeof A, typeof B]> = result;

    expect(typed[0]).toBe('hello');
    expect(typed[1]).toBe(7);
    await expect(container.resolveOptional(Missing)).resolves.toBeUndefined();
  });
});

describe('Container - lifetime semantics', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('singleton caches instance', async () => {
    let n = 0;
    const T = createToken<object>('Singleton');

    container.factory(T, () => ({ id: ++n }));

    const a = await container.resolve(T);
    const b = await container.resolve(T);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('transient returns a new instance each time', async () => {
    let n = 0;
    const T = createToken<object>('Transient');

    container.factory(T, () => ({ id: ++n }), { lifetime: 'transient' });

    const a = await container.resolve(T);
    const b = await container.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });

  it('scoped creates one instance per child container', async () => {
    let n = 0;
    const T = createToken<object>('Scoped');

    container.factory(T, () => ({ id: ++n }), { lifetime: 'scoped' });

    const c1 = container.createChild();
    const c2 = container.createChild();

    const a1 = await c1.resolve(T);
    const a2 = await c1.resolve(T);
    const b1 = await c2.resolve(T);

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
    expect(n).toBe(2);
  });
});

describe('Container - dependencies and cycles', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('injects dependencies into class and factory providers', async () => {
    class Db {
      readonly url = 'db://local';
    }

    class Repo {
      constructor(readonly db: Db) {}
    }

    const DbT = createToken<Db>('Db');
    const RepoT = createToken<Repo>('Repo');
    const LabelT = createToken<string>('Label');

    container.bind(DbT, Db);
    container.bind(RepoT, Repo, { deps: [DbT] });
    container.factory(LabelT, (repo: Repo) => `repo:${repo.db.url}`, { deps: [RepoT] });

    const repo = await container.resolve(RepoT);

    expect(repo.db).toBeInstanceOf(Db);
    await expect(container.resolve(LabelT)).resolves.toBe('repo:db://local');
  });

  it('detects circular dependency chains', async () => {
    const A = createToken('A');
    const B = createToken('B');

    container.factory(A, async (b: unknown) => b, { deps: [B] });
    container.factory(B, async (a: unknown) => a, { deps: [A] });

    await expect(container.resolve(A)).rejects.toThrow(CircularDependencyError);
  });
});

describe('Container - aliasing', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves aliases and alias chains', async () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');
    const C = createToken<string>('C');

    container.value(A, 'v').alias(B, A).alias(C, B);

    await expect(container.resolve(C)).resolves.toBe('v');
  });

  it('detects alias cycles', async () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');

    container.alias(A, B).alias(B, A);

    await expect(container.resolve(A)).rejects.toThrow(AliasCycleError);
  });
});

describe('Container - async behavior', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('deduplicates concurrent singleton resolution', async () => {
    let n = 0;
    const T = createToken<number>('AsyncSingleton');

    container.factory(T, async () => {
      await new Promise((r) => setTimeout(r, 10));

      return ++n;
    });

    const [a, b, c] = await Promise.all([container.resolve(T), container.resolve(T), container.resolve(T)]);

    expect(n).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('retries singleton factory after transient failure', async () => {
    let attempts = 0;
    const T = createToken<string>('Retry');

    container.factory(T, async () => {
      attempts++;

      if (attempts === 1) throw new Error('transient');

      return 'ok';
    });

    await expect(container.resolve(T)).rejects.toThrow('transient');
    await expect(container.resolve(T)).resolves.toBe('ok');
  });
});

describe('Container - snapshot, mock, and test utilities', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('snapshot/restore preserves original singleton instance', async () => {
    let n = 0;
    const T = createToken<object>('T');

    container.factory(T, () => ({ id: ++n }));

    const original = await container.resolve(T);
    const snap = container.snapshot();

    container.value(T, { id: 999 }, { overwrite: true });
    container.restore(snap);

    const restored = await container.resolve(T);

    expect(restored).toBe(original);
    expect(n).toBe(1);
  });

  it('mock temporarily replaces provider and restores afterward', async () => {
    const T = createToken<string>('T');

    container.value(T, 'real');

    const during = await container.mock(T, { useValue: 'mocked' }, () => container.resolve(T));

    expect(during).toBe('mocked');
    await expect(container.resolve(T)).resolves.toBe('real');
  });

  it('createTestContainer returns an isolated child container', async () => {
    const base = createContainer();
    const T = createToken<string>('T');

    base.value(T, 'base');

    const child = createTestContainer(base);

    child.value(T, 'child', { overwrite: true });

    await expect(child.resolve(T)).resolves.toBe('child');
    await expect(base.resolve(T)).resolves.toBe('base');

    await child.dispose();
    expect(child.disposed).toBe(true);
  });
});

describe('Container - dispose and lifecycle guards', () => {
  it('runs dispose hooks for resolved instances and retired replacements', async () => {
    const log: string[] = [];
    const T = createToken<object>('T');
    const container = createContainer();

    container.factory(T, () => ({}), {
      dispose: () => {
        log.push('first');
      },
    });

    await container.resolve(T);
    container.value(T, {}, { overwrite: true });

    await container.dispose();

    expect(log).toContain('first');
  });

  it('aggregates dispose hook failures and still marks container disposed', async () => {
    const A = createToken<object>('A');
    const B = createToken<object>('B');
    const container = createContainer();

    container.factory(A, () => ({}), {
      dispose: () => {
        throw new Error('A failed');
      },
    });
    container.factory(B, () => ({}), {
      dispose: () => {
        throw new Error('B failed');
      },
    });

    await container.resolve(A);
    await container.resolve(B);

    await expect(container.dispose()).rejects.toThrow(AggregateError);
    expect(container.disposed).toBe(true);
  });

  it('throws ContainerDisposedError for read/write operations after dispose', async () => {
    const T = createToken<string>('T');
    const container = createContainer();

    container.value(T, 'v');
    await container.dispose();

    await expect(container.resolve(T)).rejects.toThrow(ContainerDisposedError);
    expect(() => container.has(T)).toThrow(ContainerDisposedError);
    expect(() => container.value(T, 'x')).toThrow(ContainerDisposedError);
    expect(() => container.factory(T, () => 'x')).toThrow(ContainerDisposedError);
    expect(() => container.bind(T, class {})).toThrow(ContainerDisposedError);
    expect(() => container.alias(T, T)).toThrow(ContainerDisposedError);
    expect(() => container.unregister(T)).toThrow(ContainerDisposedError);
    expect(() => container.createChild()).toThrow(ContainerDisposedError);
  });
});

describe('Container - debug', () => {
  it('returns provider metadata for tokens and aliases', () => {
    const container = createContainer();
    const Value = createToken<string>('Value');
    const Alias = createToken<string>('Alias');

    container.value(Value, 'v').alias(Alias, Value);

    const debug = container.debug();

    expect(debug.aliases).toContainEqual(['Alias', 'Value']);
    expect(debug.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lifetime: 'singleton',
          name: 'Value',
          provider: 'value',
          resolved: false,
        }),
      ]),
    );
  });
});
