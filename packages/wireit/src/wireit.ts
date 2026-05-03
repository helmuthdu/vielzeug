/**
 * Wireit — Lightweight typed dependency injection container
 *
 * @example
 * ```ts
 * import { createContainer, createToken } from '@vielzeug/wireit';
 *
 * const DbToken = createToken<Database>('Database');
 * const ServiceToken = createToken<UserService>('UserService');
 * const container = createContainer();
 *
 * container
 *   .factory(DbToken, () => new Database(process.env.DB_URL!))
 *   .bind(ServiceToken, UserService, { deps: [DbToken] });
 *
 * const service = await container.resolve(ServiceToken);
 * ```
 */

/** -------------------- Types -------------------- **/

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueProvider<T> = { useValue: T };

/** Shared fields for class and factory providers. */
type BaseProvider<T, Deps extends unknown[] = any[]> = {
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
};

export type ClassProvider<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  useClass: new (...args: Deps) => T;
};

export type FactoryProvider<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  useFactory: (...deps: Deps) => T | Promise<T>;
};

export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

/** Options for `factory()` and `bind()`. Can be imported for userland higher-order helpers. */
export type ProviderOptions<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  overwrite?: boolean;
};

/** Extracts the value types from a tuple of tokens, preserving position. */
export type TokenValues<T extends readonly Token<any>[]> = {
  [K in keyof T]: T[K] extends Token<infer V> ? V : never;
};

/** -------------------- Token -------------------- **/

/**
 * Creates a typed token for dependency injection.
 * The description is required — it appears in error messages and `debug()` output.
 */
export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

/** -------------------- Errors -------------------- **/

const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

export class CircularDependencyError extends Error {
  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' → ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ProviderNotFoundError extends Error {
  constructor(token: Token<any>) {
    super(`No provider registered for token: ${tokenName(token)}`);
    this.name = 'ProviderNotFoundError';
  }
}

export class AliasCycleError extends Error {
  constructor(cycle: Token<any>[]) {
    super(`Alias cycle detected: ${cycle.map(tokenName).join(' → ')}`);
    this.name = 'AliasCycleError';
  }
}

export class ContainerDisposedError extends Error {
  constructor() {
    super('Cannot use a disposed container.');
    this.name = 'ContainerDisposedError';
  }
}

/** -------------------- Internal -------------------- **/

type Registration<T = unknown> = {
  instance?: T;
  promise?: Promise<T>;
  provider: Provider<T>;
  resolved?: boolean;
};

type SnapshotData = [Map<Token<any>, Registration<any>>, Map<Token<any>, Token<any>>];

/** Opaque handle returned by `snapshot()` and accepted by `restore()`. */
export type Snapshot = {
  readonly aliases: ReadonlyMap<Token<any>, Token<any>>;
  readonly registry: ReadonlyMap<Token<any>, Registration<any>>;
};

/** -------------------- Container -------------------- **/

export class Container {
  #registry = new Map<Token<any>, Registration<any>>();
  #aliases = new Map<Token<any>, Token<any>>();
  #retired: Registration<any>[] = [];
  #parent?: Container;
  #disposed = false;

  private constructor(parent?: Container) {
    this.#parent = parent;
  }

  /** Create a new root dependency injection container. */
  static create(): Container {
    return new Container();
  }

  /* ---- Registration ---- */

  /**
   * Register a provider for a token.
   * Both `useClass` and `useFactory` default to `singleton` lifetime.
   * Re-registering an existing token throws — pass `{ overwrite: true }` to replace intentionally.
   */
  #register<T>(token: Token<T>, provider: Provider<T>, { overwrite = false } = {}): this {
    this.#assertNotDisposed();

    if (!overwrite && this.#registry.has(token)) {
      throw new Error(`Token "${tokenName(token)}" is already registered. Use { overwrite: true } to replace it.`);
    }

    // Track the replaced registration for later cleanup
    const prev = this.#registry.get(token);

    if (prev?.resolved) {
      this.#retired.push(prev);
    }

    this.#registry.set(token, { provider });

    return this;
  }

  /**
   * Register a plain value.
   * @example
   * container.value(Config, { apiUrl: 'https://api.example.com' });
   */
  value<T>(token: Token<T>, val: T, opts?: { overwrite?: boolean }): this {
    return this.#register(token, { useValue: val }, opts);
  }

  /**
   * Register a factory function.
   * Shorthand for `register(token, { useFactory: fn, ...opts })`.
   * @example
   * container.factory(DbToken, () => new Database(env.DB_URL));
   * container.factory(SvcToken, (db) => new Svc(db), { deps: [DbToken], lifetime: 'transient' });
   */
  factory<T, Deps extends unknown[] = any[]>(
    token: Token<T>,
    fn: (...deps: Deps) => T | Promise<T>,
    opts?: ProviderOptions<T, Deps>,
  ): this {
    const { overwrite, ...providerOpts } = opts ?? {};

    return this.#register(token, { useFactory: fn, ...providerOpts } as FactoryProvider<T>, { overwrite });
  }

  /**
   * Bind a class to a token.
   * Shorthand for `register(token, { useClass: cls, ...opts })`.
   * @example
   * container.bind(ServiceToken, ServiceImpl, { deps: [DbToken] });
   */
  bind<T, Deps extends unknown[] = any[]>(
    token: Token<T>,
    cls: new (...args: Deps) => T,
    opts?: ProviderOptions<T, Deps>,
  ): this {
    const { overwrite, ...providerOpts } = opts ?? {};

    return this.#register(token, { useClass: cls, ...providerOpts } as ClassProvider<T>, { overwrite });
  }

  /**
   * Make `token` an alias that resolves to `source`.
   * @example
   * container.alias(IUserService, UserServiceImpl);
   */
  alias<T>(token: Token<T>, source: Token<T>): this {
    this.#assertNotDisposed();
    this.#aliases.set(token, source);

    return this;
  }

  /** Remove a registration. */
  unregister<T>(token: Token<T>): this {
    this.#assertNotDisposed();
    this.#registry.delete(token);

    return this;
  }

  /** Clear all registrations and aliases in this container without running dispose hooks. */
  clear(): this {
    this.#assertNotDisposed();
    this.#registry.clear();
    this.#aliases.clear();

    return this;
  }

  /* ---- Lifecycle ---- */

  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Dispose all singleton/scoped instances by calling their `dispose` hooks (if any),
   * then clear all registrations. Calling `dispose()` multiple times is safe (idempotent).
   */
  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;

    const hooks: Promise<void>[] = [];

    for (const reg of [...this.#registry.values(), ...this.#retired]) {
      const { instance, provider, resolved } = reg;

      if (resolved && 'dispose' in provider && provider.dispose) {
        hooks.push(Promise.resolve().then(() => provider.dispose!(instance as any)));
      }
    }

    if (hooks.length > 0) {
      const outcomes = await Promise.allSettled(hooks);
      const failures = outcomes.filter((o): o is PromiseRejectedResult => o.status === 'rejected').map((o) => o.reason);

      if (failures.length > 0) {
        throw new AggregateError(failures, 'One or more dispose hooks failed.');
      }
    }

    this.#retired = [];
    this.#registry.clear();
    this.#aliases.clear();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  /* ---- Resolution ---- */

  /** Check if a token is registered (including parent containers). */
  has(token: Token<any>): boolean {
    this.#assertNotDisposed();

    return this.#getRegistration(this.#resolveAlias(token)) !== undefined;
  }

  /* ---- Hierarchy ---- */

  /**
   * Create a child container that inherits all registrations from this container.
   * `scoped` providers will create one instance per child container.
   * @example
   * const child = container.createChild();
   * child.value(RequestContext, ctx);
   */
  createChild(): Container {
    this.#assertNotDisposed();

    return new Container(this);
  }

  /**
   * Run a function inside a scoped child container that is automatically disposed afterwards.
   * @example
   * await container.runInScope(async (scope) => {
   *   scope.value(RequestId, generateId());
   *   const service = await scope.resolve(RequestScopedService);
   *   await service.process();
   * });
   */
  async runInScope<T>(fn: (scope: Container) => Promise<T> | T): Promise<Awaited<T>> {
    const scope = this.createChild();

    try {
      return await fn(scope);
    } finally {
      await scope.dispose();
    }
  }

  /**
   * Temporarily replace a token's registration with a mock provider,
   * then restore the original (including any cached singleton instance) after `fn` returns.
   * @example
   * const result = await container.mock(DbToken, { useValue: fakeDb }, () => svc.doWork());
   * await container.mock(DbToken, { useFactory: () => createInMemoryDb() }, fn);
   */
  async mock<T, R>(token: Token<T>, provider: Provider<T>, fn: () => Promise<R> | R): Promise<R> {
    const snap = this.snapshot();

    this.#register(token, provider, { overwrite: true });

    try {
      return await fn();
    } finally {
      this.restore(snap);
    }
  }

  /**
   * Resolve a token asynchronously (works for both sync and async providers).
   * This is the primary resolution method in a greenfield design.
   * @example
   * const config = await container.resolve(ConfigToken);
   * const [db, cache] = await container.resolveAll([DbToken, CacheToken]);
   */
  async resolve<T>(token: Token<T>): Promise<T> {
    this.#assertNotDisposed();

    return this.#resolveAsync(token, [], new Set());
  }

  /**
   * Resolve multiple tokens, returning a typed tuple.
   * @example
   * const [db, logger, config] = await container.resolveAll([DbToken, LoggerToken, ConfigToken]);
   */
  async resolveAll<T extends readonly Token<any>[]>(tokens: [...T]): Promise<TokenValues<T>> {
    this.#assertNotDisposed();

    return Promise.all(tokens.map((t) => this.resolve(t))) as unknown as Promise<TokenValues<T>>;
  }

  /**
   * Resolve a token, returning `undefined` if not registered.
   * @example
   * const cache = await container.resolveOptional(CacheToken);
   * if (cache) { ... }
   */
  async resolveOptional<T>(token: Token<T>): Promise<T | undefined> {
    try {
      return await this.resolve(token);
    } catch (e) {
      if (e instanceof ProviderNotFoundError) return undefined;

      throw e;
    }
  }

  /* ---- Snapshot / Restore ---- */

  /**
   * Take a snapshot of all current local registrations and aliases, including cached instances.
   * Useful for temporarily overriding providers in tests.
   * @see restore
   */
  snapshot(): Snapshot {
    this.#assertNotDisposed();

    return {
      aliases: new Map(this.#aliases),
      registry: new Map(this.#registry),
    };
  }

  /**
   * Restore registrations and aliases from a previous snapshot.
   * @see snapshot
   */
  restore(snap: Snapshot): this {
    this.#assertNotDisposed();

    const registry = snap.registry as SnapshotData[0];
    const aliases = snap.aliases as SnapshotData[1];

    // Track resolved registrations that are being replaced
    for (const [token, currentReg] of this.#registry.entries()) {
      const restoredReg = registry.get(token);

      if (currentReg.resolved && (!restoredReg || restoredReg !== currentReg)) {
        this.#retired.push(currentReg);
      }
    }

    this.#registry = new Map(registry);
    this.#aliases = new Map(aliases);

    return this;
  }

  /** Get debug information about all registered tokens and aliases, including inherited ones from parent containers. */
  debug(): {
    aliases: Array<[string, string]>;
    tokens: Array<{ lifetime: Lifetime; name: string; provider: 'class' | 'factory' | 'value'; resolved: boolean }>;
  } {
    const seenTokens = new Map<
      Token<any>,
      { lifetime: Lifetime; name: string; provider: 'class' | 'factory' | 'value'; resolved: boolean }
    >();
    const seenAliases = new Map<Token<any>, [string, string]>();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Container | undefined = this;

    while (c) {
      for (const [t, reg] of c.#registry.entries()) {
        if (!seenTokens.has(t)) {
          const provider =
            'useValue' in reg.provider ? 'value' : 'useClass' in reg.provider ? 'class' : ('factory' as const);
          const lifetime = 'lifetime' in reg.provider ? (reg.provider.lifetime ?? 'singleton') : 'singleton';

          seenTokens.set(t, {
            lifetime,
            name: tokenName(t),
            provider,
            resolved: reg.resolved ?? false,
          });
        }
      }
      for (const [from, to] of c.#aliases.entries()) {
        if (!seenAliases.has(from)) seenAliases.set(from, [tokenName(from), tokenName(to)]);
      }
      c = c.#parent;
    }

    return {
      aliases: Array.from(seenAliases.values()),
      tokens: Array.from(seenTokens.values()),
    };
  }

  /** -------------------- Private -------------------- **/

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError();
  }

  // Walk the full container chain (child-wins) to find an alias target.
  #findAlias(token: Token<any>): Token<any> | undefined {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Container | undefined = this;

    while (c) {
      if (c.#aliases.has(token)) return c.#aliases.get(token);

      c = c.#parent;
    }

    return undefined;
  }

  // Resolves alias chains, walking parent containers and detecting cycles.
  // Aliases defined in any ancestor are visible to descendant containers.
  #resolveAlias<T>(token: Token<T>): Token<T> {
    const visited = new Set<Token<any>>();
    const path: Token<any>[] = [];
    let current: Token<any> = token;

    for (;;) {
      const target = this.#findAlias(current);

      if (!target) break;

      if (visited.has(current)) throw new AliasCycleError([...path, current]);

      visited.add(current);
      path.push(current);
      current = target;
    }

    return current as Token<T>;
  }

  // Looks up a registration by an already-resolved (non-alias) token, walking the parent chain.
  #getRegistration<T>(resolved: Token<T>): Registration<T> | undefined {
    return this.#registry.get(resolved) ?? (this.#parent ? this.#parent.#getRegistration(resolved) : undefined);
  }

  // Gets or creates a local registration entry (used for scoped caching in children).
  #localReg<T>(token: Token<T>, provider: Provider<T>): Registration<T> {
    let reg = this.#registry.get(token) as Registration<T> | undefined;

    if (!reg) {
      reg = { provider };
      this.#registry.set(token, reg);
    }

    return reg;
  }

  async #resolveAsync<T>(token: Token<T>, stack: Token<any>[], seen: Set<Token<any>>): Promise<T> {
    const resolved = this.#resolveAlias(token);

    if (seen.has(resolved)) throw new CircularDependencyError([...stack, resolved]);

    const reg = this.#getRegistration(resolved);

    if (!reg) throw new ProviderNotFoundError(resolved);

    const { provider } = reg;

    if ('useValue' in provider) return (provider as ValueProvider<T>).useValue;

    const p = provider as ClassProvider<T> | FactoryProvider<T>;
    const { deps = [], lifetime = 'singleton' } = p;

    stack.push(resolved);
    seen.add(resolved);

    const build = async (): Promise<T> => {
      const args = await Promise.all(
        (deps as Token<any>[]).map((dep) => this.#resolveAsync(dep, [...stack], new Set(seen))),
      );

      return (
        'useClass' in p
          ? new (p as ClassProvider<T>).useClass(...args)
          : await (p as FactoryProvider<T>).useFactory(...args)
      ) as T;
    };

    // Deduplicates concurrent singleton resolutions using a shared in-flight promise.
    const cache = (cacheReg: Registration<T>): Promise<T> => {
      if (cacheReg.resolved) return Promise.resolve(cacheReg.instance as T);

      cacheReg.promise ??= build()
        .then((inst) => {
          cacheReg.instance = inst;
          cacheReg.resolved = true;

          return inst;
        })
        .finally(() => {
          cacheReg.promise = undefined;
        });

      return cacheReg.promise;
    };

    try {
      if (lifetime === 'scoped' && this.#parent) return cache(this.#localReg(resolved, provider));

      return lifetime === 'singleton' ? cache(reg) : build();
    } finally {
      stack.pop();
      seen.delete(resolved);
    }
  }
}

/** -------------------- Factory -------------------- **/

/**
 * Create a new root dependency injection container.
 * @example
 * const container = createContainer();
 */
export function createContainer(): Container {
  return Container.create();
}

/** -------------------- Testing Helpers -------------------- **/

/**
 * Create an isolated child test container.
 * Registrations in the child are isolated from the base container.
 * @example
 * const testContainer = createTestContainer();
 * testContainer.value(Config, testConfig);
 * // ... run tests
 * await testContainer.dispose();
 */
export function createTestContainer(base?: Container): Container {
  return (base ?? Container.create()).createChild();
}
