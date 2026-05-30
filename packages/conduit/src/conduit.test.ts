import { describe, expect, it } from 'vitest';

import {
  CircularDependencyError,
  type Container,
  ContainerDisposedError,
  type ContainerEvent,
  type ContainerGraph,
  type ContainerModule,
  createContainer,
  DuplicateRegistrationError,
  ProviderNotFoundError,
  scope,
  ScopedResolutionError,
  SyncResolutionError,
  token,
} from './conduit';

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

    c.factory(T, () => 1);

    await expect(c.resolve(T)).resolves.toBe(1);
  });

  it('throws DuplicateRegistrationError when a token is registered twice', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'first');

    expect(() => c.value(T, 'second')).toThrow(DuplicateRegistrationError);
  });

  it('DuplicateRegistrationError message contains the token description', () => {
    const T = token<string>('MyToken');
    const c = createContainer();

    c.value(T, 'x');

    expect(() => c.value(T, 'y')).toThrow('MyToken');
  });

  it('throws DuplicateRegistrationError for duplicate factory registration', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x');

    expect(() => c.factory(T, () => 'y')).toThrow(DuplicateRegistrationError);
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

    c.factory(T, () => 'built');

    await expect(c.resolve(T)).resolves.toBe('built');
  });

  it('resolves an async factory provider', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'async');

    await expect(c.resolve(T)).resolves.toBe('async');
  });

  it('throws ProviderNotFoundError when no provider exists', async () => {
    const T = token<string>('Missing');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow(ProviderNotFoundError);
  });

  it('ProviderNotFoundError message contains the token description', async () => {
    const T = token<string>('AuthService');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow('AuthService');
  });
});

// ---------------------------------------------------------------------------
// resolveOptional
// ---------------------------------------------------------------------------

describe('Container — resolveOptional', () => {
  it('returns undefined when no provider is registered', async () => {
    const T = token<string>('T');

    await expect(createContainer().resolveOptional(T)).resolves.toBeUndefined();
  });

  it('returns the value when a provider exists', async () => {
    const T = token<number>('T');
    const c = createContainer();

    c.value(T, 7);

    await expect(c.resolveOptional(T)).resolves.toBe(7);
  });

  it('re-throws errors that are not ProviderNotFoundError', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => {
      throw new TypeError('factory boom');
    });

    await expect(c.resolveOptional(T)).rejects.toThrow(TypeError);
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

    c.factory(A, () => {
      calls++;

      return 'a';
    });
    c.factory(B, () => {
      calls++;

      return 'b';
    });

    await c.resolveAll();

    expect(calls).toBe(2);
    expect(c.resolveSync(A)).toBe('a');
    expect(c.resolveSync(B)).toBe('b');
  });

  it('does not resolve transient or scoped factories', async () => {
    let calls = 0;
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.factory(
      A,
      () => {
        calls++;

        return 'a';
      },
      { lifetime: 'transient' },
    );
    c.factory(
      B,
      () => {
        calls++;

        return 'b';
      },
      { lifetime: 'scoped' },
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

    root.factory(T, () => {
      calls++;

      return 'v';
    });

    const child = root.createChild();

    await child.resolveAll();

    expect(calls).toBe(1);
    expect(child.resolveSync(T)).toBe('v');
  });

  it('does not double-resolve a singleton present in both parent and child hierarchies', async () => {
    let calls = 0;
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => {
      calls++;

      return 'v';
    });

    const child = root.createChild();

    await root.resolveAll();
    await child.resolveAll();

    expect(calls).toBe(1);
  });

  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const c = createContainer();

    await c.dispose();

    await expect(c.resolveAll()).rejects.toThrow(ContainerDisposedError);
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

    c.factory(T, () => ({ id: ++n }));

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('deduplicates concurrent resolutions of the same singleton', async () => {
    let n = 0;
    const T = token<number>('T');
    const c = createContainer();

    c.factory(T, async () => {
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

    c.factory(T, async () => {
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

    c.factory(T, () => ({ id: ++n }), { lifetime: 'transient' });

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });
});

describe('Container — scoped lifetime', () => {
  it('throws ScopedResolutionError when resolved directly from the root container', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'v', { lifetime: 'scoped' });

    await expect(c.resolve(T)).rejects.toThrow(ScopedResolutionError);
  });

  it('caches one instance per child container', async () => {
    let n = 0;
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, () => ({ id: ++n }), { lifetime: 'scoped' });

    const child1 = root.createChild();
    const child2 = root.createChild();

    const a = await child1.resolve(T);
    const b = await child1.resolve(T);
    const c = await child2.resolve(T);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(n).toBe(2);
  });

  it('separate children do not share scoped instances', async () => {
    let n = 0;
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, () => ({ id: ++n }), { lifetime: 'scoped' });

    const c1 = root.createChild();
    const c2 = root.createChild();

    const a = await c1.resolve(T);
    const b = await c2.resolve(T);

    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Dependency injection
// ---------------------------------------------------------------------------

describe('Container — dependency injection', () => {
  it('injects declared deps into a factory', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'hello');
    c.factory(B, (a) => `${a} world`, { deps: [A] });

    await expect(c.resolve(B)).resolves.toBe('hello world');
  });

  it('resolves a deep dependency chain', async () => {
    const Root = token<string>('Root');
    const Mid = token<string>('Mid');
    const Leaf = token<string>('Leaf');
    const c = createContainer();

    c.value(Leaf, 'leaf');
    c.factory(Mid, (l) => `mid(${l})`, { deps: [Leaf] });
    c.factory(Root, (m) => `root(${m})`, { deps: [Mid] });

    await expect(c.resolve(Root)).resolves.toBe('root(mid(leaf))');
  });

  it('resolves a shared dependency only once across sibling branches', async () => {
    let calls = 0;
    const Shared = token<object>('Shared');
    const Left = token<object>('Left');
    const Right = token<object>('Right');
    const Parent = token<{ l: object; r: object }>('Parent');
    const c = createContainer();

    c.factory(Shared, () => ({ id: ++calls }));
    c.factory(Left, (s) => ({ s }), { deps: [Shared] });
    c.factory(Right, (s) => ({ s }), { deps: [Shared] });
    c.factory(Parent, (l, r) => ({ l, r }), { deps: [Left, Right] });

    await c.resolve(Parent);

    expect(calls).toBe(1);
  });

  it('throws ProviderNotFoundError when a declared dep is missing', async () => {
    const Missing = token<string>('Missing');
    const Consumer = token<string>('Consumer');
    const c = createContainer();

    c.factory(Consumer, (m) => m, { deps: [Missing] });

    await expect(c.resolve(Consumer)).rejects.toThrow(ProviderNotFoundError);
  });

  it('throws CircularDependencyError for a direct two-token cycle', async () => {
    const A = token('A');
    const B = token('B');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    await expect(c.resolve(A)).rejects.toThrow(CircularDependencyError);
  });

  it('throws CircularDependencyError for an indirect three-token cycle', async () => {
    const A = token('A');
    const B = token('B');
    const C = token('C');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (cv) => cv, { deps: [C] });
    c.factory(C, (a) => a, { deps: [A] });

    await expect(c.resolve(A)).rejects.toThrow(CircularDependencyError);
  });

  it('CircularDependencyError message contains the full cycle path', async () => {
    const A = token('Alpha');
    const B = token('Beta');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    const err = (await c.resolve(A).catch((e) => e)) as CircularDependencyError;

    expect(err).toBeInstanceOf(CircularDependencyError);
    expect(err.message).toContain('Alpha');
    expect(err.message).toContain('Beta');
    expect(err.message).toBe('Circular dependency detected: Alpha -> Beta -> Alpha');
  });
});

// ---------------------------------------------------------------------------
// Child containers
// ---------------------------------------------------------------------------

describe('Container — child containers', () => {
  it('child inherits parent registrations', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.value(T, 'from-root');

    const child = root.createChild();

    await expect(child.resolve(T)).resolves.toBe('from-root');
  });

  it('child local registration shadows the parent registration', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.value(T, 'parent');

    const child = root.createChild();

    child.value(T, 'child');

    await expect(child.resolve(T)).resolves.toBe('child');
    await expect(root.resolve(T)).resolves.toBe('parent');
  });

  it('parent cannot see child-only registrations', async () => {
    const T = token<string>('ChildOnly');
    const root = createContainer();
    const child = root.createChild();

    child.value(T, 'child');

    await expect(root.resolve(T)).rejects.toThrow(ProviderNotFoundError);
  });

  it('child can resolve its own local registrations after parent is disposed', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createChild();

    child.value(T, 'local');
    await root.dispose();

    await expect(child.resolve(T)).resolves.toBe('local');
  });

  it('child throws ContainerDisposedError when token lives only in disposed parent', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createChild();

    root.value(T, 'parent-only');
    await root.dispose();

    await expect(child.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// ContainerModule / load()
// ---------------------------------------------------------------------------

describe('Container — load()', () => {
  it('applies a module to the container', async () => {
    const T = token<string>('T');
    const mod: ContainerModule = (c) => void c.value(T, 'from-module');
    const container = createContainer();

    await container.load(mod);

    await expect(container.resolve(T)).resolves.toBe('from-module');
  });

  it('applies multiple modules sequentially', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const modA: ContainerModule = (c) => void c.value(A, 'a');
    const modB: ContainerModule = (c) => void c.value(B, 'b');
    const container = createContainer();

    await container.load(modA, modB);

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

    await c.load(modA, modB);

    expect(order).toEqual(['A', 'B']);
    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('supports method chaining via the returned Promise', async () => {
    const T = token<string>('T');
    const container = createContainer();

    const result = await container.load((c) => void c.value(T, 'v'));

    expect(result).toBe(container);
  });

  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const c = createContainer();

    await c.dispose();

    await expect(c.load(() => {})).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// loadAll()
// ---------------------------------------------------------------------------

describe('Container — loadAll()', () => {
  it('applies all modules in parallel and registers all tokens', async () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    await c.loadAll(
      (container) => void container.value(A, 'a'),
      (container) => void container.value(B, 'b'),
    );

    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('resolves async modules concurrently (finish order may differ from input order)', async () => {
    const finishOrder: string[] = [];
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    await c.loadAll(
      async (container) => {
        await new Promise((r) => setTimeout(r, 20));

        finishOrder.push('A');
        container.value(A, 'a');
      },
      async (container) => {
        await new Promise((r) => setTimeout(r, 5));

        finishOrder.push('B');
        container.value(B, 'b');
      },
    );

    // B finishes before A (faster timeout)
    expect(finishOrder).toEqual(['B', 'A']);
    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('throws ContainerDisposedError when called on a disposed container', async () => {
    const c = createContainer();

    await c.dispose();

    await expect(c.loadAll(() => {})).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// deferred()
// ---------------------------------------------------------------------------

describe('Container — deferred()', () => {
  it('defers resolution until first property access', async () => {
    let calls = 0;
    const T = token<{ greet(): string }>('T');
    const c = createContainer();

    c.factory(T, () => {
      calls++;

      return { greet: () => 'hello' };
    });

    const proxy = c.deferred(T);

    expect(calls).toBe(0);

    // Must pre-warm to use deferred (resolveSync requirement)
    await c.resolve(T);

    expect(proxy.greet()).toBe('hello');
    expect(calls).toBe(1);
  });

  it('throws ProviderNotFoundError on first access if token not registered', () => {
    const T = token<{ x: number }>('T');
    const c = createContainer();
    const proxy = c.deferred(T);

    expect(() => proxy.x).toThrow(ProviderNotFoundError);
  });

  it('resolves value tokens without pre-warming', () => {
    const T = token<{ val: number }>('T');
    const c = createContainer();

    c.value(T, { val: 42 });

    const proxy = c.deferred(T);

    expect(proxy.val).toBe(42);
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
    c.factory(B, (a) => a, { deps: [A] });

    const graph: ContainerGraph = c.inspect();

    expect(graph.nodes).toHaveLength(2);

    const valueNode = graph.nodes.find((n) => n.description === 'Alpha');
    const factoryNode = graph.nodes.find((n) => n.description === 'Beta');

    expect(valueNode).toMatchObject({ deps: [], kind: 'value' });
    expect(factoryNode).toMatchObject({ deps: ['Alpha'], kind: 'factory', lifetime: 'singleton' });
  });

  it('includes lifetime on factory nodes', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x', { lifetime: 'transient' });

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

    const child = root.createChild();

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

    const child = root.createChild();

    child.value(B, 'b');

    const graph = child.inspect({ deep: false });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].description).toBe('B');
  });

  it('serializes named scope token lifetime as "scope:<name>"', () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'v', { lifetime: RequestScope });

    const { nodes } = c.inspect();

    expect(nodes[0].lifetime).toBe('scope:request');
  });
});

// ---------------------------------------------------------------------------
// validate()
// ---------------------------------------------------------------------------

describe('Container — validate()', () => {
  it('returns this for a valid graph (no cycles)', () => {
    const A = token<string>('A');
    const B = token<string>('B');
    const c = createContainer();

    c.value(A, 'a');
    c.factory(B, (a) => a, { deps: [A] });

    expect(c.validate()).toBe(c);
  });

  it('returns this for an empty container', () => {
    const c = createContainer();

    expect(c.validate()).toBe(c);
  });

  it('throws CircularDependencyError for a direct two-token cycle', () => {
    const A = token('A');
    const B = token('B');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    expect(() => c.validate()).toThrow(CircularDependencyError);
  });

  it('throws CircularDependencyError for a three-token indirect cycle', () => {
    const A = token('A');
    const B = token('B');
    const C = token('C');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (cv) => cv, { deps: [C] });
    c.factory(C, (a) => a, { deps: [A] });

    expect(() => c.validate()).toThrow(CircularDependencyError);
  });

  it('supports method chaining: container.factory(...).validate()', () => {
    const A = token<string>('A');
    const c = createContainer();

    c.value(A, 'a');

    expect(c.validate()).toBe(c);
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

    root.factory(T, () => ({ id: ++n }), { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    const a = await scopeContainer.resolve(T);
    const b = await scopeContainer.resolve(T);

    expect(a).toBe(b); // same scope instance
    expect(n).toBe(1);
  });

  it('creates separate instances across different scope containers', async () => {
    const RequestScope = scope('request');
    const T = token<{ id: number }>('T');
    let n = 0;
    const root = createContainer();

    root.factory(T, () => ({ id: ++n }), { lifetime: RequestScope });

    const scope1 = root.createScope(RequestScope);
    const scope2 = root.createScope(RequestScope);

    const a = await scope1.resolve(T);
    const b = await scope2.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });

  it('throws ScopedResolutionError when scope container is missing in the hierarchy', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'v', { lifetime: RequestScope });

    // Resolved from root directly — no matching scope in chain
    await expect(root.resolve(T)).rejects.toThrow(ScopedResolutionError);
  });

  it('ScopedResolutionError message contains the required scope name', async () => {
    const RequestScope = scope('request-scope');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'v', { lifetime: RequestScope });

    const err = (await root.resolve(T).catch((e) => e)) as ScopedResolutionError;

    expect(err.message).toContain('request-scope');
  });

  it('resolves a named-scope token from a nested child that inherits the scope', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'scoped-value', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);
    const nested = scopeContainer.createChild();

    await expect(nested.resolve(T)).resolves.toBe('scoped-value');
  });

  it('resolveSync throws SyncResolutionError for an unresolved named-scope factory', () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'v', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    expect(() => scopeContainer.resolveSync(T)).toThrow(SyncResolutionError);
  });

  it('resolveSync works after the named-scope instance is pre-warmed', async () => {
    const RequestScope = scope('request');
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'warmed', { lifetime: RequestScope });

    const scopeContainer = root.createScope(RequestScope);

    await scopeContainer.resolve(T);

    expect(scopeContainer.resolveSync(T)).toBe('warmed');
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
    c.factory(T, () => 'v');

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ description: 'MyFactory', kind: 'factory', type: 'register' });
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

    // Registration and resolution should still work
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
});

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

describe('Container — disposal', () => {
  it('calls the dispose hook on a resolved singleton', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => void log.push('done') });

    await c.resolve(T);
    await c.dispose();

    expect(log).toEqual(['done']);
  });

  it('does not call the dispose hook for an unresolved factory', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => void log.push('should-not-run') });

    await c.dispose();

    expect(log).toHaveLength(0);
  });

  it('calls dispose hooks for scoped instances on the child that owns them', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const root = createContainer();

    root.factory(T, () => ({}), { dispose: () => void log.push('scoped-done'), lifetime: 'scoped' });

    const child = root.createChild();

    await child.resolve(T);
    await child.dispose();

    expect(log).toEqual(['scoped-done']);
  });

  it('runs all dispose hooks even if one throws, collecting failures in AggregateError', async () => {
    const A = token<object>('A');
    const B = token<object>('B');
    const c = createContainer();

    c.factory(A, () => ({}), {
      dispose: () => {
        throw new Error('A-fail');
      },
    });
    c.factory(B, () => ({}), {
      dispose: () => {
        throw new Error('B-fail');
      },
    });

    await c.resolve(A);
    await c.resolve(B);

    const err = (await c.dispose().catch((e) => e)) as AggregateError;

    expect(err).toBeInstanceOf(AggregateError);
    expect(err.errors).toHaveLength(2);
  });

  it('marks the container as disposed even when a hook throws', async () => {
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), {
      dispose: () => {
        throw new Error('fail');
      },
    });

    await c.resolve(T);
    await c.dispose().catch(() => {});

    expect(c.disposed).toBe(true);
  });

  it('calling dispose more than once is a no-op after the first call', async () => {
    const log: string[] = [];
    const T = token<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => void log.push('hook') });

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

  it('value dispose failures are collected in AggregateError', async () => {
    const T = token<string>('T');
    const c = createContainer();

    c.value(T, 'x', {
      dispose: () => {
        throw new Error('value-fail');
      },
    });

    const err = (await c.dispose().catch((e) => e)) as AggregateError;

    expect(err).toBeInstanceOf(AggregateError);
    expect(err.errors[0].message).toBe('value-fail');
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

  it('resolveOptional throws ContainerDisposedError (does not swallow it)', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    await expect(c.resolveOptional(T)).rejects.toThrow(ContainerDisposedError);
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

    expect(() => c.factory(T, () => 'x')).toThrow(ContainerDisposedError);
  });

  it('createChild() throws ContainerDisposedError', async () => {
    const c = await disposedContainer();

    expect(() => c.createChild()).toThrow(ContainerDisposedError);
  });

  it('has() throws ContainerDisposedError', async () => {
    const T = token<string>('T');
    const c = await disposedContainer();

    expect(() => c.has(T)).toThrow(ContainerDisposedError);
  });

  it('load() throws ContainerDisposedError', async () => {
    const c = await disposedContainer();

    await expect(c.load(() => {})).rejects.toThrow(ContainerDisposedError);
  });

  it('resolving from a child throws when the parent has been disposed', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createChild();

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

    expect(root.createChild().has(T)).toBe(true);
  });

  it('does not execute the factory when checking has()', () => {
    let calls = 0;
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => {
      calls++;

      return 'x';
    });

    c.has(T);

    expect(calls).toBe(0);
  });

  it('throws ContainerDisposedError when token lives only in a disposed parent', async () => {
    const T = token<string>('T');
    const root = createContainer();
    const child = root.createChild();

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

    c.factory(T, () => 'built');
    await c.resolve(T);

    expect(c.resolveSync(T)).toBe('built');
  });

  it('resolves an already-cached scoped instance synchronously', async () => {
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'scoped', { lifetime: 'scoped' });

    const child = root.createChild();

    await child.resolve(T);

    expect(child.resolveSync(T)).toBe('scoped');
  });

  it('throws SyncResolutionError for an unresolved singleton factory', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x');

    expect(() => c.resolveSync(T)).toThrow(SyncResolutionError);
  });

  it('throws SyncResolutionError for a transient factory (never cached)', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x', { lifetime: 'transient' });

    expect(() => c.resolveSync(T)).toThrow(SyncResolutionError);
  });

  it('throws ScopedResolutionError for a scoped token resolved from the root container', () => {
    const T = token<string>('T');
    const c = createContainer();

    c.factory(T, () => 'x', { lifetime: 'scoped' });

    expect(() => c.resolveSync(T)).toThrow(ScopedResolutionError);
  });

  it('throws SyncResolutionError for an unresolved scoped instance on a child container', () => {
    const T = token<string>('T');
    const root = createContainer();

    root.factory(T, () => 'x', { lifetime: 'scoped' });

    const child = root.createChild();

    expect(() => child.resolveSync(T)).toThrow(SyncResolutionError);
  });

  it('throws ProviderNotFoundError when token is not registered', () => {
    const T = token<string>('Missing');

    expect(() => createContainer().resolveSync(T)).toThrow(ProviderNotFoundError);
  });

  it('SyncResolutionError message contains the token description', () => {
    const T = token<string>('ConfigService');
    const c = createContainer();

    c.factory(T, () => 'x');

    expect(() => c.resolveSync(T)).toThrow('ConfigService');
  });

  it('SyncResolutionError message distinguishes transient from unresolved singleton', () => {
    const Singleton = token<string>('MySingleton');
    const Transient = token<string>('MyTransient');
    const c = createContainer();

    c.factory(Singleton, () => 'x');
    c.factory(Transient, () => 'x', { lifetime: 'transient' });

    const getError = (fn: () => unknown): unknown => {
      try {
        fn();
      } catch (e) {
        return e;
      }
    };

    const singletonErr = getError(() => c.resolveSync(Singleton)) as SyncResolutionError;
    const transientErr = getError(() => c.resolveSync(Transient)) as SyncResolutionError;

    expect(singletonErr.message).toContain('not been resolved yet');
    expect(transientErr.message).toContain('transient');
  });
});
