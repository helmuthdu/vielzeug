import { describe, expect, it, vi } from 'vitest';

import {
  ConduitCircularDependencyError,
  ConduitDisposeError,
  ConduitDisposedError,
  ConduitProviderNotFoundError,
  ConduitScopedResolutionError,
  createContainer,
  scope,
  token,
} from '../index';

describe('Conduit', () => {
  it('creates unique typed tokens', () => {
    expect(token<string>('Service')).not.toBe(token<string>('Service'));
  });

  it('resolves values and dependency-first factories', async () => {
    const Config = token<{ url: string }>('Config');
    const Client = token<{ url: string }>('Client');
    const container = createContainer();

    container.value(Config, { url: '/api' });
    container.factory(Client, [Config], (config) => ({ url: config.url }));

    await expect(container.resolve(Client)).resolves.toEqual({ url: '/api' });
    await container.dispose();
  });

  it('deduplicates concurrent singleton resolution', async () => {
    const Service = token<object>('Service');
    const create = vi.fn(async () => ({}));
    const container = createContainer();

    container.factory(Service, [], create);

    const [first, second] = await Promise.all([container.resolve(Service), container.resolve(Service)]);

    expect(create).toHaveBeenCalledOnce();
    expect(first).toBe(second);
    await container.dispose();
  });

  it('creates and disposes transient values for each requesting container', async () => {
    const Service = token<{ id: number }>('Service');
    const dispose = vi.fn();
    const container = createContainer();

    container.factory(Service, [], () => ({ id: Math.random() }), { dispose, lifetime: 'transient' });

    expect(await container.resolve(Service)).not.toBe(await container.resolve(Service));

    await container.dispose();
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('creates one named-scope value per matching scope', async () => {
    const Request = scope('request');
    const Session = token<object>('Session');
    const root = createContainer();

    root.factory(Session, [], () => ({}), { lifetime: Request });

    await expect(root.resolve(Session)).rejects.toBeInstanceOf(ConduitScopedResolutionError);

    const firstScope = root.createScope(Request);
    const secondScope = root.createScope(Request);

    expect(await firstScope.resolve(Session)).toBe(await firstScope.resolve(Session));
    expect(await firstScope.resolve(Session)).not.toBe(await secondScope.resolve(Session));

    await firstScope.dispose();
    await secondScope.dispose();
    await root.dispose();
  });

  it('validates missing and circular static dependencies', () => {
    const A = token<object>('A');
    const B = token<object>('B');
    const missing = token<object>('Missing');
    const container = createContainer();

    container.factory(A, [missing], () => ({}));
    expect(() => container.validate()).toThrow(ConduitProviderNotFoundError);

    const circular = createContainer();

    circular.factory(A, [B], () => ({}));
    circular.factory(B, [A], () => ({}));

    expect(() => circular.validate()).toThrow(ConduitCircularDependencyError);
  });

  it('rejects direct runtime cycles', async () => {
    const A = token<object>('A');
    const B = token<object>('B');
    const container = createContainer();

    container.factory(A, [B], () => ({}));
    container.factory(B, [A], () => ({}));

    await expect(container.resolve(A)).rejects.toBeInstanceOf(ConduitCircularDependencyError);
  });

  it('rejects singleton dependencies requiring a child scope', async () => {
    const Request = scope('request');
    const Session = token<object>('Session');
    const Service = token<{ session: object }>('Service');
    const root = createContainer();
    const request = root.createScope(Request);

    root.factory(Session, [], () => ({}), { lifetime: Request });
    root.factory(Service, [Session], (session) => ({ session }));

    await expect(request.resolve(Service)).rejects.toBeInstanceOf(ConduitScopedResolutionError);
    await request.dispose();
    await root.dispose();
  });

  it('validates parent singleton dependencies from their registration owner', () => {
    const Config = token<object>('Config');
    const Service = token<object>('Service');
    const root = createContainer();
    const child = root.createScope();

    root.factory(Service, [Config], () => ({}));
    child.value(Config, {});

    expect(() => child.validate()).toThrow(ConduitProviderNotFoundError);
  });

  it('snapshots factory dependencies at registration', async () => {
    const Config = token<object>('Config');
    const Missing = token<object>('Missing');
    const Service = token<object>('Service');
    const dependencies = [Config];
    const container = createContainer();

    container.value(Config, {});
    container.factory(Service, dependencies, () => ({}));
    container.validate();
    dependencies.push(Missing);

    await expect(container.resolve(Service)).resolves.toEqual({});
    await container.dispose();
  });

  it('does not retain non-disposable transient values', async () => {
    const Service = token<object>('Service');
    const container = createContainer();

    container.factory(Service, [], () => ({}), { lifetime: 'transient' });

    await container.resolve(Service);
    await container.dispose();

    expect(container.disposed).toBe(true);
  });

  it('disposes dependents before dependencies in reverse creation order', async () => {
    const Database = token<{ name: string }>('Database');
    const Service = token<{ database: { name: string } }>('Service');
    const order: string[] = [];
    const container = createContainer();

    container.factory(Database, [], () => ({ name: 'db' }), {
      dispose: () => {
        order.push('database');
      },
    });
    container.factory(Service, [Database], (database) => ({ database }), {
      dispose: () => {
        order.push('service');
      },
    });

    await container.resolve(Service);
    await container.dispose();

    expect(order).toEqual(['service', 'database']);
  });

  it('disposes child scopes when parent container ends', async () => {
    const Request = scope('request');
    const Session = token<object>('Session');
    const dispose = vi.fn();
    const root = createContainer();
    const request = root.createScope(Request);

    root.factory(Session, [], () => ({}), { dispose, lifetime: Request });
    await request.resolve(Session);

    await root.dispose();

    expect(dispose).toHaveBeenCalledOnce();
    expect(request.disposed).toBe(true);
  });

  it('cleans an in-flight factory that resolves during disposal', async () => {
    const Service = token<object>('Service');
    let release!: (value: object) => void;
    const pending = new Promise<object>((resolve) => (release = resolve));
    const dispose = vi.fn();
    const container = createContainer();

    container.factory(Service, [], () => pending, { dispose });

    const resolution = container.resolve(Service);
    const disposal = container.dispose();

    release({});

    await expect(resolution).rejects.toBeInstanceOf(ConduitDisposedError);
    await disposal;
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('reports cleanup failure from an in-flight factory completing during disposal', async () => {
    const Service = token<object>('Service');
    const cleanupFailure = new Error('cleanup failed');
    let release!: (value: object) => void;
    const pending = new Promise<object>((resolve) => (release = resolve));
    const container = createContainer();

    container.factory(Service, [], () => pending, {
      dispose: () => {
        throw cleanupFailure;
      },
    });

    const resolution = container.resolve(Service);
    const disposal = container.dispose();

    release({});

    await expect(resolution).rejects.toBeInstanceOf(ConduitDisposedError);
    await expect(disposal).rejects.toMatchObject({ errors: [cleanupFailure] });
  });

  it('aggregates cleanup failures after attempting every hook', async () => {
    const First = token<object>('First');
    const Second = token<object>('Second');
    const firstDispose = vi.fn(() => {
      throw new Error('first');
    });
    const secondDispose = vi.fn(() => {
      throw new Error('second');
    });
    const container = createContainer();

    container.value(First, {}, { dispose: firstDispose });
    container.value(Second, {}, { dispose: secondDispose });

    const error = await container.dispose().catch((reason) => reason);

    expect(error).toBeInstanceOf(ConduitDisposeError);
    expect((error as ConduitDisposeError).errors).toHaveLength(2);
    expect(firstDispose).toHaveBeenCalledOnce();
    expect(secondDispose).toHaveBeenCalledOnce();
  });

  it('rejects work after disposal and supports await using', async () => {
    const Value = token<string>('Value');
    const container = createContainer();

    container.value(Value, 'value');
    await container.dispose();

    await expect(container.resolve(Value)).rejects.toBeInstanceOf(ConduitDisposedError);
  });
});
