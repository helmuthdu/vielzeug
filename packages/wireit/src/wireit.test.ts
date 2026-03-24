import { beforeEach, describe, expect, it } from 'vitest';

import {
  AliasCycleError,
  AsyncProviderError,
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

// ─── createToken ──────────────────────────────────────────────────────────────

describe('createToken', () => {
  it('returns a unique symbol for each call, even with the same description', () => {
    const a = createToken<string>('Service');
    const b = createToken<string>('Service');

    expect(a).not.toBe(b);
    expect(a.description).toBe('Service');
  });

  it('description appears in error messages and debug output', () => {
    const token = createToken<string>('MyService');

    expect(token.description).toBe('MyService');
    expect(() => createContainer().get(token)).toThrow(/MyService/);
  });
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('Container - Registration', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('resolves useValue, useClass, and useFactory providers', () => {
    class Svc {
      tag = 'class';
    }

    const V = createToken<string>('V');
    const C = createToken<Svc>('C');
    const F = createToken<number>('F');

    container
      .value(V, 'val')
      .register(C, { useClass: Svc })
      .register(F, { useFactory: () => 42 });

    expect(container.get(V)).toBe('val');
    expect(container.get(C)).toBeInstanceOf(Svc);
    expect(container.get(F)).toBe(42);
  });

  it('factory() is a shorthand for register with useFactory', () => {
    let n = 0;
    const token = createToken<number>('Counter');

    container.factory(token, () => ++n, { lifetime: 'transient' });

    expect(container.get(token)).toBe(1);
    expect(container.get(token)).toBe(2);
  });

  it('factory() injects deps and forwards options', () => {
    const UrlT = createToken<string>('Url');
    const SvcT = createToken<string>('Svc');

    container.value(UrlT, 'https://api.local');
    container.factory(SvcT, (url: string) => `Svc(${url})`, { deps: [UrlT] });

    expect(container.get(SvcT)).toBe('Svc(https://api.local)');
  });

  it('bind() is a shorthand for register with useClass', () => {
    class Logger {
      log = (msg: string) => msg;
    }

    const token = createToken<Logger>('Logger');

    container.bind(token, Logger);

    expect(container.get(token)).toBeInstanceOf(Logger);
  });

  it('bind() injects deps into the class constructor', () => {
    class Db {
      url = 'db://local';
    }

    class Repo {
      db: Db;
      constructor(db: Db) {
        this.db = db;
      }
    }

    const DbT = createToken<Db>('Db');
    const RepoT = createToken<Repo>('Repo');

    container.bind(DbT, Db).bind(RepoT, Repo, { deps: [DbT] });

    expect(container.get(RepoT).db).toBeInstanceOf(Db);
  });

  it('factory() and bind() support { overwrite: true }', () => {
    const token = createToken<string>('T');

    container.value(token, 'original');
    container.factory(token, () => 'replaced', { overwrite: true });

    expect(container.get(token)).toBe('replaced');
  });

  it('throws when re-registering without { overwrite: true }; original is preserved', () => {
    const token = createToken<string>('S');

    container.value(token, 'original');

    expect(() => container.value(token, 'replacement')).toThrow(/already registered/);
    expect(container.get(token)).toBe('original');
  });

  it('replaces provider when { overwrite: true } is passed', () => {
    const token = createToken<string>('S');

    container.value(token, 'first');
    container.value(token, 'second', { overwrite: true });

    expect(container.get(token)).toBe('second');
  });

  it('unregister removes a token; subsequent get() throws ProviderNotFoundError', () => {
    const token = createToken<string>('S');

    container.value(token, 'val');
    container.unregister(token);

    expect(container.has(token)).toBe(false);
    expect(() => container.get(token)).toThrow(ProviderNotFoundError);
  });

  it('clear() removes all registrations and aliases', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val').alias(Alias, Src);

    container.clear();

    expect(container.has(Src)).toBe(false);
    expect(() => container.get(Alias)).toThrow(ProviderNotFoundError);
  });

  it('registration methods are chainable and return this', () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');

    const result = container.value(A, 'a').value(B, 'b').unregister(A);

    expect(result).toBe(container);
    expect(container.has(A)).toBe(false);
    expect(container.get(B)).toBe('b');
  });

  it('stores and retrieves falsy values (null, undefined, 0, false) correctly', () => {
    const N = createToken<null>('N');
    const U = createToken<undefined>('U');
    const Z = createToken<number>('Z');
    const F = createToken<boolean>('F');

    container.value(N, null);
    container.value(U, undefined);
    container.value(Z, 0);
    container.value(F, false);

    expect(container.get(N)).toBeNull();
    expect(container.get(U)).toBeUndefined();
    expect(container.get(Z)).toBe(0);
    expect(container.get(F)).toBe(false);
  });
});

// ─── Lookup ───────────────────────────────────────────────────────────────────

describe('Container - Lookup', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('has() returns false before registration, true after', () => {
    const token = createToken<string>('S');

    expect(container.has(token)).toBe(false);
    container.value(token, 'val');
    expect(container.has(token)).toBe(true);
  });

  it('has() walks the parent chain', () => {
    const token = createToken<string>('S');

    container.value(token, 'val');

    expect(container.createChild().has(token)).toBe(true);
  });

  it('has() resolves aliases', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val').alias(Alias, Src);

    expect(container.has(Alias)).toBe(true);
  });

  it('get() throws ProviderNotFoundError with token name in message', () => {
    const token = createToken('MyService');

    expect(() => container.get(token)).toThrow(ProviderNotFoundError);
    expect(() => container.get(token)).toThrow(/MyService/);
  });

  it('get() throws AsyncProviderError for async factories; message hints at getAsync()', () => {
    const token = createToken<string>('Async');

    container.register(token, { useFactory: async () => 'val' });

    expect(() => container.get(token)).toThrow(AsyncProviderError);
    expect(() => container.get(token)).toThrow(/getAsync/);
  });

  it('getOptional() returns undefined for a missing token', () => {
    expect(container.getOptional(createToken<string>('X'))).toBeUndefined();
  });

  it('getOptional() returns the registered value, including falsy values like 0', () => {
    const token = createToken<number>('Zero');

    container.value(token, 0);

    expect(container.getOptional(token)).toBe(0);
  });

  it('getOptional() rethrows non-ProviderNotFoundError errors', () => {
    const token = createToken<string>('Async');

    container.register(token, { useFactory: async () => 'val' });

    expect(() => container.getOptional(token)).toThrow(AsyncProviderError);
  });

  it('getOptionalAsync() returns undefined for a missing token; resolves value when present', async () => {
    const Missing = createToken<string>('X');
    const Present = createToken<string>('Y');

    container.register(Present, { useFactory: async () => 'found' });

    await expect(container.getOptionalAsync(Missing)).resolves.toBeUndefined();
    await expect(container.getOptionalAsync(Present)).resolves.toBe('found');
  });
});

// ─── Lifetimes ────────────────────────────────────────────────────────────────

describe('Container - Lifetimes', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('singleton (default): instance created once and cached', () => {
    let n = 0;
    const token = createToken<object>('S');

    container.register(token, { useFactory: () => ({ id: ++n }) });

    expect(container.get(token)).toBe(container.get(token));
    expect(n).toBe(1);
  });

  it('transient: new instance returned on every get()', () => {
    let n = 0;
    const token = createToken<object>('T');

    container.register(token, { lifetime: 'transient', useFactory: () => ({ id: ++n }) });

    expect(container.get(token)).not.toBe(container.get(token));
    expect(n).toBe(2);
  });

  it('scoped in root: acts as singleton', () => {
    let n = 0;
    const token = createToken<object>('S');

    container.register(token, { lifetime: 'scoped', useFactory: () => ({ id: ++n }) });

    container.get(token);
    container.get(token);

    expect(n).toBe(1);
  });

  it('scoped in children: one instance per child, shared within the same child', () => {
    let n = 0;
    const token = createToken<object>('S');

    container.register(token, { lifetime: 'scoped', useFactory: () => ({ id: ++n }) });

    const c1 = container.createChild();
    const c2 = container.createChild();
    const inst1 = c1.get(token);

    expect(c1.get(token)).toBe(inst1);
    expect(c2.get(token)).not.toBe(inst1);
    expect(n).toBe(2);
  });
});

// ─── Dependencies ─────────────────────────────────────────────────────────────

describe('Container - Dependencies', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('injects deps into useClass constructor', () => {
    class Db {
      url = 'db://local';
    }

    class Repo {
      db: Db;
      constructor(db: Db) {
        this.db = db;
      }
    }

    const DbT = createToken<Db>('Db');
    const RepoT = createToken<Repo>('Repo');

    container.register(DbT, { useClass: Db });
    container.register(RepoT, { deps: [DbT], useClass: Repo });

    expect(container.get(RepoT).db).toBeInstanceOf(Db);
  });

  it('injects deps into useFactory', () => {
    const UrlT = createToken<string>('Url');
    const SvcT = createToken<string>('Svc');

    container.value(UrlT, 'https://api.local');
    container.register(SvcT, { deps: [UrlT], useFactory: (url: string) => `Svc(${url})` });

    expect(container.get(SvcT)).toBe('Svc(https://api.local)');
  });

  it('resolves a multi-level dependency chain', () => {
    class A {
      val = 'a';
    }

    class B {
      a: A;
      constructor(a: A) {
        this.a = a;
      }
    }

    class C {
      b: B;
      constructor(b: B) {
        this.b = b;
      }
    }

    const TA = createToken<A>('A');
    const TB = createToken<B>('B');
    const TC = createToken<C>('C');

    container.register(TA, { useClass: A });
    container.register(TB, { deps: [TA], useClass: B });
    container.register(TC, { deps: [TB], useClass: C });

    expect(container.get(TC).b.a.val).toBe('a');
  });

  it('throws CircularDependencyError for mutual circular deps; path included in message', () => {
    const A = createToken('A');
    const B = createToken('B');

    container.register(A, { deps: [B], useFactory: (b: any) => b });
    container.register(B, { deps: [A], useFactory: (a: any) => a });

    expect(() => container.get(A)).toThrow(CircularDependencyError);
    expect(() => container.get(A)).toThrow(/A.*B/);
  });

  it('throws CircularDependencyError for a self-referencing token', () => {
    const Self = createToken('Self');

    container.register(Self, { deps: [Self], useFactory: (s: any) => s });

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
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val').alias(Alias, Src);

    expect(container.get(Alias)).toBe('val');
  });

  it('resolves chained aliases', () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');
    const C = createToken<string>('C');

    container.value(A, 'val').alias(B, A).alias(C, B);

    expect(container.get(C)).toBe('val');
  });

  it('resolves an alias whose source is registered in a parent container', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val');

    const child = container.createChild();

    child.alias(Alias, Src);

    expect(child.get(Alias)).toBe('val');
  });

  it('throws ProviderNotFoundError when alias source is not registered', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.alias(Alias, Src);

    expect(() => container.get(Alias)).toThrow(ProviderNotFoundError);
  });

  it('throws AliasCycleError for cyclic aliases; message includes the full cycle path', () => {
    const A = createToken('A');
    const B = createToken('B');

    container.alias(A, B).alias(B, A);

    expect(() => container.get(A)).toThrow(AliasCycleError);
    expect(() => container.get(A)).toThrow(/A → B → A/);
  });

  it('aliases defined in a parent are visible to child containers', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val').alias(Alias, Src);

    const child = container.createChild();

    expect(child.get(Alias)).toBe('val');
    expect(child.has(Alias)).toBe(true);
  });

  it('child alias overrides parent alias for the same token', () => {
    const Src1 = createToken<string>('Src1');
    const Src2 = createToken<string>('Src2');
    const Alias = createToken<string>('Alias');

    container.value(Src1, 'parent').value(Src2, 'child').alias(Alias, Src1);

    const child = container.createChild();

    child.alias(Alias, Src2);

    expect(container.get(Alias)).toBe('parent');
    expect(child.get(Alias)).toBe('child');
  });
});

// ─── Async Resolution ─────────────────────────────────────────────────────────

describe('Container - Async Resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('getAsync() resolves both async and sync providers', async () => {
    const Async = createToken<string>('Async');
    const Sync = createToken<string>('Sync');

    container.register(Async, { useFactory: async () => 'async' });
    container.value(Sync, 'sync');

    await expect(container.getAsync(Async)).resolves.toBe('async');
    await expect(container.getAsync(Sync)).resolves.toBe('sync');
  });

  it('singleton: async factory called once even under concurrent load', async () => {
    let n = 0;
    const token = createToken<number>('S');

    container.register(token, {
      useFactory: async () => {
        await new Promise((r) => setTimeout(r, 10));

        return ++n;
      },
    });

    const [a, b, c] = await Promise.all([
      container.getAsync(token),
      container.getAsync(token),
      container.getAsync(token),
    ]);

    expect(n).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('transient: getAsync() creates a new instance on every call', async () => {
    let n = 0;
    const token = createToken<number>('T');

    container.register(token, { lifetime: 'transient', useFactory: async () => ++n });

    const a = await container.getAsync(token);
    const b = await container.getAsync(token);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });

  it('injects async deps into both factory and class constructor', async () => {
    class Svc {
      val: string;
      constructor(val: string) {
        this.val = val;
      }
    }

    const Cfg = createToken<string>('Cfg');
    const FactoryT = createToken<string>('FactorySvc');
    const ClassT = createToken<Svc>('ClassSvc');

    container.register(Cfg, { useFactory: async () => 'cfg' });
    container.register(FactoryT, { deps: [Cfg], useFactory: async (c: string) => `svc:${c}` });
    container.register(ClassT, { deps: [Cfg], useClass: Svc });

    await expect(container.getAsync(FactoryT)).resolves.toBe('svc:cfg');
    expect((await container.getAsync(ClassT)).val).toBe('cfg');
  });

  it('throws CircularDependencyError in async resolution', async () => {
    const A = createToken('A');
    const B = createToken('B');

    container.register(A, { deps: [B], useFactory: async (b: any) => b });
    container.register(B, { deps: [A], useFactory: async (a: any) => a });

    await expect(container.getAsync(A)).rejects.toThrow(CircularDependencyError);
  });

  it("parallel deps do not corrupt each other's cycle detection state", async () => {
    // Diamond: Root → [Left, Right], both → Shared. This is NOT a cycle; Shared is a singleton.
    const Shared = createToken<number>('Shared');
    const Left = createToken<number>('Left');
    const Right = createToken<number>('Right');
    const Root = createToken<number>('Root');

    let sharedBuilt = 0;

    container.factory(Shared, async () => {
      sharedBuilt++;

      return 1;
    });
    container.factory(Left, async (s: number) => s + 10, { deps: [Shared] });
    container.factory(Right, async (s: number) => s + 20, { deps: [Shared] });
    container.factory(Root, async (l: number, r: number) => l + r, { deps: [Left, Right] });

    const result = await container.getAsync(Root);

    // Shared is a singleton — built exactly once
    expect(sharedBuilt).toBe(1);
    // 1+10 + 1+20 = 32
    expect(result).toBe(32);
  });
});

// ─── Hierarchy ────────────────────────────────────────────────────────────────

describe('Container - Hierarchy', () => {
  let parent: Container;

  beforeEach(() => {
    parent = createContainer();
  });

  it('child inherits registrations from parent', () => {
    const token = createToken<string>('S');

    parent.value(token, 'parent-val');

    expect(parent.createChild().get(token)).toBe('parent-val');
  });

  it('child override is isolated — parent retains its own registration', () => {
    const token = createToken<string>('S');

    parent.value(token, 'parent-val');

    const child = parent.createChild();

    child.value(token, 'child-val');

    expect(parent.get(token)).toBe('parent-val');
    expect(child.get(token)).toBe('child-val');
  });

  it('clearing a child does not affect parent; cleared child still inherits parent', () => {
    const token = createToken<string>('S');

    parent.value(token, 'parent-val');

    const child = parent.createChild();

    child.clear();

    expect(parent.get(token)).toBe('parent-val');
    expect(child.get(token)).toBe('parent-val');
  });

  it('grandchild inherits through the full parent chain', () => {
    const token = createToken<string>('S');

    parent.value(token, 'root');

    expect(parent.createChild().createChild().get(token)).toBe('root');
  });
});

// ─── Scoped Execution ─────────────────────────────────────────────────────────

describe('Container - Scoped Execution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('scope is isolated from parent; disposed after fn completes', async () => {
    const token = createToken<string>('S');
    let scopeRef!: Container;

    const result = await container.runInScope(async (scope) => {
      scopeRef = scope;
      scope.value(token, 'scoped');

      return scope.get(token);
    });

    expect(result).toBe('scoped');
    expect(scopeRef.disposed).toBe(true);
    expect(container.has(token)).toBe(false);
  });

  it('scope is disposed even when fn throws', async () => {
    const token = createToken<string>('S');
    let scopeRef!: Container;

    await expect(
      container.runInScope((scope) => {
        scopeRef = scope;
        scope.value(token, 'val');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(scopeRef.disposed).toBe(true);
  });

  it('dispose hooks run when the scope is exited', async () => {
    const log: string[] = [];
    const token = createToken<object>('S');

    container.register(token, {
      dispose: async () => {
        log.push('disposed');
      },
      lifetime: 'scoped',
      useFactory: () => ({}),
    });

    await container.runInScope(async (scope) => {
      scope.get(token);
    });

    expect(log).toEqual(['disposed']);
  });
});

// ─── Snapshot / Restore ───────────────────────────────────────────────────────

describe('Container - Snapshot / Restore', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('restore reverts registrations to the snapshot point', () => {
    const token = createToken<string>('S');

    container.value(token, 'original');

    const snap = container.snapshot();

    container.value(token, 'modified', { overwrite: true });
    container.restore(snap);

    expect(container.get(token)).toBe('original');
  });

  it('tokens registered after snapshot are absent after restore', () => {
    const snap = container.snapshot();

    container.value(createToken<string>('New'), 'val');
    container.restore(snap);

    expect(container.debug().tokens).toHaveLength(0);
  });

  it('aliases registered after snapshot are absent after restore', () => {
    const Src = createToken<string>('Src');
    const Alias = createToken<string>('Alias');

    container.value(Src, 'val');

    const snap = container.snapshot();

    container.alias(Alias, Src);
    container.restore(snap);

    expect(() => container.get(Alias)).toThrow(ProviderNotFoundError);
    expect(container.get(Src)).toBe('val');
  });

  it('cached singleton instance is preserved across snapshot/restore', () => {
    let n = 0;
    const token = createToken<object>('S');

    container.register(token, { useFactory: () => ({ id: ++n }) });

    const original = container.get(token); // n = 1
    const snap = container.snapshot();

    container.value(token, { id: 99 }, { overwrite: true });
    container.restore(snap);

    expect(container.get(token)).toBe(original);
    expect(n).toBe(1);
  });

  it('restore is chainable', () => {
    const snap = container.snapshot();

    expect(container.restore(snap)).toBe(container);
  });
});

// ─── Dispose Lifecycle ────────────────────────────────────────────────────────

describe('Container - Dispose Lifecycle', () => {
  it('calls dispose hook on each resolved singleton; container is unusable after', async () => {
    const log: string[] = [];
    const A = createToken<object>('A');
    const B = createToken<object>('B');
    const container = createContainer();

    container.register(A, {
      dispose: () => {
        log.push('A');
      },
      useFactory: () => ({}),
    });
    container.register(B, {
      dispose: () => {
        log.push('B');
      },
      useFactory: () => ({}),
    });

    container.get(A);
    container.get(B);
    await container.dispose();

    expect(log).toContain('A');
    expect(log).toContain('B');
    expect(container.disposed).toBe(true);
    expect(() => container.get(A)).toThrow(ContainerDisposedError);
  });

  it('dispose() is idempotent — calling it multiple times is safe', async () => {
    const log: string[] = [];
    const token = createToken<object>('T');
    const container = createContainer();

    container.register(token, {
      dispose: () => {
        log.push('disposed');
      },
      useFactory: () => ({}),
    });
    container.get(token);

    await container.dispose();
    await container.dispose();

    expect(log).toHaveLength(1);
  });

  it('skips dispose hook if the instance was never resolved', async () => {
    const log: string[] = [];
    const token = createToken<object>('S');
    const container = createContainer();

    container.register(token, {
      dispose: () => {
        log.push('called');
      },
      useFactory: () => ({}),
    });

    await container.dispose();

    expect(log).toHaveLength(0);
  });

  it('supports async dispose hooks', async () => {
    const log: string[] = [];
    const token = createToken<object>('S');
    const container = createContainer();

    container.register(token, {
      dispose: async () => {
        await new Promise((r) => setTimeout(r, 5));
        log.push('async');
      },
      useFactory: () => ({}),
    });

    container.get(token);
    await container.dispose();

    expect(log).toEqual(['async']);
  });

  it('transient instances are not cached, so dispose hook is never called', async () => {
    const log: string[] = [];
    const token = createToken<object>('T');
    const container = createContainer();

    container.register(token, {
      dispose: () => {
        log.push('called');
      },
      lifetime: 'transient',
      useFactory: () => ({}),
    });

    container.get(token);
    container.get(token);
    await container.dispose();

    expect(log).toHaveLength(0);
  });

  it('clear() removes all registrations without invoking dispose hooks', async () => {
    const log: string[] = [];
    const token = createToken<object>('S');
    const container = createContainer();

    container.register(token, {
      dispose: () => {
        log.push('called');
      },
      useFactory: () => ({}),
    });

    container.get(token);
    container.clear();

    expect(log).toHaveLength(0);
    expect(container.has(token)).toBe(false);
  });
});

// ─── Debug ────────────────────────────────────────────────────────────────────

describe('Container - Debug', () => {
  it('lists token descriptions, alias pairs, and falls back to "anonymous"', () => {
    const container = createContainer();
    const A = createToken('Alpha');
    const B = createToken('Beta');
    const Alias = createToken('MyAlias');
    const Anon = Symbol() as Token;

    container.value(A, 'a').value(B, 'b').value(Anon, 'x').alias(Alias, A);

    const { aliases, tokens } = container.debug();

    expect(tokens).toContain('Alpha');
    expect(tokens).toContain('Beta');
    expect(tokens).toContain('anonymous');
    expect(aliases).toContainEqual(['MyAlias', 'Alpha']);
  });

  it('includes tokens and aliases inherited from parent containers, child overrides win', () => {
    const parent = createContainer();
    const ParentOnly = createToken<string>('ParentOnly');
    const Shared = createToken<string>('Shared');
    const Iface = createToken<string>('Iface');
    const ImplA = createToken<string>('ImplA');
    const ImplB = createToken<string>('ImplB');

    parent.value(ParentOnly, 'p').value(Shared, 'parent-shared').value(ImplA, 'a').alias(Iface, ImplA);

    const child = parent.createChild();

    child.value(Shared, 'child-shared').value(ImplB, 'b').alias(Iface, ImplB);

    const { aliases, tokens } = child.debug();

    // Own + inherited tokens
    expect(tokens).toContain('ParentOnly');
    expect(tokens).toContain('Shared');
    // Child alias for Iface wins over parent's
    expect(aliases).toContainEqual(['Iface', 'ImplB']);
    expect(aliases).not.toContainEqual(['Iface', 'ImplA']);
  });
});

// ─── createTestContainer ──────────────────────────────────────────────────────

describe('createTestContainer', () => {
  it('returns an isolated child container; dispose() runs hooks and marks it disposed', async () => {
    const log: string[] = [];
    const { container, dispose } = createTestContainer();
    const token = createToken<object>('T');

    container.factory(token, () => ({}), {
      dispose: () => {
        log.push('disposed');
      },
    });
    container.get(token);

    await dispose();

    expect(log).toEqual(['disposed']);
    expect(container.disposed).toBe(true);
  });

  it('inherits registrations from the provided base container', () => {
    const base = createContainer();
    const token = createToken<string>('Base');

    base.value(token, 'base-val');

    const { container } = createTestContainer(base);

    expect(container.get(token)).toBe('base-val');
  });

  it('child registrations are isolated from the base', async () => {
    const base = createContainer();
    const token = createToken<string>('T');

    base.value(token, 'base-val');

    const { container, dispose } = createTestContainer(base);

    container.value(token, 'test-val');
    await dispose();

    expect(base.get(token)).toBe('base-val');
  });
});

// ─── Disposed Container ───────────────────────────────────────────────────────

describe('Container - Disposed', () => {
  it('get/getAsync/has throw ContainerDisposedError after dispose()', async () => {
    const token = createToken<string>('T');
    const container = createContainer();

    container.value(token, 'val');
    await container.dispose();

    expect(() => container.get(token)).toThrow(ContainerDisposedError);
    await expect(container.getAsync(token)).rejects.toThrow(ContainerDisposedError);
    expect(() => container.has(token)).toThrow(ContainerDisposedError);
  });

  it('register/factory/bind/alias/unregister throw after dispose()', async () => {
    const token = createToken<string>('T');
    const container = createContainer();

    await container.dispose();

    expect(() => container.register(token, { useValue: 'x' })).toThrow(ContainerDisposedError);
    expect(() => container.factory(token, () => 'x')).toThrow(ContainerDisposedError);
    expect(() => container.bind(token, class {})).toThrow(ContainerDisposedError);
    expect(() => container.alias(token, token)).toThrow(ContainerDisposedError);
    expect(() => container.unregister(token)).toThrow(ContainerDisposedError);
  });

  it('createChild() throws after dispose()', async () => {
    const container = createContainer();

    await container.dispose();

    expect(() => container.createChild()).toThrow(ContainerDisposedError);
  });
});

// ─── getAll / getAllAsync ──────────────────────────────────────────────────────────

describe('Container - getAll / getAllAsync', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('getAll() resolves multiple tokens as a typed tuple', () => {
    const A = createToken<string>('A');
    const B = createToken<number>('B');
    const C = createToken<boolean>('C');

    container.value(A, 'hello').value(B, 42).value(C, true);

    const result = container.getAll([A, B, C]);

    // Verify values
    expect(result[0]).toBe('hello');
    expect(result[1]).toBe(42);
    expect(result[2]).toBe(true);

    // Verify TypeScript infers the correct tuple type
    const typed: TokenValues<[typeof A, typeof B, typeof C]> = result;

    expect(typed).toBeDefined();
  });

  it('getAll() propagates errors from individual get() calls', () => {
    const A = createToken<string>('A');
    const Missing = createToken<string>('Missing');

    container.value(A, 'val');

    expect(() => container.getAll([A, Missing])).toThrow(ProviderNotFoundError);
  });

  it('getAllAsync() resolves multiple tokens as a typed tuple', async () => {
    const A = createToken<string>('A');
    const B = createToken<number>('B');

    container.factory(A, async () => 'async-val');
    container.value(B, 99);

    const [a, b] = await container.getAllAsync([A, B]);

    expect(a).toBe('async-val');
    expect(b).toBe(99);
  });

  it('getAllAsync() resolves all tokens concurrently', async () => {
    const order: number[] = [];
    const A = createToken<number>('A');
    const B = createToken<number>('B');

    container.factory(A, async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);

      return 1;
    });
    container.factory(B, async () => {
      order.push(2);

      return 2;
    });

    const [a, b] = await container.getAllAsync([A, B]);

    expect(a).toBe(1);
    expect(b).toBe(2);
    // B resolved before A (no sequential waiting)
    expect(order).toEqual([2, 1]);
  });
});

// ─── mock ──────────────────────────────────────────────────────────────────────

describe('Container - mock', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('replaces registration during fn, then restores the original', async () => {
    const token = createToken<string>('S');

    container.value(token, 'original');

    const result = await container.mock(token, 'mocked', () => container.get(token));

    expect(result).toBe('mocked');
    expect(container.get(token)).toBe('original');
  });

  it('accepts a full Provider<T> as the mock', async () => {
    const token = createToken<string>('S');

    container.value(token, 'original');

    const result = await container.mock(token, { useFactory: () => 'factory-mock' }, () => container.get(token));

    expect(result).toBe('factory-mock');
    expect(container.get(token)).toBe('original');
  });

  it('restores original even when fn throws', async () => {
    const token = createToken<string>('S');

    container.value(token, 'original');

    await expect(
      container.mock(token, 'mocked', () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(container.get(token)).toBe('original');
  });

  it('token is absent after mock if it was not registered before', async () => {
    const token = createToken<string>('S');

    await container.mock(token, 'temp', () => {
      expect(container.get(token)).toBe('temp');
    });

    expect(container.has(token)).toBe(false);
  });

  it('preserves the cached singleton instance through mock/restore', async () => {
    let n = 0;

    class Svc {
      constructor() {
        n++;
      }
      getValue() {
        return 'real';
      }
    }

    const token = createToken<Svc>('S');

    container.register(token, { useClass: Svc });

    const original = container.get(token); // n = 1

    await container.mock(token, { getValue: () => 'mock' } as any, () => {
      expect(container.get(token).getValue()).toBe('mock');
    });

    expect(container.get(token)).toBe(original);
    expect(n).toBe(1);
  });
});
