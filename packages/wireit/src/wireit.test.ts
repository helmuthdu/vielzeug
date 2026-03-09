/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AsyncProviderError,
  CircularDependencyError,
  Container,
  createContainer,
  createTestContainer,
  createToken,
  ProviderNotFoundError,
  type Token,
  withMock,
} from './wireit';

// ─── createToken ─────────────────────────────────────────────────────────────

describe('createToken', () => {
  it('creates a unique symbol with a description', () => {
    const a = createToken<string>('MyService');
    const b = createToken<string>('MyService');

    expect(typeof a).toBe('symbol');
    expect(a.description).toBe('MyService');
    expect(a).not.toBe(b); // unique even with the same description
  });

  it('description appears in error messages', () => {
    const token = createToken<string>('NamedToken');

    expect(() => createContainer().get(token)).toThrow(/NamedToken/);
  });
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('Container - Registration', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('registers and resolves a value via registerValue', () => {
    const token = createToken<string>('Config');
    container.registerValue(token, 'test-value');

    expect(container.get(token)).toBe('test-value');
    expect(container.has(token)).toBe(true);
  });

  it('registers and resolves via useClass', () => {
    class TestService {
      getValue() {
        return 'test';
      }
    }
    const token = createToken<TestService>('TestService');
    container.register(token, { useClass: TestService });

    const svc = container.get(token);
    expect(svc).toBeInstanceOf(TestService);
    expect(svc.getValue()).toBe('test');
  });

  it('registers and resolves via useFactory', () => {
    const token = createToken<string>('Factory');
    container.register(token, { useFactory: () => 'factory-result' });

    expect(container.get(token)).toBe('factory-result');
  });

  it('re-registering a token overwrites the previous provider', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'first');
    container.registerValue(token, 'second');

    expect(container.get(token)).toBe('second');
  });

  it('has() returns false before registration and true after', () => {
    const token = createToken<string>('Service');

    expect(container.has(token)).toBe(false);
    container.registerValue(token, 'value');
    expect(container.has(token)).toBe(true);
  });

  it('has() looks up the parent container chain', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'value');

    expect(container.createChild().has(token)).toBe(true);
  });

  it('unregister removes a token', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'value');
    container.unregister(token);

    expect(container.has(token)).toBe(false);
    expect(() => container.get(token)).toThrow(ProviderNotFoundError);
  });

  it('clear removes all registrations and aliases', () => {
    const Source = createToken<string>('Source');
    const Alias = createToken<string>('Alias');
    container.registerValue(Source, 'value').alias(Alias, Source);

    container.clear();

    expect(container.has(Source)).toBe(false);
    expect(() => container.get(Alias)).toThrow(ProviderNotFoundError);
  });

  it('register / unregister / clear are chainable and return this', () => {
    const a = createToken<string>('A');
    const b = createToken<string>('B');

    const result = container.registerValue(a, 'x').registerValue(b, 'y').unregister(a);

    expect(result).toBe(container);
    expect(container.has(a)).toBe(false);
    expect(container.get(b)).toBe('y');
  });

  it('registers null and undefined as values without confusing getOptional', () => {
    const nullToken = createToken<null>('Null');
    const undefinedToken = createToken<undefined>('Undefined');
    container.registerValue(nullToken, null);
    container.registerValue(undefinedToken, undefined);

    expect(container.get(nullToken)).toBeNull();
    expect(container.get(undefinedToken)).toBeUndefined();
  });
});

// ─── Lifetimes ────────────────────────────────────────────────────────────────

describe('Container - Lifetimes', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('singleton class: instance created once and cached', () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service }); // default is singleton

    const a = container.get(token);
    const b = container.get(token);

    expect(count).toBe(1);
    expect(a).toBe(b);
  });

  it('singleton factory: factory called once and result cached', () => {
    let count = 0;
    const token = createToken<number>('Factory');
    container.register(token, { useFactory: () => ++count }); // default is singleton

    expect(container.get(token)).toBe(1);
    expect(container.get(token)).toBe(1);
    expect(count).toBe(1);
  });

  it('transient: new instance returned on every call', () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service, lifetime: 'transient' });

    const a = container.get(token);
    const b = container.get(token);

    expect(count).toBe(2);
    expect(a).not.toBe(b);
  });

  it('scoped in root container behaves as singleton', () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service, lifetime: 'scoped' });

    container.get(token);
    container.get(token);

    expect(count).toBe(1);
  });

  it('scoped in child containers: one instance per child, consistent within each', () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service, lifetime: 'scoped' });

    const child1 = container.createChild();
    const child2 = container.createChild();

    const a = child1.get(token);
    expect(child1.get(token)).toBe(a); // same child → same instance
    expect(child2.get(token)).not.toBe(a); // different child → new instance
    expect(count).toBe(2);
  });
});

// ─── Dependencies ─────────────────────────────────────────────────────────────

describe('Container - Dependencies', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves class with injected dependencies', () => {
    class Config {
      url = 'https://api.example.com';
    }
    class Service {
      config: Config;
      constructor(config: Config) {
        this.config = config;
      }
    }
    const ConfigToken = createToken<Config>('Config');
    const ServiceToken = createToken<Service>('Service');

    container.register(ConfigToken, { useClass: Config });
    container.register(ServiceToken, { useClass: Service, deps: [ConfigToken] });

    expect(container.get(ServiceToken).config.url).toBe('https://api.example.com');
  });

  it('resolves factory with injected dependencies', () => {
    const UrlToken = createToken<string>('Url');
    const ServiceToken = createToken<string>('Service');

    container.registerValue(UrlToken, 'https://api.example.com');
    container.register(ServiceToken, {
      useFactory: (url: string) => `Service(${url})`,
      deps: [UrlToken],
    });

    expect(container.get(ServiceToken)).toBe('Service(https://api.example.com)');
  });

  it('resolves a multi-level dependency chain', () => {
    class Db {
      name = 'db';
    }
    class Repo {
      db: Db;
      constructor(db: Db) {
        this.db = db;
      }
    }
    class Service {
      repo: Repo;
      constructor(repo: Repo) {
        this.repo = repo;
      }
    }

    const DbToken = createToken<Db>('Db');
    const RepoToken = createToken<Repo>('Repo');
    const SvcToken = createToken<Service>('Service');

    container.register(DbToken, { useClass: Db });
    container.register(RepoToken, { useClass: Repo, deps: [DbToken] });
    container.register(SvcToken, { useClass: Service, deps: [RepoToken] });

    expect(container.get(SvcToken).repo.db.name).toBe('db');
  });

  it('throws CircularDependencyError for mutually-dependent tokens', () => {
    const A = createToken('A');
    const B = createToken('B');
    container.register(A, { useFactory: (b: any) => b, deps: [B] });
    container.register(B, { useFactory: (a: any) => a, deps: [A] });

    expect(() => container.get(A)).toThrow(CircularDependencyError);
    expect(() => container.get(A)).toThrow(/A.*B/);
  });

  it('throws CircularDependencyError for a self-referencing token', () => {
    const Self = createToken('Self');
    container.register(Self, { useFactory: (s: any) => s, deps: [Self] });

    expect(() => container.get(Self)).toThrow(CircularDependencyError);
  });
});

// ─── Aliasing ─────────────────────────────────────────────────────────────────

describe('Container - Aliasing', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves an alias to its source token', () => {
    const Source = createToken<string>('Source');
    const Alias = createToken<string>('Alias');
    container.registerValue(Source, 'value');
    container.alias(Alias, Source);

    expect(container.get(Alias)).toBe('value');
  });

  it('resolves chained aliases', () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');
    const C = createToken<string>('C');
    container.registerValue(A, 'value');
    container.alias(B, A);
    container.alias(C, B);

    expect(container.get(C)).toBe('value');
  });

  it('resolves an alias whose source is registered in the parent container', () => {
    const Source = createToken<string>('Source');
    const Alias = createToken<string>('Alias');
    container.registerValue(Source, 'value');

    const child = container.createChild();
    child.alias(Alias, Source);

    expect(child.get(Alias)).toBe('value');
  });

  it('throws on alias cycles', () => {
    const A = createToken('A');
    const B = createToken('B');
    container.alias(A, B);
    container.alias(B, A);

    expect(() => container.get(A)).toThrow(/Alias cycle/);
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────

describe('Container - Error Handling', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('throws ProviderNotFoundError for an unregistered token', () => {
    const token = createToken('Unknown');

    expect(() => container.get(token)).toThrow(ProviderNotFoundError);
    expect(() => container.get(token)).toThrow(/No provider registered/);
  });

  it('throws AsyncProviderError when resolving an async factory synchronously', () => {
    const token = createToken<string>('Async');
    container.register(token, { useFactory: async () => 'value' });

    expect(() => container.get(token)).toThrow(AsyncProviderError);
    expect(() => container.get(token)).toThrow(/Use getAsync/);
  });

  it('error message includes the token description', () => {
    const token = createToken('MyService');

    expect(() => container.get(token)).toThrow(/MyService/);
  });

  it('uses "anonymous" for tokens without a string description', () => {
    const token = Symbol() as Token;
    container.registerValue(token, 'x');
    container.unregister(token);

    expect(() => container.get(token)).toThrow(/anonymous/);
  });
});

// ─── Async Resolution ─────────────────────────────────────────────────────────

describe('Container - Async Resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves an async factory', async () => {
    const token = createToken<string>('Async');
    container.register(token, { useFactory: async () => 'async-value' });

    await expect(container.getAsync(token)).resolves.toBe('async-value');
  });

  it('singleton async factory is called only once', async () => {
    let count = 0;
    const token = createToken<number>('Async');
    container.register(token, { useFactory: async () => ++count, lifetime: 'singleton' });

    expect(await container.getAsync(token)).toBe(1);
    expect(await container.getAsync(token)).toBe(1);
    expect(count).toBe(1);
  });

  it('concurrent requests for the same singleton share one in-flight promise', async () => {
    let count = 0;
    const token = createToken<number>('Async');
    container.register(token, {
      useFactory: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return ++count;
      },
    });

    const [a, b, c] = await Promise.all([
      container.getAsync(token),
      container.getAsync(token),
      container.getAsync(token),
    ]);

    expect(count).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('async deps are resolved and injected into a factory', async () => {
    const Config = createToken<string>('Config');
    const Service = createToken<string>('Service');
    container.register(Config, { useFactory: async () => 'cfg' });
    container.register(Service, { useFactory: async (c: string) => `svc:${c}`, deps: [Config] });

    await expect(container.getAsync(Service)).resolves.toBe('svc:cfg');
  });

  it('async deps are resolved and injected into a class constructor', async () => {
    class Service {
      value: string;
      constructor(value: string) {
        this.value = value;
      }
    }
    const Config = createToken<string>('Config');
    const ServiceToken = createToken<Service>('Service');
    container.register(Config, { useFactory: async () => 'cfg' });
    container.register(ServiceToken, { useClass: Service, deps: [Config] });

    const svc = await container.getAsync(ServiceToken);
    expect(svc.value).toBe('cfg');
  });

  it('throws CircularDependencyError in async resolution', async () => {
    const A = createToken('A');
    const B = createToken('B');
    container.register(A, { useFactory: async (b: any) => b, deps: [B] });
    container.register(B, { useFactory: async (a: any) => a, deps: [A] });

    await expect(container.getAsync(A)).rejects.toThrow(CircularDependencyError);
  });
});

// ─── Optional Resolution ──────────────────────────────────────────────────────

describe('Container - Optional Resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('getOptional returns undefined for a missing token', () => {
    expect(container.getOptional(createToken<string>('Missing'))).toBeUndefined();
  });

  it('getOptional returns the value when the token is registered', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'value');

    expect(container.getOptional(token)).toBe('value');
  });

  it('getOptional rethrows errors that are not ProviderNotFoundError', () => {
    const token = createToken<string>('Async');
    container.register(token, { useFactory: async () => 'value' });

    expect(() => container.getOptional(token)).toThrow(AsyncProviderError);
  });

  it('getOptionalAsync returns undefined for a missing token', async () => {
    await expect(container.getOptionalAsync(createToken<string>('Missing'))).resolves.toBeUndefined();
  });

  it('getOptionalAsync returns the value when the token is registered', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'value');

    await expect(container.getOptionalAsync(token)).resolves.toBe('value');
  });
});

// ─── Hierarchy ────────────────────────────────────────────────────────────────

describe('Container - Hierarchy', () => {
  let parent: Container;

  beforeEach(() => {
    parent = createContainer();
  });

  it('createChild() returns a Container instance', () => {
    expect(parent.createChild()).toBeInstanceOf(Container);
  });

  it('child inherits registrations from its parent', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    expect(parent.createChild().get(token)).toBe('parent-value');
  });

  it('child override is local — parent retains its own provider', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    const child = parent.createChild();
    child.registerValue(token, 'child-value');

    expect(parent.get(token)).toBe('parent-value');
    expect(child.get(token)).toBe('child-value');
  });

  it('clearing a child container does not affect its parent', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    const child = parent.createChild();
    child.clear();

    expect(parent.get(token)).toBe('parent-value');
    expect(child.get(token)).toBe('parent-value'); // falls through to parent
  });
});

// ─── Scoped Execution ─────────────────────────────────────────────────────────

describe('Container - Scoped Execution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('fn runs in an isolated scope; scope is cleared after fn completes', async () => {
    const token = createToken<string>('Scoped');
    let scopeRef: Container;

    const result = await container.runInScope(async (scope) => {
      scopeRef = scope;
      scope.registerValue(token, 'scoped-value');
      await new Promise((r) => setTimeout(r, 5));
      return scope.get(token);
    });

    expect(result).toBe('scoped-value');
    expect(scopeRef!.has(token)).toBe(false); // scope was cleared
    expect(container.has(token)).toBe(false); // parent was never modified
  });

  it('scope is cleared even when fn throws', async () => {
    const token = createToken<string>('Scoped');
    let scopeRef: Container;

    await expect(
      container.runInScope((scope) => {
        scopeRef = scope;
        scope.registerValue(token, 'value');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(scopeRef!.has(token)).toBe(false);
  });
});

// ─── Snapshot / Restore ───────────────────────────────────────────────────────

describe('Container - Snapshot / Restore', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('snapshot captures state; restore reverts subsequent changes', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    const snap = container.snapshot();
    container.registerValue(token, 'modified');
    expect(container.get(token)).toBe('modified');

    container.restore(snap);
    expect(container.get(token)).toBe('original');
  });

  it('tokens added after the snapshot are removed on restore', () => {
    const token = createToken<string>('Service');
    const snap = container.snapshot();

    container.registerValue(token, 'new');
    container.restore(snap);

    expect(container.has(token)).toBe(false);
  });

  it('singleton instance cached before snapshot is preserved after restore', () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service });

    const original = container.get(token); // count = 1
    const snap = container.snapshot();
    container.registerValue(token, new Service() as any); // count = 2

    container.restore(snap);

    expect(container.get(token)).toBe(original); // cached instance restored
    expect(count).toBe(2); // no additional instantiation
  });

  it('aliases are captured by snapshot and removed on restore', () => {
    const Source = createToken<string>('Source');
    const Alias = createToken<string>('Alias');
    container.registerValue(Source, 'value');

    const snap = container.snapshot();
    container.alias(Alias, Source);
    expect(container.get(Alias)).toBe('value');

    container.restore(snap);
    expect(() => container.get(Alias)).toThrow(ProviderNotFoundError);
    expect(container.get(Source)).toBe('value'); // source unaffected
  });

  it('restore returns this for chaining', () => {
    const snap = container.snapshot();
    expect(container.restore(snap)).toBe(container);
  });
});

// ─── Debug ────────────────────────────────────────────────────────────────────

describe('Container - Debug', () => {
  it('lists registered token descriptions and alias pairs', () => {
    const container = createContainer();
    const A = createToken('ServiceA');
    const B = createToken('ServiceB');
    const Alias = createToken('AliasA');

    container.registerValue(A, 'a').registerValue(B, 'b').alias(Alias, A);

    const { tokens, aliases } = container.debug();

    expect(tokens).toContain('ServiceA');
    expect(tokens).toContain('ServiceB');
    expect(aliases).toContainEqual(['AliasA', 'ServiceA']);
  });

  it('uses "anonymous" for tokens without a string description', () => {
    const container = createContainer();
    container.registerValue(Symbol() as Token, 'value');

    expect(container.debug().tokens).toContain('anonymous');
  });
});

// ─── createTestContainer ──────────────────────────────────────────────────────

describe('createTestContainer', () => {
  it('returns an isolated child container and a dispose function', () => {
    const { container, dispose } = createTestContainer();

    expect(container).toBeInstanceOf(Container);
    expect(typeof dispose).toBe('function');
  });

  it('dispose() clears all registrations in the test container', () => {
    const { container, dispose } = createTestContainer();
    const token = createToken<string>('Test');
    container.registerValue(token, 'value');

    dispose();

    expect(container.has(token)).toBe(false);
  });

  it('inherits registrations from the provided base container', () => {
    const base = createContainer();
    const token = createToken<string>('Base');
    base.registerValue(token, 'base-value');

    const { container } = createTestContainer(base);

    expect(container.get(token)).toBe('base-value');
  });
});

// ─── withMock ─────────────────────────────────────────────────────────────────

describe('withMock', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('temporarily replaces a registration and restores it afterwards', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    const result = await withMock(container, token, 'mocked', () => container.get(token));

    expect(result).toBe('mocked');
    expect(container.get(token)).toBe('original');
  });

  it('restores the original provider even when fn throws', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    await expect(
      withMock(container, token, 'mocked', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(container.get(token)).toBe('original');
  });

  it('token is absent after the mock if it was not registered beforehand', async () => {
    const token = createToken<string>('Service');

    await withMock(container, token, 'mocked', () => {
      expect(container.get(token)).toBe('mocked');
    });

    expect(container.has(token)).toBe(false);
  });

  it('preserves the original singleton instance — not just the registration', async () => {
    let count = 0;
    class Service {
      constructor() {
        count++;
      }
      getValue() {
        return 'real';
      }
    }
    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service });

    const original = container.get(token); // count = 1
    await withMock(container, token, { getValue: () => 'mock' } as any, () => {
      expect(container.get(token).getValue()).toBe('mock');
    });

    expect(container.get(token)).toBe(original);
    expect(container.get(token).getValue()).toBe('real');
    expect(count).toBe(1); // no new instance created
  });
});
