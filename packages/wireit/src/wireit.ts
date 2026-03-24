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
 * const service = container.get(ServiceToken);
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

/** Opaque handle returned by `snapshot()` and accepted by `restore()`. */
export type Snapshot = { readonly __snapshot: never };

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

export class AsyncProviderError extends Error {
  constructor(token: Token<any>) {
    super(`Provider for token "${tokenName(token)}" is async. Use getAsync() instead.`);
    this.name = 'AsyncProviderError';
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

// Module-scoped factory — populated by the static block below so that
// createContainer() and child getter can call the private constructor.
let _new: (parent?: Container) => Container;

/** -------------------- Container -------------------- **/

export class Container {
  #registry = new Map<Token<any>, Registration<any>>();
  #aliases = new Map<Token<any>, Token<any>>();
  #parent?: Container;
  #disposed = false;

  // Expose the private constructor to the module-scoped _new variable.
  static {
    _new = (parent) => new Container(parent);
  }

  private constructor(parent?: Container) {
    this.#parent = parent;
  }

  /* ---- Registration ---- */

  /**
   * Register a provider for a token.
   * Both `useClass` and `useFactory` default to `singleton` lifetime.
   * Re-registering an existing token throws — pass `{ overwrite: true }` to replace intentionally.
   * @example
   * container.register(UserService, { useClass: UserServiceImpl, deps: [Database] });
   * container.register(Config, { useFactory: () => loadConfig() });
   */
  register<T>(token: Token<T>, provider: Provider<T>, { overwrite = false } = {}): this {
    this.#assertNotDisposed();

    if (!overwrite && this.#registry.has(token)) {
      throw new Error(`Token "${tokenName(token)}" is already registered. Use { overwrite: true } to replace it.`);
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
    return this.register(token, { useValue: val }, opts);
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

    return this.register(token, { useFactory: fn, ...providerOpts } as FactoryProvider<T>, { overwrite });
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

    return this.register(token, { useClass: cls, ...providerOpts } as ClassProvider<T>, { overwrite });
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
    for (const reg of this.#registry.values()) {
      const { instance, provider, resolved } = reg;

      if (resolved && 'dispose' in provider && provider.dispose) {
        await provider.dispose(instance as any);
      }
    }
    this.clear();
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

  /**
   * Resolve a token synchronously.
   * @throws {AsyncProviderError} if the provider is async — use `getAsync()` instead
   * @throws {ProviderNotFoundError} if no provider is registered
   * @throws {CircularDependencyError} if a circular dependency is detected
   * @throws {ContainerDisposedError} if this container has been disposed
   */
  get<T>(token: Token<T>): T {
    this.#assertNotDisposed();

    return this.#resolve(token, [], new Set());
  }

  /**
   * Resolve a token asynchronously.
   * @throws {ContainerDisposedError} if this container has been disposed
   */
  async getAsync<T>(token: Token<T>): Promise<T> {
    this.#assertNotDisposed();

    return this.#resolveAsync(token, [], new Set());
  }

  /**
   * Resolve multiple tokens at once, returning a typed tuple.
   * @example
   * const [db, svc] = container.getAll([DbToken, ServiceToken]);
   */
  getAll<T extends readonly Token<any>[]>(tokens: [...T]): TokenValues<T> {
    this.#assertNotDisposed();

    return tokens.map((t) => this.get(t)) as unknown as TokenValues<T>;
  }

  /**
   * Resolve multiple tokens at once asynchronously, returning a typed tuple.
   * @example
   * const [db, svc] = await container.getAllAsync([DbToken, ServiceToken]);
   */
  async getAllAsync<T extends readonly Token<any>[]>(tokens: [...T]): Promise<TokenValues<T>> {
    this.#assertNotDisposed();

    return Promise.all(tokens.map((t) => this.getAsync(t))) as unknown as Promise<TokenValues<T>>;
  }

  /** Resolve a token, returning `undefined` if not registered. */
  getOptional<T>(token: Token<T>): T | undefined {
    try {
      return this.get(token);
    } catch (e) {
      if (e instanceof ProviderNotFoundError) return undefined;

      throw e;
    }
  }

  /** Resolve a token asynchronously, returning `undefined` if not registered. */
  async getOptionalAsync<T>(token: Token<T>): Promise<T | undefined> {
    try {
      return await this.getAsync(token);
    } catch (e) {
      if (e instanceof ProviderNotFoundError) return undefined;

      throw e;
    }
  }

  /* ---- Hierarchy ---- */

  /**
   * Create a child container that inherits all registrations from this container.
   * `scoped` providers will create one instance per child container.
   * @example
   * const child = container.createChild();
   * child.register(RequestContext, { useValue: ctx });
   */
  createChild(): Container {
    this.#assertNotDisposed();

    return _new(this);
  }

  /**
   * Run a function inside a scoped child container that is automatically disposed afterwards.
   * @example
   * await container.runInScope(async (scope) => {
   *   scope.value(RequestId, generateId());
   *   const service = scope.get(RequestScopedService);
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
   * Temporarily replace a token's registration with a mock value or provider,
   * then restore the original (including any cached singleton instance) after `fn` returns.
   * @example
   * const result = await container.mock(DbToken, fakeDb, () => svc.doWork());
   * // Or with a full provider:
   * await container.mock(DbToken, { useFactory: () => createInMemoryDb() }, fn);
   */
  async mock<T, R>(token: Token<T>, mock: T | Provider<T>, fn: () => Promise<R> | R): Promise<R> {
    const snap = this.snapshot();
    const provider: Provider<T> = isProvider<T>(mock) ? mock : { useValue: mock };

    this.register(token, provider, { overwrite: true });

    try {
      return await fn();
    } finally {
      this.restore(snap);
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

    return [new Map(this.#registry), new Map(this.#aliases)] as unknown as Snapshot;
  }

  /**
   * Restore registrations and aliases from a previous snapshot.
   * @see snapshot
   */
  restore(snap: Snapshot): this {
    this.#assertNotDisposed();

    const [registry, aliases] = snap as unknown as SnapshotData;

    this.#registry = new Map(registry);
    this.#aliases = new Map(aliases);

    return this;
  }

  /** Get debug information about all registered tokens and aliases, including inherited ones from parent containers. */
  debug(): { aliases: Array<[string, string]>; tokens: string[] } {
    const seenTokens = new Map<Token<any>, string>();
    const seenAliases = new Map<Token<any>, [string, string]>();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let c: Container | undefined = this;

    while (c) {
      for (const t of c.#registry.keys()) {
        if (!seenTokens.has(t)) seenTokens.set(t, tokenName(t));
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

  #resolve<T>(token: Token<T>, stack: Token<any>[], seen: Set<Token<any>>): T {
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

    const build = (): T => {
      const args = (deps as Token<any>[]).map((dep) => this.#resolve(dep, stack, seen));
      const result =
        'useClass' in p
          ? new (p as ClassProvider<T>).useClass(...args)
          : ((p as FactoryProvider<T>).useFactory(...args) as T);

      if (result instanceof Promise) throw new AsyncProviderError(resolved);

      return result;
    };

    try {
      if (lifetime === 'scoped' && this.#parent) {
        const localReg = this.#localReg(resolved, provider);

        if (!localReg.resolved) {
          localReg.instance = build();
          localReg.resolved = true;
        }

        return localReg.instance as T;
      }

      if (lifetime === 'transient') return build();

      if (!reg.resolved) {
        reg.instance = build();
        reg.resolved = true;
      }

      return reg.instance as T;
    } finally {
      stack.pop();
      seen.delete(resolved);
    }
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

      cacheReg.promise ??= build().then((inst) => {
        cacheReg.instance = inst;
        cacheReg.resolved = true;
        cacheReg.promise = undefined;

        return inst;
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
  return _new();
}

/** -------------------- Testing Helpers -------------------- **/

/**
 * Create a child test container with automatic cleanup.
 * Registrations in the child are isolated from the base container.
 * Call the returned `dispose()` to run dispose hooks and clean up.
 * @example
 * const { container, dispose } = createTestContainer();
 * container.value(Config, testConfig);
 * // ... run tests
 * await dispose();
 */
export function createTestContainer(base?: Container) {
  const child = (base ?? createContainer()).createChild();

  return {
    container: child,
    dispose: () => child.dispose(),
  };
}
function isProvider<T>(value: unknown): value is Provider<T> {
  return (
    typeof value === 'object' && value !== null && ('useValue' in value || 'useClass' in value || 'useFactory' in value)
  );
}
