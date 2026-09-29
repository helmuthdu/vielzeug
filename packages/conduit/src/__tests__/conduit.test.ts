import { describe, expect, it, vi } from 'vitest';

import {
  ConduitCircularDependencyError,
  ConduitDisposedError,
  ConduitDisposeError,
  ConduitDuplicateRegistrationError,
  ConduitProviderNotFoundError,
  createContainer,
  disposalSignalToken,
  factoryProvider,
  token,
  valueProvider,
} from '../index';

describe('Conduit', () => {
  it('creates unique typed tokens', () => {
    expect(token<string>('Service')).not.toBe(token<string>('Service'));
  });

  it('resolves a typed service object from a composition root', async () => {
    const Config = token<{ url: string }>('Config');
    const Client = token<{ url: string }>('Client');

    const container = createContainer([
      { token: Config, value: { url: '/api' } },
      { dependencies: [Config], factory: (config) => ({ url: (config as { url: string }).url }), token: Client },
    ]);

    const services = await container.resolve({ client: Client, config: Config });

    expect(services.config).toEqual({ url: '/api' });
    expect(services.client).toEqual({ url: '/api' });

    await container.dispose();
  });

  it('deduplicates concurrent singleton resolution', async () => {
    const Service = token<object>('Service');
    const create = vi.fn(async () => ({}));

    const container = createContainer([{ dependencies: [], factory: create, token: Service }]);

    const services = await Promise.all([container.resolve({ a: Service }), container.resolve({ b: Service })]);

    expect(create).toHaveBeenCalledOnce();
    expect(services[0].a).toBe(services[1].b);

    await container.dispose();
  });

  it('caches singletons per registering child container', async () => {
    const Session = token<object>('Session');

    const root = createContainer([{ dependencies: [], factory: () => ({}), token: Session }]);

    const firstScope = root.createScope({ providers: [{ dependencies: [], factory: () => ({}), token: Session }] });
    const secondScope = root.createScope({ providers: [{ dependencies: [], factory: () => ({}), token: Session }] });

    const first = await firstScope.resolve({ a: Session });
    const firstAgain = await firstScope.resolve({ b: Session });
    const second = await secondScope.resolve({ a: Session });

    expect(first.a).toBe(firstAgain.b);
    expect(first.a).not.toBe(second.a);

    await firstScope.dispose();
    await secondScope.dispose();
    await root.dispose();
  });

  it('fails fast at construction for missing dependencies', () => {
    const A = token<object>('A');
    const missing = token<object>('Missing');

    expect(() => createContainer([{ dependencies: [missing], factory: () => ({}), token: A }])).toThrow(
      ConduitProviderNotFoundError,
    );
  });

  it('fails fast at construction for circular factory tuples', () => {
    const A = token<object>('A');
    const B = token<object>('B');

    expect(() =>
      createContainer([
        { dependencies: [B], factory: () => ({}), token: A },
        { dependencies: [A], factory: () => ({}), token: B },
      ]),
    ).toThrow(ConduitCircularDependencyError);
  });

  it('fails fast when a singleton depends on a transient factory', () => {
    const Session = token<object>('Session');
    const Service = token<{ session: object }>('Service');

    expect(() =>
      createContainer([
        { dependencies: [], factory: () => ({}), lifetime: 'transient', token: Session },
        { dependencies: [Session], factory: (session) => ({ session }), token: Service },
      ]),
    ).toThrow(/cannot depend on a transient factory/);
  });

  it('fails fast at construction for duplicate tokens', () => {
    const Config = token<object>('Config');

    expect(() =>
      createContainer([
        { token: Config, value: {} },
        { token: Config, value: {} },
      ]),
    ).toThrow(ConduitDuplicateRegistrationError);
  });

  it('snapshots factory dependencies at construction', async () => {
    const Config = token<object>('Config');
    const Service = token<object>('Service');
    const dependencies = [Config];

    const container = createContainer([
      { token: Config, value: {} },
      { dependencies, factory: () => ({}), token: Service },
    ]);

    dependencies.push(token<object>('Missing'));

    await expect(container.resolve({ service: Service })).resolves.toEqual({ service: {} });

    await container.dispose();
  });

  it('disposes dependents before dependencies in reverse creation order', async () => {
    const Database = token<{ name: string }>('Database');
    const Service = token<{ database: { name: string } }>('Service');
    const order: string[] = [];

    const container = createContainer([
      {
        dependencies: [],
        dispose: () => {
          order.push('database');
        },
        factory: () => ({ name: 'db' }),
        token: Database,
      },
      {
        dependencies: [Database],
        dispose: () => {
          order.push('service');
        },
        factory: (database) => ({ database }),
        token: Service,
      },
    ]);

    await container.resolve({ service: Service });
    await container.dispose();

    expect(order).toEqual(['service', 'database']);
  });

  it('disposes child containers when parent container ends', async () => {
    const Session = token<object>('Session');
    const dispose = vi.fn();

    const root = createContainer([]);
    const request = root.createScope({
      providers: [{ dependencies: [], dispose, factory: () => ({}), token: Session }],
    });
    await request.resolve({ session: Session });

    await root.dispose();

    expect(dispose).toHaveBeenCalledOnce();
    expect(request.disposed).toBe(true);
  });

  it('cleans an in-flight factory that resolves during disposal', async () => {
    const Service = token<object>('Service');
    let release!: (value: object) => void;
    const pending = new Promise<object>((resolve) => (release = resolve));
    const dispose = vi.fn();

    const container = createContainer([{ dependencies: [], dispose, factory: () => pending, token: Service }]);

    const resolution = container.resolve({ service: Service });
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

    const container = createContainer([
      {
        dependencies: [],
        dispose: () => {
          throw cleanupFailure;
        },
        factory: () => pending,
        token: Service,
      },
    ]);

    const resolution = container.resolve({ service: Service });
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

    const container = createContainer([
      { dispose: firstDispose, token: First, value: {} },
      { dispose: secondDispose, token: Second, value: {} },
    ]);

    const error = await container.dispose().catch((reason) => reason);

    expect(error).toBeInstanceOf(ConduitDisposeError);
    expect((error as ConduitDisposeError).errors).toHaveLength(2);
    expect(firstDispose).toHaveBeenCalledOnce();
    expect(secondDispose).toHaveBeenCalledOnce();
  });

  it('rejects work after disposal and supports await using', async () => {
    const Value = token<string>('Value');

    const container = createContainer([{ token: Value, value: 'value' }]);
    await container.dispose();

    await expect(container.resolve({ value: Value })).rejects.toBeInstanceOf(ConduitDisposedError);
  });

  it('checks registration visibility across parent containers', async () => {
    const Session = token<object>('Session');

    const root = createContainer([valueProvider(Session, {})]);

    const request = root.createScope();

    expect(root.has(Session)).toBe(true);
    expect(request.has(Session)).toBe(true);

    await request.dispose();
    await root.dispose();
  });

  it('provides typed builders and direct token resolution', async () => {
    const Config = token<{ url: string }>('Config');
    const Client = token<{ url: string }>('Client');
    const container = createContainer([
      valueProvider(Config, { url: '/api' }),
      factoryProvider(Client, [Config], (config) => ({ url: config.url })),
    ]);

    await expect(container.resolve(Client)).resolves.toEqual({ url: '/api' });
    await container.dispose();
  });

  it('supports transient factories and immutable child-local overrides', async () => {
    const Config = token<string>('Config');
    const Transient = token<object>('Transient');
    const root = createContainer([
      valueProvider(Config, 'root'),
      factoryProvider(Transient, [], () => ({}), { lifetime: 'transient' }),
    ]);
    const request = root.createScope({ providers: [valueProvider(Config, 'request')] });

    await expect(request.resolve(Config)).resolves.toBe('request');
    expect(await request.resolve(Transient)).not.toBe(await request.resolve(Transient));

    await root.dispose();
  });

  it('injects the owning container disposal signal', async () => {
    const Signal = token<AbortSignal>('Signal');
    const root = createContainer([]);
    const request = root.createScope({
      providers: [factoryProvider(Signal, [disposalSignalToken], (signal) => signal)],
    });
    const signal = await request.resolve(Signal);

    expect(signal).toBe(request.disposalSignal);
    await request.dispose();
    expect(signal.aborted).toBe(true);
    await root.dispose();
  });

  it('defines composition-map properties without prototype mutation', async () => {
    const Service = token<object>('Service');
    const map = Object.create(null) as { __proto__: typeof Service };

    Object.defineProperty(map, '__proto__', { enumerable: true, value: Service });

    const container = createContainer([valueProvider(Service, { safe: true })]);
    const services = await container.resolve(map);

    expect(Object.hasOwn(services, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(services)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(services, '__proto__')?.value).toEqual({ safe: true });

    await container.dispose();
  });

  it('waits for late asynchronous cleanup and reports its failure', async () => {
    const Service = token<object>('Service');
    const cleanupFailure = new Error('late cleanup');
    let releaseFactory!: (value: object) => void;
    let releaseCleanup!: () => void;
    const factory = new Promise<object>((resolve) => (releaseFactory = resolve));
    const cleanup = new Promise<void>((resolve) => (releaseCleanup = resolve));
    const container = createContainer([
      factoryProvider(Service, [], () => factory, {
        dispose: async () => {
          await cleanup;
          throw cleanupFailure;
        },
      }),
    ]);

    const resolution = container.resolve(Service);
    const disposal = container.dispose();

    releaseFactory({});
    await Promise.resolve();
    expect(container.disposed).toBe(false);
    releaseCleanup();

    await expect(resolution).rejects.toBeInstanceOf(ConduitDisposedError);
    await expect(disposal).rejects.toMatchObject({ errors: [cleanupFailure] });
  });

  it('retries singleton creation after rejection', async () => {
    const Service = token<object>('Service');
    let attempts = 0;
    const container = createContainer([
      factoryProvider(Service, [], () => {
        attempts += 1;
        if (attempts === 1) throw new Error('retry');
        return {};
      }),
    ]);

    await expect(container.resolve(Service)).rejects.toThrow('retry');
    await expect(container.resolve(Service)).resolves.toEqual({});
    expect(attempts).toBe(2);

    await container.dispose();
  });

  it('rejects malformed providers and transient singleton dependencies at construction', () => {
    const Dependency = token<object>('Dependency');
    const Service = token<object>('Service');

    expect(() => createContainer([{ dependencies: [], token: Service, value: {} } as never])).toThrow(/provider/i);
    expect(() =>
      createContainer([
        factoryProvider(Dependency, [], () => ({}), { lifetime: 'transient' }),
        factoryProvider(Service, [Dependency], (dependency) => ({ dependency })),
      ]),
    ).toThrow(/cannot depend on a transient factory/);
  });
});
