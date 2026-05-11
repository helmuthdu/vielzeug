import { beforeEach, describe, expect, it } from 'vitest';

import {
  CircularDependencyError,
  type Container,
  ContainerDisposedError,
  createContainer,
  createToken,
  MultipleProvidersError,
  ProviderNotFoundError,
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

  it('throws when replacing existing token without multi', () => {
    const T = createToken<string>('T');

    container.value(T, 'original');

    expect(() => container.value(T, 'replacement')).toThrow(/already registered/);
  });

  it('supports multi-provider tokens through resolveMany', async () => {
    const Validator = createToken<string>('Validator');

    container.value(Validator, 'a', { multi: true });
    container.value(Validator, 'b', { multi: true });

    await expect(container.resolveMany(Validator)).resolves.toEqual(['a', 'b']);
    await expect(container.resolve(Validator)).rejects.toThrow(MultipleProvidersError);
  });

  it('throws ProviderNotFoundError for unregistered token', async () => {
    const Missing = createToken<string>('Missing');

    await expect(container.resolve(Missing)).rejects.toThrow(ProviderNotFoundError);
    await expect(container.resolveMany(Missing)).resolves.toEqual([]);
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

  it('runs init hook once for singleton providers', async () => {
    const order: string[] = [];
    const T = createToken<{ id: string }>('Init');

    container.factory(
      T,
      () => {
        order.push('create');

        return { id: 'x' };
      },
      {
        init: () => {
          order.push('init');
        },
      },
    );

    await container.resolve(T);
    await container.resolve(T);

    expect(order).toEqual(['create', 'init']);
  });
});

describe('Container - dispose and lifecycle guards', () => {
  it('runs dispose hooks for resolved instances', async () => {
    const log: string[] = [];
    const T = createToken<object>('T');
    const container = createContainer();

    container.factory(T, () => ({}), {
      dispose: () => {
        log.push('disposed');
      },
    });

    await container.resolve(T);
    await container.dispose();

    expect(log).toContain('disposed');
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

  it('throws ContainerDisposedError after dispose', async () => {
    const T = createToken<string>('T');
    const container = createContainer();

    container.value(T, 'v');
    await container.dispose();

    await expect(container.resolve(T)).rejects.toThrow(ContainerDisposedError);
    expect(() => container.value(T, 'x')).toThrow(ContainerDisposedError);
    expect(() => container.factory(T, () => 'x')).toThrow(ContainerDisposedError);
    expect(() => container.bind(T, class {})).toThrow(ContainerDisposedError);
    expect(() => container.createChild()).toThrow(ContainerDisposedError);
  });
});
