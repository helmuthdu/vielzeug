import { describe, expect, it } from 'vitest';

import {
  CircularDependencyError,
  type Container,
  ContainerDisposedError,
  createContainer,
  createToken,
  MultipleProvidersError,
  ProviderNotFoundError,
} from './wireit';

// ---------------------------------------------------------------------------
// Token creation
// ---------------------------------------------------------------------------

describe('createToken', () => {
  it('returns a symbol whose description matches the argument', () => {
    const t = createToken<string>('MyService');

    expect(typeof t).toBe('symbol');
    expect(t.description).toBe('MyService');
  });

  it('produces a unique symbol for every call, even with the same description', () => {
    const a = createToken<string>('Same');
    const b = createToken<string>('Same');

    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe('Container — registration', () => {
  it('registers a value provider and chains', () => {
    const T = createToken<number>('T');
    const c = createContainer();

    expect(() => c.value(T, 42)).not.toThrow();
  });

  it('registers a factory provider and chains', () => {
    const T = createToken<number>('T');
    const c = createContainer();

    expect(() => c.factory(T, () => 1)).not.toThrow();
  });

  it('supports method chaining on registration', async () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');
    const c = createContainer();

    c.value(A, 'a').value(B, 'b');

    await expect(c.resolve(A)).resolves.toBe('a');
    await expect(c.resolve(B)).resolves.toBe('b');
  });

  it('throws when a token is registered twice in single mode', () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'first');

    expect(() => c.value(T, 'second')).toThrow(/already registered/);
  });

  it('accumulates registrations when multi is true', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'a', { multi: true });
    c.value(T, 'b', { multi: true });

    await expect(c.resolveMany(T)).resolves.toEqual(['a', 'b']);
  });

  it('allows mixing value and factory registrations under one multi token', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'static', { multi: true });
    c.factory(T, () => 'dynamic', { multi: true });

    await expect(c.resolveMany(T)).resolves.toEqual(['static', 'dynamic']);
  });
});

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('Container — resolve', () => {
  it('resolves a value provider', async () => {
    const T = createToken<number>('T');
    const c = createContainer();

    c.value(T, 99);

    await expect(c.resolve(T)).resolves.toBe(99);
  });

  it('resolves a factory provider', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, () => 'built');

    await expect(c.resolve(T)).resolves.toBe('built');
  });

  it('resolves an async factory provider', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'async');

    await expect(c.resolve(T)).resolves.toBe('async');
  });

  it('throws ProviderNotFoundError when no provider exists', async () => {
    const T = createToken<string>('Missing');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow(ProviderNotFoundError);
  });

  it('throws MultipleProvidersError when a multi token is resolved via resolve()', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'a', { multi: true });
    c.value(T, 'b', { multi: true });

    await expect(c.resolve(T)).rejects.toThrow(MultipleProvidersError);
  });

  it('ProviderNotFoundError message contains the token description', async () => {
    const T = createToken<string>('AuthService');
    const c = createContainer();

    await expect(c.resolve(T)).rejects.toThrow('AuthService');
  });

  it('MultipleProvidersError message contains the token description', async () => {
    const T = createToken<string>('Plugin');
    const c = createContainer();

    c.value(T, 'a', { multi: true });
    c.value(T, 'b', { multi: true });

    await expect(c.resolve(T)).rejects.toThrow('Plugin');
  });
});

describe('Container — resolveOptional', () => {
  it('returns undefined when no provider is registered', async () => {
    const T = createToken<string>('T');

    await expect(createContainer().resolveOptional(T)).resolves.toBeUndefined();
  });

  it('returns the value when a provider exists', async () => {
    const T = createToken<number>('T');
    const c = createContainer();

    c.value(T, 7);

    await expect(c.resolveOptional(T)).resolves.toBe(7);
  });

  it('re-throws errors that are not ProviderNotFoundError', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, () => {
      throw new TypeError('factory boom');
    });

    await expect(c.resolveOptional(T)).rejects.toThrow(TypeError);
  });
});

describe('Container — resolveMany', () => {
  it('returns an empty array when no providers are registered', async () => {
    const T = createToken<string>('T');

    await expect(createContainer().resolveMany(T)).resolves.toEqual([]);
  });

  it('returns all providers in registration order', async () => {
    const T = createToken<number>('T');
    const c = createContainer();

    c.value(T, 1, { multi: true });
    c.value(T, 2, { multi: true });
    c.value(T, 3, { multi: true });

    await expect(c.resolveMany(T)).resolves.toEqual([1, 2, 3]);
  });

  it('resolves async multi providers correctly', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, async () => 'x', { multi: true });
    c.factory(T, async () => 'y', { multi: true });

    await expect(c.resolveMany(T)).resolves.toEqual(['x', 'y']);
  });

  it('child multi registrations shadow parent multi registrations entirely', async () => {
    const T = createToken<string>('T');
    const root = createContainer();
    const child = root.createChild();

    root.value(T, 'parent-a', { multi: true });
    root.value(T, 'parent-b', { multi: true });
    child.value(T, 'child-only', { multi: true });

    // child has a local registration so parent list is shadowed
    await expect(child.resolveMany(T)).resolves.toEqual(['child-only']);
    // root is unaffected
    await expect(root.resolveMany(T)).resolves.toEqual(['parent-a', 'parent-b']);
  });
});

// ---------------------------------------------------------------------------
// Lifetimes
// ---------------------------------------------------------------------------

describe('Container — singleton lifetime', () => {
  it('returns the same instance on every resolution', async () => {
    let n = 0;
    const T = createToken<object>('T');
    const c = createContainer();

    c.factory(T, () => ({ id: ++n }));

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).toBe(b);
    expect(n).toBe(1);
  });

  it('deduplicates concurrent resolutions of the same singleton', async () => {
    let n = 0;
    const T = createToken<number>('T');
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

  it('allows retry after a failed singleton resolution', async () => {
    let calls = 0;
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, async () => {
      calls += 1;

      if (calls === 1) throw new Error('first attempt fails');

      return 'ok';
    });

    await expect(c.resolve(T)).rejects.toThrow('first attempt fails');
    await expect(c.resolve(T)).resolves.toBe('ok');
    expect(calls).toBe(2);
  });

  it('value providers always return the same reference without calling a factory', async () => {
    const obj = { id: 1 };
    const T = createToken<object>('T');
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
    const T = createToken<object>('T');
    const c = createContainer();

    c.factory(T, () => ({ id: ++n }), { lifetime: 'transient' });

    const a = await c.resolve(T);
    const b = await c.resolve(T);

    expect(a).not.toBe(b);
    expect(n).toBe(2);
  });
});

describe('Container — scoped lifetime', () => {
  it('throws when resolved directly from the root container', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.factory(T, () => 'v', { lifetime: 'scoped' });

    await expect(c.resolve(T)).rejects.toThrow(/scoped lifetime/);
  });

  it('caches one instance per child container', async () => {
    let n = 0;
    const T = createToken<object>('T');
    const root = createContainer();

    root.factory(T, () => ({ id: ++n }), { lifetime: 'scoped' });

    const child1 = root.createChild();
    const child2 = root.createChild();

    const a = await child1.resolve(T);
    const b = await child1.resolve(T);
    const c = await child2.resolve(T);

    expect(a).toBe(b); // same scope
    expect(a).not.toBe(c); // different scope
    expect(n).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Dependency injection
// ---------------------------------------------------------------------------

describe('Container — dependency injection', () => {
  it('injects declared deps into a factory', async () => {
    const A = createToken<string>('A');
    const B = createToken<string>('B');
    const c = createContainer();

    c.value(A, 'hello');
    c.factory(B, (a) => `${a} world`, { deps: [A] });

    await expect(c.resolve(B)).resolves.toBe('hello world');
  });

  it('resolves a deep dependency chain', async () => {
    const Root = createToken<string>('Root');
    const Mid = createToken<string>('Mid');
    const Leaf = createToken<string>('Leaf');
    const c = createContainer();

    c.value(Leaf, 'leaf');
    c.factory(Mid, (l) => `mid(${l})`, { deps: [Leaf] });
    c.factory(Root, (m) => `root(${m})`, { deps: [Mid] });

    await expect(c.resolve(Root)).resolves.toBe('root(mid(leaf))');
  });

  it('resolves a shared dependency only once across sibling branches', async () => {
    let calls = 0;
    const Shared = createToken<object>('Shared');
    const Left = createToken<object>('Left');
    const Right = createToken<object>('Right');
    const Parent = createToken<{ l: object; r: object }>('Parent');
    const c = createContainer();

    c.factory(Shared, () => ({ id: ++calls }));
    c.factory(Left, (s) => ({ s }), { deps: [Shared] });
    c.factory(Right, (s) => ({ s }), { deps: [Shared] });
    c.factory(Parent, (l, r) => ({ l, r }), { deps: [Left, Right] });

    await c.resolve(Parent);

    expect(calls).toBe(1);
  });

  it('throws ProviderNotFoundError when a declared dep is missing', async () => {
    const Missing = createToken<string>('Missing');
    const Consumer = createToken<string>('Consumer');
    const c = createContainer();

    c.factory(Consumer, (m) => m, { deps: [Missing] });

    await expect(c.resolve(Consumer)).rejects.toThrow(ProviderNotFoundError);
  });

  it('throws CircularDependencyError for a direct two-token cycle', async () => {
    const A = createToken('A');
    const B = createToken('B');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    await expect(c.resolve(A)).rejects.toThrow(CircularDependencyError);
  });

  it('throws CircularDependencyError for an indirect three-token cycle', async () => {
    const A = createToken('A');
    const B = createToken('B');
    const C = createToken('C');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (cv) => cv, { deps: [C] });
    c.factory(C, (a) => a, { deps: [A] });

    await expect(c.resolve(A)).rejects.toThrow(CircularDependencyError);
  });

  it('CircularDependencyError message contains the cycle path', async () => {
    const A = createToken('Alpha');
    const B = createToken('Beta');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    const err = await c.resolve(A).catch((e) => e);

    expect(err).toBeInstanceOf(CircularDependencyError);
    expect(err.message).toContain('Alpha');
    expect(err.message).toContain('Beta');
  });

  it('CircularDependencyError path does not duplicate tokens', async () => {
    const A = createToken('A');
    const B = createToken('B');
    const c = createContainer();

    c.factory(A, (b) => b, { deps: [B] });
    c.factory(B, (a) => a, { deps: [A] });

    const err = await c.resolve(A).catch((e) => e);

    expect(err.message).toBe('Circular dependency detected: A -> B -> A');
  });
});

// ---------------------------------------------------------------------------
// Child containers
// ---------------------------------------------------------------------------

describe('Container — child containers', () => {
  it('child inherits parent registrations', async () => {
    const T = createToken<string>('T');
    const root = createContainer();

    root.value(T, 'from-root');

    const child = root.createChild();

    await expect(child.resolve(T)).resolves.toBe('from-root');
  });

  it('child local registration shadows the parent registration', async () => {
    const T = createToken<string>('T');
    const root = createContainer();

    root.value(T, 'parent');

    const child = root.createChild();

    child.value(T, 'child');

    await expect(child.resolve(T)).resolves.toBe('child');
    await expect(root.resolve(T)).resolves.toBe('parent');
  });

  it('parent cannot see child-only registrations', async () => {
    const T = createToken<string>('ChildOnly');
    const root = createContainer();
    const child = root.createChild();

    child.value(T, 'child');

    await expect(root.resolve(T)).rejects.toThrow(ProviderNotFoundError);
  });

  it('separate children do not share scoped instances', async () => {
    let n = 0;
    const T = createToken<object>('T');
    const root = createContainer();

    root.factory(T, () => ({ id: ++n }), { lifetime: 'scoped' });

    const c1 = root.createChild();
    const c2 = root.createChild();

    const a = await c1.resolve(T);
    const b = await c2.resolve(T);

    expect(a).not.toBe(b);
  });

  it('child can resolve its own local registrations after parent is disposed', async () => {
    const T = createToken<string>('T');
    const root = createContainer();
    const child = root.createChild();

    child.value(T, 'local');
    await root.dispose();

    await expect(child.resolve(T)).resolves.toBe('local');
  });

  it('child throws ContainerDisposedError when token lives only in disposed parent', async () => {
    const T = createToken<string>('T');
    const root = createContainer();
    const child = root.createChild();

    root.value(T, 'parent-only');
    await root.dispose();

    await expect(child.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });
});

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

describe('Container — disposal', () => {
  it('calls the dispose hook on a resolved singleton', async () => {
    const log: string[] = [];
    const T = createToken<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => log.push('done') });

    await c.resolve(T);
    await c.dispose();

    expect(log).toEqual(['done']);
  });

  it('does not call the dispose hook for an unresolved factory', async () => {
    const log: string[] = [];
    const T = createToken<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => log.push('should-not-run') });

    await c.dispose();

    expect(log).toHaveLength(0);
  });

  it('does not call a dispose hook on a value provider', async () => {
    // value() takes no dispose option — just confirms disposal does not throw
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'static');
    await c.resolve(T);

    await expect(c.dispose()).resolves.not.toThrow();
  });

  it('calls dispose hooks for scoped instances on the child that owns them', async () => {
    const log: string[] = [];
    const T = createToken<object>('T');
    const root = createContainer();

    root.factory(T, () => ({}), { dispose: () => log.push('scoped-done'), lifetime: 'scoped' });

    const child = root.createChild();

    await child.resolve(T);
    await child.dispose();

    expect(log).toEqual(['scoped-done']);
  });

  it('runs all dispose hooks even if one throws, collecting failures in AggregateError', async () => {
    const A = createToken<object>('A');
    const B = createToken<object>('B');
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

    const err = await c.dispose().catch((e) => e);

    expect(err).toBeInstanceOf(AggregateError);
    expect(err.errors).toHaveLength(2);
  });

  it('marks the container as disposed even when a hook throws', async () => {
    const T = createToken<object>('T');
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
    const T = createToken<object>('T');
    const c = createContainer();

    c.factory(T, () => ({}), { dispose: () => log.push('hook') });

    await c.resolve(T);
    await c.dispose();
    await c.dispose();

    expect(log).toHaveLength(1);
  });

  it('Symbol.asyncDispose delegates to dispose()', async () => {
    const T = createToken<string>('T');
    const c = createContainer();

    c.value(T, 'v');
    await c[Symbol.asyncDispose]();

    expect(c.disposed).toBe(true);
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
    const T = createToken<string>('T');
    const c = await disposedContainer();

    await expect(c.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });

  it('resolveOptional throws ContainerDisposedError (does not swallow it)', async () => {
    const T = createToken<string>('T');
    const c = await disposedContainer();

    await expect(c.resolveOptional(T)).rejects.toThrow(ContainerDisposedError);
  });

  it('resolveMany throws ContainerDisposedError', async () => {
    const T = createToken<string>('T');
    const c = await disposedContainer();

    await expect(c.resolveMany(T)).rejects.toThrow(ContainerDisposedError);
  });

  it('value() throws ContainerDisposedError', async () => {
    const T = createToken<string>('T');
    const c = await disposedContainer();

    expect(() => c.value(T, 'x')).toThrow(ContainerDisposedError);
  });

  it('factory() throws ContainerDisposedError', async () => {
    const T = createToken<string>('T');
    const c = await disposedContainer();

    expect(() => c.factory(T, () => 'x')).toThrow(ContainerDisposedError);
  });

  it('createChild() throws ContainerDisposedError', async () => {
    const c = await disposedContainer();

    expect(() => c.createChild()).toThrow(ContainerDisposedError);
  });

  it('resolving from a child throws when the parent has been disposed', async () => {
    const T = createToken<string>('T');
    const root = createContainer();
    const child = root.createChild();

    root.value(T, 'v');
    await root.dispose();

    await expect(child.resolve(T)).rejects.toThrow(ContainerDisposedError);
  });
});
