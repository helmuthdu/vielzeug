/** biome-ignore-all lint/suspicious/noExplicitAny: - */
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
 *   .register(DbToken, { useFactory: () => new Database(process.env.DB_URL!) })
 *   .register(ServiceToken, { useClass: UserService, deps: [DbToken] });
 *
 * const service = container.get(ServiceToken);
 * ```
 */

/** -------------------- Types -------------------- **/

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueProvider<T> = { useValue: T };

export type ClassProvider<T> = {
  useClass: new (...args: any[]) => T;
  deps?: Token<any>[];
  lifetime?: Lifetime;
};

export type FactoryProvider<T> = {
  useFactory: (...deps: any[]) => T | Promise<T>;
  deps?: Token<any>[];
  lifetime?: Lifetime;
};

export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

/** Opaque handle returned by `snapshot()` and accepted by `restore()`. */
export type Snapshot = { readonly __snapshot: never };

/** -------------------- Token -------------------- **/

/**
 * Creates a typed token for dependency injection.
 * A description is required for readable error messages and debug output.
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

/** -------------------- Internal -------------------- **/

type Registration<T = unknown> = {
  provider: Provider<T>;
  instance?: T;
  promise?: Promise<T>;
};

type SnapshotData = [Map<Token<any>, Registration<any>>, Map<Token<any>, Token<any>>];

// Module-scoped factory — populated by the static block below so that
// createContainer() and createChild() can call the private constructor.
let _new: (parent?: Container) => Container;

/** -------------------- Container -------------------- **/

export class Container {
  #registry = new Map<Token<any>, Registration<any>>();
  #aliases = new Map<Token<any>, Token<any>>();
  #parent?: Container;

  // Expose the private constructor to the module-scoped _new variable.
  static {
    _new = (parent) => new Container(parent);
  }

  private constructor(parent?: Container) {
    this.#parent = parent;
  }

  /**
   * Register a provider for a token.
   * Both `useClass` and `useFactory` default to `singleton` lifetime.
   * @example
   * container.register(UserService, { useClass: UserServiceImpl, deps: [Database] });
   * container.register(Config, { useFactory: () => loadConfig() });
   */
  register<T>(token: Token<T>, provider: Provider<T>): this {
    this.#registry.set(token, { provider });
    return this;
  }

  /**
   * Register a plain value.
   * @example
   * container.registerValue(Config, { apiUrl: 'https://api.example.com' });
   */
  registerValue<T>(token: Token<T>, value: T): this {
    return this.register(token, { useValue: value });
  }

  /**
   * Make `token` an alias that resolves to `source`.
   * @example
   * container.alias(IUserService, UserServiceImpl);
   */
  alias<T>(token: Token<T>, source: Token<T>): this {
    this.#aliases.set(token, source);
    return this;
  }

  /** Remove a registration. */
  unregister<T>(token: Token<T>): this {
    this.#registry.delete(token);
    return this;
  }

  /** Clear all registrations and aliases in this container. */
  clear(): this {
    this.#registry.clear();
    this.#aliases.clear();
    return this;
  }

  /** Check if a token is registered (including parent containers). */
  has(token: Token<any>): boolean {
    return this.#getRegistration(token) !== undefined;
  }

  /**
   * Resolve a token synchronously.
   * @throws {AsyncProviderError} if the provider is async — use `getAsync()` instead
   * @throws {ProviderNotFoundError} if no provider is registered
   * @throws {CircularDependencyError} if a circular dependency is detected
   */
  get<T>(token: Token<T>): T {
    return this.#resolve(token, []);
  }

  /** Resolve a token asynchronously. */
  async getAsync<T>(token: Token<T>): Promise<T> {
    return this.#resolveAsync(token, []);
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

  /**
   * Create a child container that inherits all registrations from this container.
   * `scoped` providers will create one instance per child container.
   * @example
   * const child = container.createChild();
   * child.register(RequestContext, { useValue: ctx });
   */
  createChild(): Container {
    return _new(this);
  }

  /**
   * Run a function inside a scoped child container that is cleared afterwards.
   * @example
   * await container.runInScope(async (scope) => {
   *   scope.registerValue(RequestId, generateId());
   *   const service = scope.get(RequestScopedService);
   *   await service.process();
   * });
   */
  async runInScope<T>(fn: (scope: Container) => Promise<T> | T): Promise<T> {
    const scope = this.createChild();
    try {
      return await fn(scope);
    } finally {
      scope.clear();
    }
  }

  /**
   * Take a snapshot of all current local registrations and aliases, including cached instances.
   * Useful for temporarily overriding providers in tests.
   * @see restore
   */
  snapshot(): Snapshot {
    return [new Map(this.#registry), new Map(this.#aliases)] as unknown as Snapshot;
  }

  /**
   * Restore registrations and aliases from a previous snapshot.
   * @see snapshot
   */
  restore(snap: Snapshot): this {
    const [registry, aliases] = snap as unknown as SnapshotData;
    this.#registry = new Map(registry);
    this.#aliases = new Map(aliases);
    return this;
  }

  /** Get debug information about all registered tokens and aliases. */
  debug(): { tokens: string[]; aliases: Array<[string, string]> } {
    return {
      tokens: Array.from(this.#registry.keys()).map(tokenName),
      aliases: Array.from(this.#aliases.entries()).map(([a, s]) => [tokenName(a), tokenName(s)]),
    };
  }

  /** -------------------- Private -------------------- **/

  #resolveAlias<T>(token: Token<T>): Token<T> {
    const visited = new Set<Token<any>>();
    let current = token;
    while (this.#aliases.has(current)) {
      if (visited.has(current)) throw new Error(`Alias cycle detected for token: ${tokenName(token)}`);
      visited.add(current);
      current = this.#aliases.get(current)!;
    }
    return current;
  }

  #getRegistration<T>(token: Token<T>): Registration<T> | undefined {
    const resolved = this.#resolveAlias(token);
    return this.#registry.get(resolved) ?? (this.#parent ? this.#parent.#getRegistration(resolved) : undefined);
  }

  // Gets or creates a local registration entry in this container (used for scoped caching in children).
  #localReg<T>(token: Token<T>, provider: Provider<T>): Registration<T> {
    let reg = this.#registry.get(token) as Registration<T> | undefined;
    if (!reg) this.#registry.set(token, (reg = { provider }));
    return reg;
  }

  #resolve<T>(token: Token<T>, stack: Token<any>[]): T {
    const resolved = this.#resolveAlias(token);
    if (stack.includes(resolved)) throw new CircularDependencyError([...stack, resolved]);
    const reg = this.#getRegistration(resolved);
    if (!reg) throw new ProviderNotFoundError(resolved);
    const { provider } = reg;

    if ('useValue' in provider) return (provider as ValueProvider<T>).useValue;

    const p = provider as ClassProvider<T> | FactoryProvider<T>;
    const { deps = [], lifetime = 'singleton' } = p;
    const build = () => {
      const args = deps.map((dep) => this.#resolve(dep, [...stack, resolved]));
      const result = 'useClass' in p ? new p.useClass(...args) : (p.useFactory(...args) as T);
      if (result instanceof Promise) throw new AsyncProviderError(resolved);
      return result;
    };

    if (lifetime === 'scoped' && this.#parent) return (this.#localReg(resolved, provider).instance ??= build());
    return lifetime === 'transient' ? build() : (reg.instance ??= build());
  }

  async #resolveAsync<T>(token: Token<T>, stack: Token<any>[]): Promise<T> {
    const resolved = this.#resolveAlias(token);
    if (stack.includes(resolved)) throw new CircularDependencyError([...stack, resolved]);
    const reg = this.#getRegistration(resolved);
    if (!reg) throw new ProviderNotFoundError(resolved);
    const { provider } = reg;

    if ('useValue' in provider) return (provider as ValueProvider<T>).useValue;

    const p = provider as ClassProvider<T> | FactoryProvider<T>;
    const { deps = [], lifetime = 'singleton' } = p;
    const build = async () => {
      const args = await Promise.all(deps.map((dep) => this.#resolveAsync(dep, [...stack, resolved])));
      return ('useClass' in p ? new p.useClass(...args) : await p.useFactory(...args)) as T;
    };

    // Deduplicates concurrent singleton resolutions using a shared in-flight promise.
    const cache = (cacheReg: Registration<T>) => {
      if (cacheReg.instance) return Promise.resolve(cacheReg.instance);
      cacheReg.promise ??= build().then((inst) => {
        cacheReg.instance = inst;
        cacheReg.promise = undefined;
        return inst;
      });
      return cacheReg.promise;
    };

    if (lifetime === 'scoped' && this.#parent) return cache(this.#localReg(resolved, provider));
    return lifetime === 'singleton' ? cache(reg) : build();
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
 * @example
 * const { container, dispose } = createTestContainer();
 * container.registerValue(Config, testConfig);
 * // ... run tests
 * dispose();
 */
export function createTestContainer(base?: Container) {
  const child = (base ?? createContainer()).createChild();
  return {
    container: child,
    dispose: () => child.clear(),
  };
}

/**
 * Temporarily replace a token's registration with a mock value, then restore the
 * original registration (including any cached singleton instance).
 * @example
 * await withMock(container, UserService, mockUserService, async () => {
 *   const service = container.get(UserService);
 *   // service is mockUserService
 * });
 */
export async function withMock<T, R>(
  container: Container,
  token: Token<T>,
  mock: T,
  fn: () => Promise<R> | R,
): Promise<R> {
  const snap = container.snapshot();
  container.registerValue(token, mock);
  try {
    return await fn();
  } finally {
    container.restore(snap);
  }
}
