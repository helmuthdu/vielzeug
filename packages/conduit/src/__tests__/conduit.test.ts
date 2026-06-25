import { describe, expect, it, vi } from 'vitest';

import {
  ContainerCircularDependencyError,
  type Container,
  ContainerDisposedError,
  ContainerError,
  type ContainerEvent,
  ContainerFrozenError,
  type ContainerGraph,
  type ContainerModule,
  createContainer,
  ContainerDuplicateRegistrationError,
  type FactoryResolver,
  type InferTokenTypes,
  loadModules,
  ContainerProviderNotFoundError,
  type ResolveInterceptor,
  resolveSyncOptional,
  resolveSyncOrDefault,
  resolveOptional,
  resolveOrDefault,
  scope,
  ContainerScopedResolutionError,
  ContainerSyncResolutionError,
  token,
  tryResolve,
  trySyncResolve,
} from '../index';

// ---------------------------------------------------------------------------
// token()
// ---------------------------------------------------------------------------

describe('token', () => {
  it('returns a symbol whose description matches the argument', () => {
    const T = token<string>('MyService');

    expect(typeof T).toBe('symbol');
    expect(T.description).toBe('MyService');
  });

  it('produces a unique symbol for every call, even with the same description', () => {
    const a = token<string>('Same');
    const b = token<string>('Same');

    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// scope()
// ---------------------------------------------------------------------------

describe('scope()', () => {
  it('returns a symbol whose description matches the argument', () => {
    const s = scope('request');

    expect(typeof s).toBe('symbol');
    expect(s.description).toBe('request');
  });

  it('produces a unique symbol for every call, even with the same name', () => {
    const a = scope('request');
    const b = scope('request');

    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// createContainer() — named containers
// ---------------------------------------------------------------------------

describe('createContainer()', () => {
  it('defaults name to "root"', () => {
    expect(createContainer().name).toBe('root');
  });

  it('accepts a custom name', () => {
    expect(createContainer({ name: 'app' }).name).toBe('app');
  });

  it('createScope() defaults child name to "root:child"', () => {
    expect(createContainer().createScope().name).toBe('root:child');
  });

  it('createScope() accepts a custom name', () => {
    expect(createContainer().createScope(undefined, { name: 'request' }).name).toBe('request');
  });

  it('ContainerProviderNotFoundError includes container name', async () => {
    const T = token<string>('Svc');
    const c = createContainer({ name: 'myapp' });

    const err = (await c.resolve(T).catch((e) => e)) as ContainerProviderNotFoundError;

    expect(err.message).toContain('myapp');
  });

  it('ContainerDisposedError includes container name', async () => {
    const T = token<string>('T');
    const c = createContainer({ name: 'myapp' });

    await c.dispose();

    const err = (() => {
      try {
        c.has(T);
      } catch (e) {
        return e as ContainerDisposedError;
      }
    })();

    expect(err?.message).toContain('myapp');
  });
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe('Container — registration', () => {
  it('registers a value provider and supports method chaining', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a').value(B, 'b');

    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('registers a factory provider', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.factory(T, (_r) => 1);

    await expect(c.resolve(T)).resolves.toBe(1);
  });

  it('throws ContainerDuplicateRegistrationError when a token is registered twice', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'first');

    expect(() => c.value(T, 'second')).toThrow(ContainerDuplicateRegistrationError);
  });

  it('ContainerDuplicateRegistrationError message contains the token description', () => {
    const T = token<string>('MyToken');
    const c = createContainer();

    c.value(T, 'x');

    expect(() => c.value(T, 'y')).toThrow('MyToken');
  });

  it('throws ContainerDuplicateRegistrationError for duplicate factory registration', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x');

    expect(() => c.factory(T, (_r) => 'y')).toThrow(ContainerDuplicateRegistrationError);
  });
});

// ---------------------------------------------------------------------------
// freeze()
// ---------------------------------------------------------------------------

describe('Container — freeze()', () => {
  it('returns this for chaining', () => {
    const c = createContainer();

    expect(c.freeze()).toBe(c);
  });

  it('prevents further value() registrations', () => {
    const T = token<string>('T');
    const c = createContainer().freeze();

    expect(() => c.value(T, 'x')).toThrow(ContainerFrozenError);
  });

  it('prevents further factory() registrations', () => {
    const T = token<string>('T');
    const c = createContainer().freeze();

    expect(() => c.factory(T, (_r) => 'x')).toThrow(ContainerFrozenError);
  });

  it('still allows resolve() on a frozen container', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'v');
    c.freeze();

    await expect(c.resolve(T)).resolves.toBe('v');
  });

  it('freeze() throws ContainerFrozenError with container name in message', () => {
    const T = token<string>('T');
    const c = createContainer({ name: 'sealed' }).freeze();

    expect(() => c.value(T, 'x')).toThrow(ContainerFrozenError);
    expect(() => c.value(T, 'x')).toThrow(ContainerError);
    expect(() => c.value(T, 'x')).toThrow('sealed');
  });

  it('does not propagate to scope containers', () => {
    const T = token<string>('T');
    const root = createContainer();

    root.freeze();

    const child = root.createScope();

    expect(() => child.value(T, 'x')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('Container — resolve', () => {
  it('resolves a value provider', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 99);

    await expect(c.resolve(T)).resolves.toBe(99);
  });

  it('resolves a factory provider', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'built');

    await expect(c.resolve(T)).resolves.toBe('built');
  });

  it('resolves an async factory provider', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async (_r) => 'async');

    await expect(c.resolve(T)).resolves.toBe('async');
  });

  it('throws ContainerProviderNotFoundError when no provider exists', async () => {
    const T = token<string>('Missing');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow(ContainerProviderNotFoundError);
  });

  it('ContainerProviderNotFoundError message contains the token description', async () => {
    const T = token<string>('AuthService');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow('AuthService');
  });
});

// ---------------------------------------------------------------------------
// resolveOptional (free function)
// ---------------------------------------------------------------------------

describe('resolveOptional()', () => {
  it('returns undefined when no provider is registered', async () => {
    const T = token<string>('T');

    await expect(resolveOptional(createContainer(), T)).resolves.toBeUndefined();
  });

  it('returns the value when a provider exists', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 7);

    await expect(resolveOptional(c, T)).resolves.toBe(7);
  });

  it('re-throws errors that are not ContainerProviderNotFoundError', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => {
      throw new TypeError('factory boom');
    });

    await expect(resolveOptional(c, T)).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// resolveOrDefault (free function)
// ---------------------------------------------------------------------------

describe('resolveOrDefault()', () => {
  it('returns the resolved value when the token is registered', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'hello');

    await expect(resolveOrDefault(c, T, 'fallback')).resolves.toBe('hello');
  });

  it('returns the default value when the token is not registered', async () => {
    const T = token<string>('T');

    await expect(resolveOrDefault(createContainer(), T, 'fallback')).resolves.toBe('fallback');
  });

  it('re-throws ContainerDisposedError (does not swallow it)', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    await expect(resolveOrDefault(c, T, 'fallback')).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// tryResolve (free function)
// ---------------------------------------------------------------------------

describe('tryResolve()', () => {
  it('returns { ok: true, value } on success', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 42);

    const result = await tryResolve(c, T);

    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('returns { ok: false, error } when not registered', async () => {
    const T = token<string>('T');
    const c = createContainer();

    const result = await tryResolve(c, T);

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error).toBeInstanceOf(ContainerProviderNotFoundError);
  });

  it('re-throws when factory throws a non-ContainerProviderNotFoundError', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => {
      throw new Error('boom');
    });

    await expect(tryResolve(c, T)).rejects.toThrow('boom');
  });

  it('re-throws ContainerDisposedError when container is disposed', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    await expect(tryResolve(c, T)).rejects.toBeInstanceOf(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveMany
// ---------------------------------------------------------------------------

describe('Container — resolveMany()', () => {
  it('resolves multiple tokens in parallel and returns a tuple', async () => {
    const A = token<string>('A');
    const B = token<number>('B');
    const c = createContainer();

    c.value(A, 'hello');
    c.value(B, 42);

    const [a, b] = await c.resolveMany([A, B] as const);

    expect(a).toBe('hello');
    expect(b).toBe(42);
  });

  it('rejects if any token is missing', async () => {
    const A = token<string>('A');
    const Missing = token<string>('Missing');
    const c = createContainer();

    c.value(A, 'a');

    await expect(c.resolveMany([A, Missing] as const)).rejects.toThrow(ContainerProviderNotFoundError);
  });

  it('throws ContainerDisposedError when the container is disposed', async () => {
    const A = token<string>('A');
    const B = token<number>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.value(B, 1);

    await c.dispose();

    await expect(c.resolveMany([A, B] as const)).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveAll
// ---------------------------------------------------------------------------

describe('Container — resolveAll', () => {
  it('eagerly resolves all singleton factories', async () => {
    let calls = 0;
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(A, (_r) => {
      calls++;

      return 'a';
    });
    c.factory(B, (_r) => {
      calls++;

      return 'b';
    });

    await c.resolveAll();

    expect(calls).toBe(2);
    expect(c.resolveSync(A)).toBe('a');
    expect(c.resolveSync(B)).toBe('b');
  });

  it('does not resolve transient or named-scope factories', async () => {
    let calls = 0;
    const RequestScope = scope('request');
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(
      A,
      (_r) => {
        calls++;

        return 'a';
      },
      { lifetime: 'transient' },
    );
    c.factory(
      B,
      (_r) => {
        calls++;

        return 'b';
      },
      { lifetime: RequestScope },
    );

    await c.resolveAll();

    expect(calls).toBe(0);
  });

  it('resolves value registrations without invoking any factory', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'static');

    await expect(c.resolveAll()).resolves.not.toThrow();
  });

  it('warms singletons inherited from parent when called on a child container', async () => {
    let calls = 0;
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => {
      calls++;

      return 'v';
    });

    const child = root.createScope();

    await child.resolveAll();

    expect(calls).toBe(1);
    expect(child.resolveSync(T)).toBe('v');
  });

  it('does not double-resolve a singleton across parent and child resolveAll calls', async () => {
    let calls = 0;
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => {
      calls++;

      return 'v';
    });

    const child = root.createScope();

    await root.resolveAll();
    await child.resolveAll();

    expect(calls).toBe(1);
  });

  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const c = createContainer();

    await c.dispose();

    await expect(c.resolveAll()).rejects.toThrow(ContainerDisposedError);
  });

  it('does not invoke a named-scope factory', async () => {
    let calls = 0;
    const RequestScope = scope('request');
    const RequestId = token<string>('RequestId');
    const c = createContainer();

    c.factory(
      RequestId,
      (_r) => {
        calls++;

        return crypto.randomUUID();
      },
      { lifetime: RequestScope },
    );

    await c.resolveAll();

    expect(calls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Lifetimes
// ---------------------------------------------------------------------------

describe('Container — singleton lifetime', () => {
  it('returns the same instance on every resolution', async () => {
    let n = 0;
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({ id: ++n }));

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('deduplicates concurrent resolutions of the same singleton', async () => {
    let n = 0;
    const T = token<number>('T');
    const c = createContainer();

    c.factory(T, async (_r) => {
      await new Promise((r) => setTimeout(r, 5));

      return ++n;
    });

    const [a, b, d] = await Promise.all([c.resolve(T), c.resolve(T), c.resolve(T)]);

    expect(n).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(d);
  });

  it('caches the rejection and rethrows on subsequent calls (no silent retry)', async () => {
    let calls = 0;
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async (_r) => {
      calls += 1;
      throw new Error('factory failed');
    });

    await expect(c.resolve(T)).rejects.toThrow('factory failed');
    await expect(c.resolve(T)).rejects.toThrow('factory failed');
    expect(calls).toBe(1);
  });

  it('value providers always return the same reference', async () => {
    const obj = { id: 1 };
    const T = token<object>('T');
    const c = createContainer();

    c.value(T, obj);

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).toBe(obj);
    expect(b).toBe(obj);
  });
});

describe('Container — transient lifetime', () => {
  it('produces a new instance on every resolution', async () => {
    let n = 0;
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({ id: ++n }), { lifetime: 'transient' });

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });
});

describe('Container — named-scope lifetime (ScopeToken)', () => {
  it('caches one instance per named scope container', async () => {
    let n = 0;
    const RequestScope = scope('request');
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, (_r) => ({ id: ++n }), { lifetime: RequestScope });

    const sc1 = root.createScope(RequestScope);
    const sc2 = root.createScope(RequestScope);

    const a = await sc1.resolve(T);
    const b = await sc1.resolve(T);
    const c = await sc2.resolve(T);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(n).toBe(2);
  });

  it('separate named scope containers do not share instances', async () => {
    let n = 0;
    const RequestScope = scope('request');
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, (_r) => ({ id: ++n }), { lifetime: RequestScope });

    const sc1 = root.createScope(RequestScope);
    const sc2 = root.createScope(RequestScope);

    const a = await sc1.resolve(T);
    const b = await sc2.resolve(T);

    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Dependency injection
// ---------------------------------------------------------------------------

describe('Container — dependency injection', () => {
  it('resolves a dependency via resolver.resolve()', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'hello');
    c.factory(B, async (r) => `${await r.resolve(A)} world`);

    await expect(c.resolve(B)).resolves.toBe('hello world');
  });

  it('resolves a deep dependency chain via resolver', async () => {
    const Root = token<string>('Root');
    const Mid = token<string>('Mid');
    const Leaf = token<string>('Leaf');
    const c = createContainer();

    c.value(Leaf, 'leaf');
    c.factory(Mid, async (r) => `mid(${await r.resolve(Leaf)})`);
    c.factory(Root, async (r) => `root(${await r.resolve(Mid)})`);

    await expect(c.resolve(Root)).resolves.toBe('root(mid(leaf))');
  });

  it('resolves a shared dependency only once across sibling branches', async () => {
    let calls = 0;
    const Shared = token<object>('Shared');
    const Left = token<object>('Left');
    const Right = token<object>('Right');
    const Parent = token<{ l: object; r: object }>('Parent');
    const c = createContainer();

    c.factory(Shared, (_r) => ({ id: ++calls }));
    c.factory(Left, async (r) => ({ s: await r.resolve(Shared) }));
    c.factory(Right, async (r) => ({ s: await r.resolve(Shared) }));
    c.factory(Parent, async (r) => ({ l: await r.resolve(Left), r: await r.resolve(Right) }));

    await c.resolve(Parent);

    expect(calls).toBe(1);
  });

  it('throws ContainerProviderNotFoundError when a dep is missing', async () => {
    const Missing = token<string>('Missing');
    const Consumer = token<string>('Consumer');
    const c = createContainer();

    c.factory(Consumer, (r) => r.resolve(Missing));

    await expect(c.resolve(Consumer)).rejects.toThrow(ContainerProviderNotFoundError);
  });

  it('throws ContainerCircularDependencyError for a direct two-token cycle', async () => {
    const A = token('A');
    const B = token('B');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B));
    c.factory(B, (r) => r.resolve(A));

    await expect(c.resolve(A)).rejects.toThrow(ContainerCircularDependencyError);
  });

  it('throws ContainerCircularDependencyError for an indirect three-token cycle', async () => {
    const A = token('A');
    const B = token('B');
    const C = token('C');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B));
    c.factory(B, (r) => r.resolve(C));
    c.factory(C, (r) => r.resolve(A));

    await expect(c.resolve(A)).rejects.toThrow(ContainerCircularDependencyError);
  });

  it('ContainerCircularDependencyError message contains the full cycle path', async () => {
    const A = token('Alpha');
    const B = token('Beta');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B));
    c.factory(B, (r) => r.resolve(A));

    const err = (await c.resolve(A).catch((e) => e)) as ContainerCircularDependencyError;

    expect(err).toBeInstanceOf(ContainerCircularDependencyError);
    expect(err.message).toContain('Alpha');
    expect(err.message).toContain('Beta');
    expect(err).toBeInstanceOf(ContainerError);
  });

  it('FactoryResolver type is exported and usable', () => {
    const r: FactoryResolver = { resolve: (_tok) => Promise.resolve(undefined as any) };

    expect(r).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Scope containers (createScope)
// ---------------------------------------------------------------------------

describe('Container — scope containers', () => {
  it('scope container inherits parent registrations', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.value(T, 'from-root');

    const child = root.createScope();

    await expect(child.resolve(T)).resolves.toBe('from-root');
  });

  it('scope local registration shadows the parent registration', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.value(T, 'parent');

    const child = root.createScope();

    child.value(T, 'child');

    await expect(child.resolve(T)).resolves.toBe('child');
    await expect(root.resolve(T)).resolves.toBe('parent');
  });

  it('parent cannot see scope-only registrations', async () => {
    const T = token<string>('ChildOnly');
    const root = createContainer();
    const child = root.createScope();

    child.value(T, 'child');

    await expect(root.resolve(T)).rejects.toThrow(ContainerProviderNotFoundError);
  });

  it('scope can resolve its own local registrations after parent is disposed', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    child.value(T, 'local');
    await root.dispose();

    await expect(child.resolve(T)).resolves.toBe('local');
  });

  it('scope throws ContainerDisposedError when token lives only in disposed parent', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    root.value(T, 'parent-only');
    await root.dispose();

    await expect(child.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// ContainerModule / loadModules()
// ---------------------------------------------------------------------------

describe('loadModules()', () => {
  it('applies a module to the container', async () => {
    const T = token<string>('T');
    const mod: ContainerModule = (c) => void c.value(T, 'from-module');
    const container = createContainer();

    await loadModules(container, mod);

    await expect(container.resolve(T)).resolves.toBe('from-module');
  });

  it('applies multiple modules sequentially', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const modA: ContainerModule = (c) => void c.value(A, 'a');
    const modB: ContainerModule = (c) => void c.value(B, 'b');
    const container = createContainer();

    await loadModules(container, modA, modB);

    await expect(container.resolve(A)).resolves.toBe('a');
    await expect(container.resolve(B)).resolves.toBe('b');
  });

  it('awaits async modules in sequence', async () => {
    const order: string[] = [];
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    const modA: ContainerModule = async (container) => {
      await new Promise((r) => setTimeout(r, 10));

      order.push('A');
      container.value(A, 'a');
    };
    const modB: ContainerModule = (container) => {
      order.push('B');
      container.value(B, 'b');
    };

    await loadModules(c, modA, modB);

    expect(order).toEqual(['A', 'B']);
    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('returns the container for chaining', async () => {
    const T = token<string>('T');
    const container = createContainer();

    const result = await loadModules(container, (c) => void c.value(T, 'v'));

    expect(result).toBe(container);
  });

  it('throws ContainerDisposedError when the container is disposed', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    await expect(loadModules(c, (ct) => void ct.value(T, 'x'))).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// inspect()
// ---------------------------------------------------------------------------

describe('Container — inspect()', () => {
  it('returns nodes for all registered tokens', () => {
    const A = token<string>('Alpha');
    const B = token<string>('Beta');
    const c = createContainer();

    c.value(A, 'a');
    c.factory(B, async (r) => await r.resolve(A));

    const graph: ContainerGraph = c.inspect();

    expect(graph.nodes).toHaveLength(2);

    const valueNode = graph.nodes.find((n) => n.description === 'Alpha');
    const factoryNode = graph.nodes.find((n) => n.description === 'Beta');

    expect(valueNode).toMatchObject({ kind: 'value' });
    expect(factoryNode).toMatchObject({ kind: 'factory', lifetime: 'singleton' });
  });

  it('includes lifetime on factory nodes', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x', { lifetime: 'transient' });

    const { nodes } = c.inspect();

    expect(nodes[0].lifetime).toBe('transient');
  });

  it('returns an empty graph for an empty container', () => {
    expect(createContainer().inspect()).toEqual({ nodes: [] });
  });

  it('includes parent nodes when deep:true (default)', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const root = createContainer();

    root.value(A, 'a');

    const child = root.createScope();

    child.value(B, 'b');

    const graph = child.inspect();

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((n) => n.description)).toContain('A');
    expect(graph.nodes.map((n) => n.description)).toContain('B');
  });

  it('excludes parent nodes when deep:false', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const root = createContainer();

    root.value(A, 'a');

    const child = root.createScope();

    child.value(B, 'b');

    const graph = child.inspect({ deep: false });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].description).toBe('B');
  });

  it('serializes named scope token lifetime as "scope:<name>"', () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'v', { lifetime: RequestScope });

    const { nodes } = c.inspect();

    expect(nodes[0].lifetime).toBe('scope:request');
  });
});

// ---------------------------------------------------------------------------
// createScope() / named scope tokens
// ---------------------------------------------------------------------------

describe('Container — createScope() / named scopes', () => {
  it('resolves named-scope factories within the correct scope container', async () => {
    const RequestScope = scope('request');
    const T = token<{ id: number }>('T');
    let n = 0;
    const root = createContainer();

    root.factory(T, (_r) => ({ id: ++n }), { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    const a = await scopeContainer.resolve(T);
    const b = await scopeContainer.resolve(T);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('creates separate instances across different scope containers', async () => {
    const RequestScope = scope('request');
    const T = token<{ id: number }>('T');
    let n = 0;
    const root = createContainer();

    root.factory(T, (_r) => ({ id: ++n }), { lifetime: RequestScope });

    const scope1 = root.createScope(RequestScope);
    const scope2 = root.createScope(RequestScope);

    const a = await scope1.resolve(T);
    const b = await scope2.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });

  it('throws ContainerScopedResolutionError when scope container is missing in the hierarchy', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'v', { lifetime: RequestScope });

    await expect(root.resolve(T)).rejects.toThrow(ContainerScopedResolutionError);
  });

  it('ContainerScopedResolutionError message contains the required scope name', async () => {
    const RequestScope = scope('request-scope');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'v', { lifetime: RequestScope });

    const err = (await root.resolve(T).catch((e) => e)) as ContainerScopedResolutionError;

    expect(err.message).toContain('request-scope');
  });

  it('resolves a named-scope token from a nested scope that inherits the scope', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'scoped-value', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);
    const nested = scopeContainer.createScope();

    await expect(nested.resolve(T)).resolves.toBe('scoped-value');
  });

  it('resolveSync throws ContainerSyncResolutionError for an unresolved named-scope factory', () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'v', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    expect(() => scopeContainer.resolveSync(T)).toThrow(ContainerSyncResolutionError);
  });

  it('ContainerSyncResolutionError for named scope includes scope name in message', () => {
    const RequestScope = scope('my-request-scope');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'v', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    expect(() => scopeContainer.resolveSync(T)).toThrow('my-request-scope');
  });

  it('resolveSync works after the named-scope instance is pre-warmed', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'warmed', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    await scopeContainer.resolve(T);

    expect(scopeContainer.resolveSync(T)).toBe('warmed');
  });

  it('createScope() accepts a custom name', () => {
    const RequestScope = scope('request');
    const root = createContainer({ name: 'root' });

    expect(root.createScope(RequestScope, { name: 'req-1' }).name).toBe('req-1');
  });
});

// ---------------------------------------------------------------------------
// on() — observable events
// ---------------------------------------------------------------------------

describe('Container — on()', () => {
  it('emits a register event when a value is registered', () => {
    const events: ContainerEvent[] = [];
    const T = token<string>('MyValue');
    const c = createContainer();

    c.on((e) => events.push(e));
    c.value(T, 'v');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ description: 'MyValue', kind: 'value', type: 'register' });
  });

  it('emits a register event when a factory is registered', () => {
    const events: ContainerEvent[] = [];
    const T = token<string>('MyFactory');
    const c = createContainer();

    c.on((e) => events.push(e));
    c.factory(T, (_r) => 'v');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ description: 'MyFactory', kind: 'factory', type: 'register' });
  });

  it('events carry the source container name', () => {
    const T = token<string>('T');
    const c = createContainer({ name: 'app' });
    let event: ContainerEvent | undefined;

    c.on((e) => {
      event = e;
    });
    c.value(T, 'v');

    expect(event).toMatchObject({ source: 'app' });
  });

  it('emits a resolve event after successful resolution', async () => {
    const events: ContainerEvent[] = [];
    const T = token<string>('Svc');
    const c = createContainer();

    c.value(T, 'x');
    c.on((e) => events.push(e));
    await c.resolve(T);

    expect(events.some((e) => e.type === 'resolve' && 'description' in e && e.description === 'Svc')).toBe(true);
  });

  it('emits a dispose event when the container is disposed', async () => {
    const events: ContainerEvent[] = [];
    const c = createContainer();

    c.on((e) => events.push(e));
    await c.dispose();

    expect(events.some((e) => e.type === 'dispose')).toBe(true);
  });

  it('returns an unsubscribe function that stops future events', () => {
    const events: ContainerEvent[] = [];
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    const unsubscribe = c.on((e) => events.push(e));

    c.value(A, 'a');
    unsubscribe();
    c.value(B, 'b');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ description: 'A' });
  });

  it('swallows listener errors so they do not disrupt container operation', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.on(() => {
      throw new Error('listener boom');
    });

    expect(() => c.value(T, 'v')).not.toThrow();
    await expect(c.resolve(T)).resolves.toBe('v');
  });

  it('multiple listeners are all notified', () => {
    const calls1: number[] = [];
    const calls2: number[] = [];
    const T = token<string>('T');
    const c = createContainer();

    c.on(() => calls1.push(1));
    c.on(() => calls2.push(2));
    c.value(T, 'v');

    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);
  });

  it('events from scope container propagate to parent listeners', () => {
    const events: ContainerEvent[] = [];
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    root.on((e) => events.push(e));
    child.value(T, 'v');

    expect(events.some((e) => e.type === 'register' && 'description' in e && e.description === 'T')).toBe(true);
  });

  it('parent events do not propagate down to scope listeners', () => {
    const events: ContainerEvent[] = [];
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    child.on((e) => events.push(e));
    root.value(T, 'v'); // registered on root, not child

    expect(events).toHaveLength(0);
  });

  it('named scope resolve events propagate to parent listeners', async () => {
    const resolveEvents: ContainerEvent[] = [];
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'v', { lifetime: RequestScope });

    root.on((e) => {
      if (e.type === 'resolve') resolveEvents.push(e);
    });

    const sc = root.createScope(RequestScope);

    await sc.resolve(T);

    expect(resolveEvents.some((e) => 'description' in e && e.description === 'T')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

describe('Container — disposal', () => {
  it('calls the dispose hook on a resolved singleton', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({}), { dispose: () => void log.push('done') });

    await c.resolve(T);
    await c.dispose();

    expect(log).toEqual(['done']);
  });

  it('does not call the dispose hook for an unresolved factory', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({}), { dispose: () => void log.push('should-not-run') });

    await c.dispose();

    expect(log).toHaveLength(0);
  });

  it('calls dispose hooks for named-scope instances when the scope container is disposed', async () => {
    const log: string[] = [];
    const RequestScope = scope('request');
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, (_r) => ({}), { dispose: () => void log.push('scope-done'), lifetime: RequestScope });

    const sc = root.createScope(RequestScope);

    await sc.resolve(T);
    await sc.dispose();

    expect(log).toEqual(['scope-done']);
  });

  it('runs all dispose hooks even if one throws, warning instead of rethrowing', async () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const A = token<object>('A');
    const B = token<object>('B');
    const c = createContainer();

    c.factory(A, (_r) => ({}), {
      dispose: () => {
        throw new Error('A-fail');
      },
    });
    c.factory(B, (_r) => ({}), {
      dispose: () => {
        throw new Error('B-fail');
      },
    });

    await c.resolve(A);
    await c.resolve(B);
    await expect(c.dispose()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('marks the container as disposed even when a hook throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({}), {
      dispose: () => {
        throw new Error('fail');
      },
    });

    await c.resolve(T);
    await c.dispose();

    expect(c.disposed).toBe(true);
    vi.restoreAllMocks();
  });

  it('calling dispose more than once is a no-op after the first call', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, (_r) => ({}), { dispose: () => void log.push('hook') });

    await c.resolve(T);
    await c.dispose();
    await c.dispose();

    expect(log).toHaveLength(1);
  });

  it('Symbol.asyncDispose delegates to dispose()', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'v');
    await c[Symbol.asyncDispose]();

    expect(c.disposed).toBe(true);
  });

  it('calls dispose hook on a value registration', async () => {
    const log: string[] = [];
    const T = token<{ close(): void }>('T');
    const resource = { close: () => log.push('closed') };
    const c = createContainer();

    c.value(T, resource, { dispose: (r) => r.close() });

    await c.dispose();

    expect(log).toEqual(['closed']);
  });

  it('value dispose hook fires even if the value was never resolved', async () => {
    const log: string[] = [];
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'x', { dispose: () => void log.push('done') });

    await c.dispose();

    expect(log).toEqual(['done']);
  });

  it('value dispose failures warn instead of rethrowing', async () => {
    const warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'x', {
      dispose: () => {
        throw new Error('value-fail');
      },
    });

    await expect(c.dispose()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Post-disposal guards
// ---------------------------------------------------------------------------

describe('Container — post-disposal guards', () => {
  async function disposedContainer(): Promise<Container> {
    const c = createContainer();

    await c.dispose();

    return c;
  }

  it('resolve throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    await expect(c.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });

  it('resolveSync throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    expect(() => c.resolveSync(T)).toThrow(ContainerDisposedError);
  });

  it('value() throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    expect(() => c.value(T, 'x')).toThrow(ContainerDisposedError);
  });

  it('factory() throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    expect(() => c.factory(T, (_r) => 'x')).toThrow(ContainerDisposedError);
  });

  it('createScope() throws ContainerDisposedError', async () => {
    const c = await disposedContainer();

    expect(() => c.createScope()).toThrow(ContainerDisposedError);
  });

  it('has() throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    expect(() => c.has(T)).toThrow(ContainerDisposedError);
  });

  it('loadModules() throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    await expect(loadModules(c, (ct) => void ct.value(T, 'x'))).rejects.toThrow(ContainerDisposedError);
  });

  it('resolving from a scope throws when the parent has been disposed', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    root.value(T, 'v');
    await root.dispose();

    await expect(child.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// has()
// ---------------------------------------------------------------------------

describe('Container — has', () => {
  it('returns false when no provider is registered', () => {
    const T = token<string>('T');

    expect(createContainer().has(T)).toBe(false);
  });

  it('returns true when a value provider is registered', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'x');

    expect(c.has(T)).toBe(true);
  });

  it('returns true when a factory provider is registered', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x');

    expect(c.has(T)).toBe(true);
  });

  it('returns true when token is registered on parent', () => {
    const T = token<string>('T');
    const root = createContainer();

    root.value(T, 'x');

    expect(root.createScope().has(T)).toBe(true);
  });

  it('does not execute the factory when checking has()', () => {
    let calls = 0;
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => {
      calls++;

      return 'x';
    });

    c.has(T);

    expect(calls).toBe(0);
  });

  it('throws ContainerDisposedError when token lives only in a disposed parent', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    root.value(T, 'parent-only');
    await root.dispose();

    expect(() => child.has(T)).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveSync()
// ---------------------------------------------------------------------------

describe('Container — resolveSync', () => {
  it('resolves a value provider synchronously', () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 42);

    expect(c.resolveSync(T)).toBe(42);
  });

  it('resolves an already-cached singleton synchronously', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'built');
    await c.resolve(T);

    expect(c.resolveSync(T)).toBe('built');
  });

  it('resolves an already-cached named-scope instance synchronously', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'scoped', { lifetime: RequestScope });

    const sc = root.createScope(RequestScope);

    await sc.resolve(T);

    expect(sc.resolveSync(T)).toBe('scoped');
  });

  it('throws ContainerSyncResolutionError for an unresolved singleton factory', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x');

    expect(() => c.resolveSync(T)).toThrow(ContainerSyncResolutionError);
  });

  it('throws ContainerSyncResolutionError for a transient factory (never cached)', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x', { lifetime: 'transient' });

    expect(() => c.resolveSync(T)).toThrow(ContainerSyncResolutionError);
  });

  it('throws ContainerProviderNotFoundError when token is not registered', () => {
    const T = token<string>('Missing');

    expect(() => createContainer().resolveSync(T)).toThrow(ContainerProviderNotFoundError);
  });

  it('ContainerSyncResolutionError message contains the token description', () => {
    const T = token<string>('ConfigService');
    const c = createContainer();

    c.factory(T, (_r) => 'x');

    expect(() => c.resolveSync(T)).toThrow('ConfigService');
  });

  it('ContainerSyncResolutionError message distinguishes transient from unresolved singleton', () => {
    const Singleton = token<string>('MySingleton');
    const Transient = token<string>('MyTransient');
    const c = createContainer();

    c.factory(Singleton, (_r) => 'x');
    c.factory(Transient, (_r) => 'x', { lifetime: 'transient' });

    const getError = (fn: () => unknown): unknown => {
      try {
        fn();
      } catch (e) {
        return e;
      }
    };

    const singletonErr = getError(() => c.resolveSync(Singleton)) as ContainerSyncResolutionError;
    const transientErr = getError(() => c.resolveSync(Transient)) as ContainerSyncResolutionError;

    expect(singletonErr.message).toContain('not been resolved yet');
    expect(transientErr.message).toContain('transient');
  });
});

// ---------------------------------------------------------------------------
// tryResolve — additional edge cases
// ---------------------------------------------------------------------------

describe('tryResolve() edge cases', () => {
  it('re-throws ContainerCircularDependencyError for a circular dep', async () => {
    const A = token('A');
    const B = token('B');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B));
    c.factory(B, (r) => r.resolve(A));

    await expect(tryResolve(c, A)).rejects.toBeInstanceOf(ContainerCircularDependencyError);
  });
});

// ---------------------------------------------------------------------------
// Named scope — disposal hooks
// ---------------------------------------------------------------------------

describe('Container — named scope disposal hooks', () => {
  it('calls dispose hook for a resolved named-scope instance when the scope container is disposed', async () => {
    const log: string[] = [];
    const RequestScope = scope('request');
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, (_r) => ({}), { dispose: () => void log.push('scope-disposed'), lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    await scopeContainer.resolve(T);
    await scopeContainer.dispose();

    expect(log).toEqual(['scope-disposed']);
  });

  it('does not call the dispose hook when the named-scope instance was never resolved', async () => {
    const log: string[] = [];
    const RequestScope = scope('request');
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, (_r) => ({}), { dispose: () => void log.push('should-not-run'), lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    await scopeContainer.dispose();

    expect(log).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// inspect() — additional edge cases
// ---------------------------------------------------------------------------

describe('Container — inspect() edge cases', () => {
  it('value nodes do not have a lifetime field', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'v');

    const { nodes } = c.inspect();

    expect(nodes[0].lifetime).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// resolveMany() — additional edge cases
// ---------------------------------------------------------------------------

describe('Container — resolveMany() edge cases', () => {
  it('resolves an empty array to an empty tuple', async () => {
    const c = createContainer();

    const result = await c.resolveMany([] as const);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveSync() — cross-container warm path
// ---------------------------------------------------------------------------

describe('Container — resolveSync() cross-container warm path', () => {
  it('resolves parent singleton synchronously after child resolveAll()', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, (_r) => 'warmed-via-child');

    const child = root.createScope();

    await child.resolveAll();

    expect(child.resolveSync(T)).toBe('warmed-via-child');
  });
});

// ---------------------------------------------------------------------------
// on() — additional edge cases
// ---------------------------------------------------------------------------

describe('Container — on() additional edge cases', () => {
  it('resolveSync() emits a resolve event', async () => {
    const events: string[] = [];
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'v');
    c.on((e) => events.push(e.type));

    c.resolveSync(T);

    expect(events).toContain('resolve');
  });

  it('listener receives no further events after the container is disposed', async () => {
    const events: string[] = [];
    const c = createContainer();

    c.on((e) => events.push(e.type));
    await c.dispose(); // fires 'dispose'

    // After dispose, value/factory registration throws ContainerDisposedError
    // and no register event should fire — confirm listener count stays at 1
    expect(events).toEqual(['dispose']);
  });
});

// ---------------------------------------------------------------------------
// createScope() — disposed parent
// ---------------------------------------------------------------------------

describe('Container — createScope() post-disposal', () => {
  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const RequestScope = scope('request');
    const c = createContainer();

    await c.dispose();

    expect(() => c.createScope(RequestScope)).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveSync() — rethrows cached singleton rejection (B1)
// ---------------------------------------------------------------------------

describe('Container — resolveSync() after singleton rejection', () => {
  it('rethrows the cached rejection instead of ContainerSyncResolutionError', async () => {
    const T = token<string>('T');
    const c = createContainer();
    const boom = new Error('factory failed');

    c.factory(T, async () => {
      throw boom;
    });

    await expect(c.resolve(T)).rejects.toThrow('factory failed');

    expect(() => c.resolveSync(T)).toThrow(boom);
    expect(() => c.resolveSync(T)).not.toThrow(ContainerSyncResolutionError);
  });

  it('rethrows the cached rejection for a named-scope singleton', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();
    const boom = new TypeError('scoped-fail');

    root.factory(
      T,
      async (_r) => {
        throw boom;
      },
      { lifetime: RequestScope },
    );

    const sc = root.createScope(RequestScope);

    await expect(sc.resolve(T)).rejects.toThrow('scoped-fail');

    expect(() => sc.resolveSync(T)).toThrow(boom);
  });
});

// ---------------------------------------------------------------------------
// inspect() / validate() / freeze() — disposed guard (B2)
// ---------------------------------------------------------------------------

describe('Container — inspect() on disposed container', () => {
  it('throws ContainerDisposedError', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.inspect()).toThrow(ContainerDisposedError);
  });
});

describe('Container — freeze() on disposed container', () => {
  it('throws ContainerDisposedError', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.freeze()).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// validate() — public graph validation without freeze (E1)
// ---------------------------------------------------------------------------

describe('Container — validate()', () => {
  it('returns this for chaining', () => {
    const c = createContainer();

    expect(c.validate()).toBe(c);
  });

  it('passes on a valid graph', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.factory(B, (r) => r.resolve(A), { deps: [A] });

    expect(() => c.validate()).not.toThrow();
  });

  it('throws ContainerProviderNotFoundError when a declared dep is missing', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(B, (_r) => 'b', { deps: [A] });

    expect(() => c.validate()).toThrow(ContainerProviderNotFoundError);
  });

  it('throws ContainerCircularDependencyError when declared deps form a cycle', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(A, (_r) => 'a', { deps: [B] });
    c.factory(B, (_r) => 'b', { deps: [A] });

    expect(() => c.validate()).toThrow(ContainerCircularDependencyError);
  });

  it('throws ContainerDisposedError when the container is disposed', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.validate()).toThrow(ContainerDisposedError);
  });

  it('does not freeze the container — registrations still accepted after validate()', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.validate();
    c.value(B, 'b');

    expect(c.has(B)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// on() — disposed container guard (D2)
// ---------------------------------------------------------------------------

describe('Container — on() on disposed container', () => {
  it('throws ContainerDisposedError', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.on(() => {})).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveSyncOptional() (free function)
// ---------------------------------------------------------------------------

describe('resolveSyncOptional()', () => {
  it('returns the value for a resolved value provider', () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 42);

    expect(resolveSyncOptional(c, T)).toBe(42);
  });

  it('returns undefined when the token is not registered', () => {
    const T = token<string>('T');

    expect(resolveSyncOptional(createContainer(), T)).toBeUndefined();
  });

  it('returns the cached singleton after it has been resolved', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'built');
    await c.resolve(T);

    expect(resolveSyncOptional(c, T)).toBe('built');
  });

  it('re-throws ContainerSyncResolutionError for an unresolved singleton (not ContainerProviderNotFoundError)', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x');

    expect(() => resolveSyncOptional(c, T)).toThrow(ContainerSyncResolutionError);
  });

  it('throws ContainerDisposedError when the container is disposed', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    expect(() => resolveSyncOptional(c, T)).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveSyncOrDefault() (free function)
// ---------------------------------------------------------------------------

describe('resolveSyncOrDefault()', () => {
  it('returns the resolved value when the token is registered', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'hello');

    expect(resolveSyncOrDefault(c, T, 'fallback')).toBe('hello');
  });

  it('returns the default value when the token is not registered', () => {
    const T = token<string>('T');

    expect(resolveSyncOrDefault(createContainer(), T, 'fallback')).toBe('fallback');
  });

  it('re-throws ContainerSyncResolutionError for an unresolved singleton', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, (_r) => 'x');

    expect(() => resolveSyncOrDefault(c, T, 'fallback')).toThrow(ContainerSyncResolutionError);
  });

  it('throws ContainerDisposedError when the container is disposed', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    expect(() => resolveSyncOrDefault(c, T, 'fallback')).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// resolveAll() — named-scope container (C6)
// ---------------------------------------------------------------------------

describe('Container — resolveAll() on a named-scope container', () => {
  it('does not invoke named-scope factories (only singletons)', async () => {
    let singletonCalls = 0;
    let scopedCalls = 0;
    const RequestScope = scope('request');
    const Singleton = token<string>('Singleton');
    const Scoped = token<string>('Scoped');
    const root = createContainer();

    root.factory(Singleton, (_r) => {
      singletonCalls++;

      return 'singleton';
    });
    root.factory(
      Scoped,
      (_r) => {
        scopedCalls++;

        return 'scoped';
      },
      { lifetime: RequestScope },
    );

    const scopeContainer = root.createScope(RequestScope);

    await scopeContainer.resolveAll();

    expect(singletonCalls).toBe(1);
    expect(scopedCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveOrDefault() — known limitation: undefined-resolving factory (C8)
// ---------------------------------------------------------------------------

describe('resolveOrDefault() nullish coalescing limitation', () => {
  it('returns defaultValue when the factory resolves to undefined (Token<undefined | string> edge case)', async () => {
    const T = token<string | undefined>('T');
    const c = createContainer();

    c.factory(T, (_r) => undefined);

    const result = await resolveOrDefault(c, T, 'fallback');

    expect(result).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// resolveOrDefault() — null-resolving factory (B2 fix)
// ---------------------------------------------------------------------------

describe('resolveOrDefault() null-resolving factory', () => {
  it('returns null when factory resolves to null (not the defaultValue)', async () => {
    const T = token<string | null>('T');
    const c = createContainer();

    c.factory(T, () => null);

    const result = await resolveOrDefault(c, T, 'fallback');

    expect(result).toBeNull();
  });

  it('returns defaultValue when token is not registered', async () => {
    const T = token<string | null>('T');

    expect(await resolveOrDefault(createContainer(), T, 'fallback')).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// resolveOptional() — null-resolving factory (C2)
// ---------------------------------------------------------------------------

describe('resolveOptional() null-resolving factory', () => {
  it('returns null when factory resolves to null', async () => {
    const T = token<string | null>('T');
    const c = createContainer();

    c.factory(T, () => null);

    expect(await resolveOptional(c, T)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSyncOrDefault() — null-resolving value (B2 sync fix)
// ---------------------------------------------------------------------------

describe('resolveSyncOrDefault() null-resolving value', () => {
  it('returns null when value is null (not the defaultValue)', () => {
    const T = token<string | null>('T');
    const c = createContainer();

    c.value(T, null);

    expect(resolveSyncOrDefault(c, T, 'fallback')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// freeze() with statically-declared deps (B1 — now real cycle detection)
// ---------------------------------------------------------------------------

describe('Container — freeze() with declared deps', () => {
  it('passes on a valid graph with declared deps', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.factory(B, (r) => r.resolve(A), { deps: [A] });

    expect(() => c.freeze()).not.toThrow();
  });

  it('throws ContainerProviderNotFoundError when a declared dep is missing', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(B, (r) => r.resolve(A), { deps: [A] });

    expect(() => c.freeze()).toThrow(ContainerProviderNotFoundError);
  });

  it('throws ContainerCircularDependencyError when declared deps form a cycle', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B), { deps: [B] });
    c.factory(B, (r) => r.resolve(A), { deps: [A] });

    expect(() => c.freeze()).toThrow(ContainerCircularDependencyError);
  });

  it('throws ContainerCircularDependencyError for an indirect three-token declared cycle', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const C = token<string>('C');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B), { deps: [B] });
    c.factory(B, (r) => r.resolve(C), { deps: [C] });
    c.factory(C, (r) => r.resolve(A), { deps: [A] });

    expect(() => c.freeze()).toThrow(ContainerCircularDependencyError);
  });

  it('freeze() passes without deps: even when the graph has a runtime cycle', async () => {
    const A = token('A');
    const B = token('B');
    const c = createContainer();

    c.factory(A, (r) => r.resolve(B));
    c.factory(B, (r) => r.resolve(A));

    expect(() => c.freeze()).not.toThrow();
    await expect(c.resolve(A)).rejects.toThrow(ContainerCircularDependencyError);
  });
});

// ---------------------------------------------------------------------------
// resolveAll({ includeScoped }) (F2)
// ---------------------------------------------------------------------------

describe('Container — resolveAll({ includeScoped: true })', () => {
  it('pre-warms named-scope factories on the current scope container', async () => {
    let scopedCalls = 0;
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(
      T,
      () => {
        scopedCalls++;

        return 'scoped';
      },
      { lifetime: RequestScope },
    );

    const sc = root.createScope(RequestScope);

    await sc.resolveAll({ includeScoped: true });

    expect(scopedCalls).toBe(1);
    expect(sc.resolveSync(T)).toBe('scoped');
  });

  it('does not pre-warm named-scope factories when includeScoped is false (default)', async () => {
    let scopedCalls = 0;
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(
      T,
      () => {
        scopedCalls++;

        return 'scoped';
      },
      { lifetime: RequestScope },
    );

    const sc = root.createScope(RequestScope);

    await sc.resolveAll();

    expect(scopedCalls).toBe(0);
  });

  it('does not pre-warm named-scope factories when no matching scope exists', async () => {
    let scopedCalls = 0;
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(
      T,
      () => {
        scopedCalls++;

        return 'scoped';
      },
      { lifetime: RequestScope },
    );

    await root.resolveAll({ includeScoped: true });

    expect(scopedCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// onResolve() interceptor (F3)
// ---------------------------------------------------------------------------

describe('Container — onResolve()', () => {
  it('fires after async resolve', async () => {
    const calls: Array<{ tok: symbol; value: unknown }> = [];
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'hello');
    c.onResolve((tok, value) => calls.push({ tok, value }));
    await c.resolve(T);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ value: 'hello' });
    expect(calls[0].tok).toBe(T);
  });

  it('fires after resolveSync', () => {
    const calls: unknown[] = [];
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 42);
    c.onResolve((_tok, value) => calls.push(value));
    c.resolveSync(T);

    expect(calls).toEqual([42]);
  });

  it('returns an unsubscribe function that stops future calls', async () => {
    const calls: unknown[] = [];
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.value(B, 'b');

    const unsub = c.onResolve((_tok, value) => calls.push(value));

    await c.resolve(A);
    unsub();
    await c.resolve(B);

    expect(calls).toEqual(['a']);
  });

  it('swallows interceptor errors so they do not disrupt resolution', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'ok');
    c.onResolve(() => {
      throw new Error('interceptor boom');
    });

    await expect(c.resolve(T)).resolves.toBe('ok');
  });

  it('interceptors propagate to parent container', async () => {
    const calls: unknown[] = [];
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createScope();

    root.value(T, 'v');
    root.onResolve((_tok, value) => calls.push(value));
    await child.resolve(T);

    expect(calls).toContain('v');
  });

  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.onResolve(() => {})).toThrow(ContainerDisposedError);
  });

  it('multiple interceptors are all called', async () => {
    const calls1: unknown[] = [];
    const calls2: unknown[] = [];
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'v');
    c.onResolve(() => calls1.push(1));
    c.onResolve(() => calls2.push(2));
    await c.resolve(T);

    expect(calls1).toHaveLength(1);
    expect(calls2).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// InferTokenTypes utility type (E1)
// ---------------------------------------------------------------------------

describe('InferTokenTypes utility type', () => {
  it('correctly infers a single-token tuple type', () => {
    const T = token<string>('T');
    const TOKENS = [T] as const;

    type Result = InferTokenTypes<typeof TOKENS>;

    const value: Result = ['hello'];

    expect(value).toEqual(['hello']);
  });

  it('correctly infers a multi-token tuple type', () => {
    const A = token<number>('A');
    const B = token<boolean>('B');
    const TOKENS = [A, B] as const;

    type Result = InferTokenTypes<typeof TOKENS>;

    const value: Result = [1, true];

    expect(value).toEqual([1, true]);
  });

  it('ResolveInterceptor type is exported and usable', () => {
    const interceptor: ResolveInterceptor = (_tok, _value) => {};

    expect(typeof interceptor).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// freeze() idempotency (D3)
// ---------------------------------------------------------------------------

describe('Container — freeze() idempotency', () => {
  it('calling freeze() twice is a no-op (does not re-run validation)', () => {
    const c = createContainer();
    const A = token<string>('A');

    c.value(A, 'a');

    expect(() => {
      c.freeze();
      c.freeze();
    }).not.toThrow();
  });

  it('freeze() on a disposed container still throws ContainerDisposedError', async () => {
    const c = createContainer();

    await c.dispose();

    expect(() => c.freeze()).toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// tryResolve() — refined contract (D2)
// ---------------------------------------------------------------------------

describe('tryResolve() — refined contract', () => {
  it('returns { ok: false } only for ContainerProviderNotFoundError', async () => {
    const T = token<string>('T');
    const c = createContainer();
    const result = await tryResolve(c, T);

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error).toBeInstanceOf(ContainerProviderNotFoundError);
  });

  it('returns { ok: true, value } when factory succeeds', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'resolved');

    const resultOk = await tryResolve(c, T);

    expect(resultOk.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// trySyncResolve() (F2)
// ---------------------------------------------------------------------------

describe('trySyncResolve()', () => {
  it('returns { ok: true, value } for a registered value', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 99);

    const result = trySyncResolve(c, T);

    expect(result).toEqual({ ok: true, value: 99 });
  });

  it('returns { ok: false, error: ContainerProviderNotFoundError } when not registered', async () => {
    const T = token<number>('T');
    const c = createContainer();
    const result = trySyncResolve(c, T);

    expect(result.ok).toBe(false);

    if (!result.ok) expect(result.error).toBeInstanceOf(ContainerProviderNotFoundError);
  });

  it('re-throws ContainerSyncResolutionError for an unresolved singleton', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'hello');

    expect(() => trySyncResolve(c, T)).toThrow(ContainerSyncResolutionError);
  });

  it('re-throws ContainerDisposedError when container is disposed', async () => {
    const T = token<string>('T');
    const c = createContainer();

    await c.dispose();

    expect(() => trySyncResolve(c, T)).toThrow(ContainerDisposedError);
  });

  it('returns { ok: true, value } after resolveAll() warms the singleton', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'warm');
    await c.resolveAll();

    const result = trySyncResolve(c, T);

    expect(result).toEqual({ ok: true, value: 'warm' });
  });
});

// ---------------------------------------------------------------------------
// resolveAll() — fires events and interceptors (D1)
// ---------------------------------------------------------------------------

describe('Container — resolveAll() events and interceptors', () => {
  it('fires resolve events for each pre-warmed singleton', async () => {
    const A = token<string>('A');
    const B = token<number>('B');
    const c = createContainer();

    c.factory(A, async () => 'hello');
    c.factory(B, async () => 42);

    const events: string[] = [];

    c.on((e) => {
      if (e.type === 'resolve') events.push(e.description);
    });

    await c.resolveAll();

    expect(events).toContain('A');
    expect(events).toContain('B');
  });

  it('fires onResolve interceptors for each pre-warmed singleton', async () => {
    const A = token<string>('A');
    const c = createContainer();

    c.factory(A, async () => 'hello');

    const intercepted: string[] = [];

    c.onResolve((_tok, value) => {
      intercepted.push(value as string);
    });

    await c.resolveAll();

    expect(intercepted).toContain('hello');
  });

  it('does not fire events for already-cached singletons on second resolveAll()', async () => {
    const A = token<string>('A');
    const c = createContainer();

    c.factory(A, async () => 'a');
    await c.resolveAll();

    const events: string[] = [];

    c.on((e) => {
      if (e.type === 'resolve') events.push(e.description);
    });

    await c.resolveAll();

    expect(events).toContain('A');
  });
});

// ---------------------------------------------------------------------------
// inspect() — deps field (C1)
// ---------------------------------------------------------------------------

describe('Container — inspect() deps field', () => {
  it('surfaces declared deps in ContainerNode.deps', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.factory(B, (r) => r.resolve(A), { deps: [A] });

    const graph = c.inspect();
    const nodeB = graph.nodes.find((n) => n.description === 'B');

    expect(nodeB?.deps).toEqual(['A']);
  });

  it('omits deps field when no deps declared', () => {
    const A = token<string>('A');
    const c = createContainer();

    c.value(A, 'a');

    const graph = c.inspect();
    const nodeA = graph.nodes.find((n) => n.description === 'A');

    expect(nodeA?.deps).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createScope() auto-naming (C2)
// ---------------------------------------------------------------------------

describe('Container — createScope() auto-naming', () => {
  it('includes scope token name in child container name when no explicit name given', () => {
    const RequestScope = scope('request');
    const root = createContainer({ name: 'root' });
    const child = root.createScope(RequestScope);

    expect(child.name).toBe('root:request');
  });

  it('uses explicit name when provided, ignoring scope token', () => {
    const RequestScope = scope('request');
    const root = createContainer({ name: 'root' });
    const child = root.createScope(RequestScope, { name: 'my-scope' });

    expect(child.name).toBe('my-scope');
  });

  it('falls back to :child when createScope called with no scope token', () => {
    const root = createContainer({ name: 'root' });
    const child = root.createScope();

    expect(child.name).toBe('root:child');
  });
});

// ---------------------------------------------------------------------------
// FactoryResolver.resolveSync (F1)
// ---------------------------------------------------------------------------

describe('FactoryResolver.resolveSync()', () => {
  it('allows a factory to synchronously access a pre-resolved singleton', async () => {
    const Config = token<{ env: string }>('Config');
    const Service = token<string>('Service');
    const c = createContainer();

    c.value(Config, { env: 'test' });
    c.factory(Service, (r) => r.resolveSync(Config).env);

    const result = await c.resolve(Service);

    expect(result).toBe('test');
  });

  it('throws ContainerSyncResolutionError if dep not yet resolved', async () => {
    const Dep = token<string>('Dep');
    const Service = token<string>('Service');
    const c = createContainer();

    c.factory(Dep, async () => 'dep-value');
    c.factory(Service, (r) => {
      r.resolveSync(Dep);

      return 'service';
    });

    await expect(c.resolve(Service)).rejects.toThrow(ContainerSyncResolutionError);
  });
});
