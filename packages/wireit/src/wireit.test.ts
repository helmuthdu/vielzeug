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

  it('resolves value and factory providers', async () => {
    const Value = createToken<string>('Value');
    const Factory = createToken<number>('Factory');

    container.value(Value, 'v').factory(Factory, () => 42);

    await expect(container.resolve(Value)).resolves.toBe('v');
    await expect(container.resolve(Factory)).resolves.toBe(42);
  });

  it('throws when replacing an existing single registration', () => {
    const token = createToken<string>('Token');

    container.value(token, 'first');

    expect(() => container.value(token, 'second')).toThrow(/already registered/);
  });

  it('supports multi-provider tokens through resolveMany', async () => {
    const Validator = createToken<string>('Validator');

    container.value(Validator, 'a', { multi: true });
    container.value(Validator, 'b', { multi: true });

    await expect(container.resolveMany(Validator)).resolves.toEqual(['a', 'b']);
    await expect(container.resolve(Validator)).rejects.toThrow(MultipleProvidersError);
  });

  it('returns undefined for missing optional tokens', async () => {
    await expect(container.resolveOptional(createToken<string>('Missing'))).resolves.toBeUndefined();
  });

  it('throws ProviderNotFoundError for missing tokens', async () => {
    await expect(container.resolve(createToken<string>('Missing'))).rejects.toThrow(ProviderNotFoundError);
  });
});

describe('Container - lifetime semantics', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('singleton caches instance', async () => {
    let n = 0;
    const token = createToken<object>('Singleton');

    container.factory(token, () => ({ id: ++n }));

    const a = await container.resolve(token);
    const b = await container.resolve(token);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('transient returns a new instance each time', async () => {
    let n = 0;
    const token = createToken<object>('Transient');

    container.factory(token, () => ({ id: ++n }), { lifetime: 'transient' });

    const a = await container.resolve(token);
    const b = await container.resolve(token);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });

  it('scoped creates one instance per child container', async () => {
    let n = 0;
    const token = createToken<object>('Scoped');

    container.factory(token, () => ({ id: ++n }), { lifetime: 'scoped' });

    const c1 = container.createChild();
    const c2 = container.createChild();

    const a1 = await c1.resolve(token);
    const a2 = await c1.resolve(token);
    const b1 = await c2.resolve(token);

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
    expect(n).toBe(2);
  });

  it('throws when scoped is resolved on the root container', async () => {
    const token = createToken<string>('ScopedOnRoot');

    container.factory(token, () => 'value', { lifetime: 'scoped' });

    await expect(container.resolve(token)).rejects.toThrow(/scoped lifetime/);
  });
});

describe('Container - dependencies and cycles', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('injects dependencies into factory providers', async () => {
    class Db {
      readonly url = 'db://local';
    }

    class Repo {
      constructor(readonly db: Db) {}
    }

    const dbToken = createToken<Db>('Db');
    const repoToken = createToken<Repo>('Repo');
    const labelToken = createToken<string>('Label');

    container.factory(dbToken, () => new Db());
    container.factory(repoToken, (db) => new Repo(db), { deps: [dbToken] });
    container.factory(labelToken, (repo) => `repo:${repo.db.url}`, { deps: [repoToken] });

    const repo = await container.resolve(repoToken);

    expect(repo.db).toBeInstanceOf(Db);
    await expect(container.resolve(labelToken)).resolves.toBe('repo:db://local');
  });

  it('detects circular dependency chains', async () => {
    const a = createToken('A');
    const b = createToken('B');

    container.factory(a, async (value) => value, { deps: [b] });
    container.factory(b, async (value) => value, { deps: [a] });

    await expect(container.resolve(a)).rejects.toThrow(CircularDependencyError);
  });

  it('allows shared dependencies across sibling branches', async () => {
    const root = createContainer();
    const shared = createToken<{ id: number }>('Shared');
    const left = createToken<{ shared: { id: number } }>('Left');
    const right = createToken<{ shared: { id: number } }>('Right');
    const parent = createToken<{ left: unknown; right: unknown }>('Parent');
    let n = 0;

    root.factory(shared, () => ({ id: ++n }));
    root.factory(left, (value) => ({ shared: value }), { deps: [shared] });
    root.factory(right, (value) => ({ shared: value }), { deps: [shared] });
    root.factory(parent, (l, r) => ({ left: l, right: r }), { deps: [left, right] });

    const result = await root.resolve(parent);

    expect(result.left).toBeDefined();
    expect(result.right).toBeDefined();
    expect(n).toBe(1);
  });
});

describe('Container - async behavior', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('deduplicates concurrent singleton resolution', async () => {
    let n = 0;
    const token = createToken<number>('AsyncSingleton');

    container.factory(token, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      return ++n;
    });

    const [a, b, c] = await Promise.all([container.resolve(token), container.resolve(token), container.resolve(token)]);

    expect(n).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('retries singleton factory after transient failure', async () => {
    let attempts = 0;
    const token = createToken<string>('Retry');

    container.factory(token, async () => {
      attempts += 1;

      if (attempts === 1) throw new Error('transient');

      return 'ok';
    });

    await expect(container.resolve(token)).rejects.toThrow('transient');
    await expect(container.resolve(token)).resolves.toBe('ok');
  });
});

describe('Container - dispose and lifecycle guards', () => {
  it('runs dispose hooks for resolved singleton instances', async () => {
    const log: string[] = [];
    const token = createToken<object>('T');
    const container = createContainer();

    container.factory(token, () => ({}), {
      dispose: () => {
        log.push('disposed');
      },
    });

    await container.resolve(token);
    await container.dispose();

    expect(log).toContain('disposed');
  });

  it('aggregates dispose hook failures and still marks container disposed', async () => {
    const a = createToken<object>('A');
    const b = createToken<object>('B');
    const container = createContainer();

    container.factory(a, () => ({}), {
      dispose: () => {
        throw new Error('A failed');
      },
    });
    container.factory(b, () => ({}), {
      dispose: () => {
        throw new Error('B failed');
      },
    });

    await container.resolve(a);
    await container.resolve(b);

    await expect(container.dispose()).rejects.toThrow(AggregateError);
    expect(container.disposed).toBe(true);
  });

  it('throws ContainerDisposedError after dispose', async () => {
    const token = createToken<string>('T');
    const container = createContainer();

    container.value(token, 'v');
    await container.dispose();

    await expect(container.resolve(token)).rejects.toThrow(ContainerDisposedError);
    await expect(container.resolveOptional(token)).rejects.toThrow(ContainerDisposedError);
    expect(() => container.value(token, 'x')).toThrow(ContainerDisposedError);
    expect(() => container.factory(token, () => 'x')).toThrow(ContainerDisposedError);
    expect(() => container.createChild()).toThrow(ContainerDisposedError);
  });

  it('throws ContainerDisposedError on children when the parent is disposed', async () => {
    const token = createToken<string>('Child');
    const root = createContainer();
    const child = root.createChild();

    root.value(token, 'v');
    await root.dispose();

    await expect(child.resolve(token)).rejects.toThrow(ContainerDisposedError);
  });
});
