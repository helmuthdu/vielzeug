/** biome-ignore-all lint/suspicious/noExplicitAny: - */
/**
 * Wireit - Lightweight dependency injection container
 *
 * @example
 * ```ts
 * import { createContainer, createToken } from '@vielzeug/wireit';
 *
 * const UserService = createToken<UserService>('UserService');
 * const container = createContainer();
 *
 * container.register(UserService, {
 *   useClass: UserServiceImpl,
 *   deps: [Database],
 * });
 *
 * const userService = container.get(UserService);
 * ```
 */

/** -------------------- Types -------------------- **/

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueProvider<T> = {
  useValue: T;
};

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

/** -------------------- Token Creation -------------------- **/

/**
 * Creates a typed token for dependency injection
 * @param description Optional description for debugging
 */
export function createToken<T = unknown>(description?: string): Token<T> {
  return Symbol(description) as Token<T>;
}

/** -------------------- Errors -------------------- **/

function tokenName(token: Token<any>): string {
  return token.description ?? 'anonymous';
}

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

/** -------------------- Internal Types -------------------- **/

type Registration<T = unknown> = {
  provider: Provider<T>;
  instance?: T;
  promise?: Promise<T>;
};

/** -------------------- Container -------------------- **/

export class Container {
  #registry = new Map<Token<any>, Registration<any>>();
  #aliases = new Map<Token<any>, Token<any>>();
  #parent?: Container;

  constructor(parent?: Container) {
    this.#parent = parent;
  }

  /**
   * Register a provider for a token
   * @example
   * container.register(UserService, {
   *   useClass: UserServiceImpl,
   *   deps: [Database]
   * });
   */
  register<T>(token: Token<T>, provider: Provider<T>): this {
    this.#registry.set(token, { provider });
    return this;
  }

  /**
   * Register a plain value
   * @example
   * container.registerValue(Config, { apiUrl: 'https://api.example.com' });
   */
  registerValue<T>(token: Token<T>, value: T): this {
    return this.register(token, { useValue: value });
  }

  /**
   * Register a factory function
   * @example
   * container.registerFactory(
   *   Logger,
   *   (config) => new ConsoleLogger(config.logLevel),
   *   [Config],
   *   { lifetime: 'singleton' }
   * );
   */
  registerFactory<T>(
    token: Token<T>,
    factory: (...deps: any[]) => T | Promise<T>,
    options?: { deps?: Token<any>[]; lifetime?: Lifetime },
  ): this {
    return this.register(token, {
      deps: options?.deps ?? [],
      lifetime: options?.lifetime ?? 'transient',
      useFactory: factory,
    });
  }

  /**
   * Register multiple providers at once
   * @example
   * container.registerMany([
   *   [UserService, { useClass: UserServiceImpl }],
   *   [Database, { useValue: db }],
   * ]);
   */
  registerMany(providers: Array<[Token<any>, Provider<any>]>): this {
    for (const [token, provider] of providers) {
      this.register(token, provider);
    }
    return this;
  }

  /**
   * Create an alias for a token
   * @example
   * container.alias(UserServiceImpl, IUserService);
   */
  alias<T>(source: Token<T>, alias: Token<T>): this {
    this.#aliases.set(alias, source);
    return this;
  }

  /**
   * Remove a registration
   */
  unregister<T>(token: Token<T>): this {
    this.#registry.delete(token);
    return this;
  }

  /**
   * Clear all registrations in this container
   */
  clear(): this {
    this.#registry.clear();
    this.#aliases.clear();
    return this;
  }

  /**
   * Check if a token is registered
   */
  has(token: Token<any>): boolean {
    return this.#getRegistration(token) !== undefined;
  }

  /**
   * Resolve a dependency synchronously
   * @throws {AsyncProviderError} If the provider is async
   * @throws {ProviderNotFoundError} If no provider is registered
   * @throws {CircularDependencyError} If a circular dependency is detected
   */
  get<T>(token: Token<T>): T {
    return this.#resolve(token, []);
  }

  /**
   * Resolve a dependency asynchronously
   */
  async getAsync<T>(token: Token<T>): Promise<T> {
    return this.#resolveAsync(token, []);
  }

  /**
   * Resolve a dependency, returning undefined if not found
   */
  getOptional<T>(token: Token<T>): T | undefined {
    try {
      return this.get(token);
    } catch (error) {
      if (error instanceof ProviderNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Resolve a dependency asynchronously, returning undefined if not found
   */
  async getOptionalAsync<T>(token: Token<T>): Promise<T | undefined> {
    try {
      return await this.getAsync(token);
    } catch (error) {
      if (error instanceof ProviderNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Create a child container
   * @example
   * const child = container.createChild([
   *   [RequestContext, { useValue: ctx }]
   * ]);
   */
  createChild(overrides?: Array<[Token<any>, Provider<any>]>): Container {
    const child = new Container(this);

    if (overrides) {
      child.registerMany(overrides);
    }

    return child;
  }

  /**
   * Run a function in a scoped container
   * @example
   * await container.runInScope(async (scope) => {
   *   const service = scope.get(RequestScopedService);
   *   await service.process();
   * }, [
   *   [RequestId, { useValue: generateId() }]
   * ]);
   */
  async runInScope<T>(
    fn: (scope: Container) => Promise<T> | T,
    overrides?: Array<[Token<any>, Provider<any>]>,
  ): Promise<T> {
    const scope = this.createChild(overrides);
    try {
      return await fn(scope);
    } finally {
      scope.clear();
    }
  }

  /**
   * Get debug information about registrations
   */
  debug(): { tokens: string[]; aliases: Array<[string, string]> } {
    return {
      aliases: Array.from(this.#aliases.entries()).map(([alias, source]) => [tokenName(alias), tokenName(source)]),
      tokens: Array.from(this.#registry.keys()).map(tokenName),
    };
  }

  /** -------------------- Private Methods -------------------- **/

  #resolveAlias<T>(token: Token<T>): Token<T> {
    const visited = new Set<Token<any>>();
    let current = token;

    while (this.#aliases.has(current)) {
      if (visited.has(current)) {
        throw new Error(`Alias cycle detected for token: ${tokenName(token)}`);
      }
      visited.add(current);
      current = this.#aliases.get(current)!;
    }

    return current;
  }

  #getRegistration<T>(token: Token<T>): Registration<T> | undefined {
    const resolved = this.#resolveAlias(token);
    const local = this.#registry.get(resolved);
    if (local) return local;
    if (this.#parent) return this.#parent.#getRegistration(resolved);
    return undefined;
  }

  #resolve<T>(token: Token<T>, stack: Token<any>[]): T {
    const resolved = this.#resolveAlias(token);

    // Check circular dependencies
    if (stack.includes(resolved)) {
      throw new CircularDependencyError([...stack, resolved]);
    }

    const registration = this.#getRegistration(resolved);

    if (!registration) {
      throw new ProviderNotFoundError(resolved);
    }

    // Value provider
    if ('useValue' in registration.provider) {
      return (registration.provider as ValueProvider<T>).useValue;
    }

    // Class provider
    if ('useClass' in registration.provider) {
      return this.#resolveClass(resolved, registration, stack);
    }

    // Factory provider
    if ('useFactory' in registration.provider) {
      return this.#resolveFactory(resolved, registration, stack);
    }

    throw new Error('Invalid provider type');
  }

  #getCached<T>(reg: Registration<T>, lifetime: Lifetime): T | undefined {
    if (reg.instance && (lifetime === 'singleton' || (lifetime === 'scoped' && !this.#parent)))
      return reg.instance as T;
  }

  #setCached<T>(reg: Registration<T>, instance: T, lifetime: Lifetime): void {
    if (lifetime === 'singleton' || (lifetime === 'scoped' && !this.#parent)) reg.instance = instance;
  }

  #resolveClass<T>(token: Token<T>, registration: Registration<T>, stack: Token<any>[]): T {
    const provider = registration.provider as ClassProvider<T>;
    const lifetime = provider.lifetime ?? 'singleton';
    const cached = this.#getCached<T>(registration, lifetime);
    if (cached) return cached;
    const deps = (provider.deps ?? []).map((dep) => this.#resolve(dep, [...stack, token]));
    const instance = new provider.useClass(...deps);
    this.#setCached(registration, instance, lifetime);
    return instance;
  }

  #resolveFactory<T>(token: Token<T>, registration: Registration<T>, stack: Token<any>[]): T {
    const provider = registration.provider as FactoryProvider<T>;
    const lifetime = provider.lifetime ?? 'transient';
    const cached = this.#getCached<T>(registration, lifetime);
    if (cached) return cached;
    const deps = (provider.deps ?? []).map((dep) => this.#resolve(dep, [...stack, token]));
    const instance = provider.useFactory(...deps) as T;
    if (instance instanceof Promise) throw new AsyncProviderError(token);
    this.#setCached(registration, instance, lifetime);
    return instance;
  }

  async #resolveAsync<T>(token: Token<T>, stack: Token<any>[]): Promise<T> {
    const resolved = this.#resolveAlias(token);

    if (stack.includes(resolved)) {
      throw new CircularDependencyError([...stack, resolved]);
    }

    const registration = this.#getRegistration(resolved);

    if (!registration) {
      throw new ProviderNotFoundError(resolved);
    }

    // Value provider
    if ('useValue' in registration.provider) {
      return (registration.provider as ValueProvider<T>).useValue;
    }

    // Class provider
    if ('useClass' in registration.provider) {
      return this.#resolveClassAsync(resolved, registration, stack);
    }

    // Factory provider
    if ('useFactory' in registration.provider) {
      return this.#resolveFactoryAsync(resolved, registration, stack);
    }

    throw new Error('Invalid provider type');
  }

  async #resolveClassAsync<T>(token: Token<T>, registration: Registration<T>, stack: Token<any>[]): Promise<T> {
    const provider = registration.provider as ClassProvider<T>;
    const lifetime = provider.lifetime ?? 'singleton';

    if (lifetime === 'singleton') {
      if (registration.instance) {
        return registration.instance;
      }
      if (registration.promise) {
        return registration.promise;
      }

      registration.promise = (async () => {
        const deps = await Promise.all((provider.deps ?? []).map((dep) => this.#resolveAsync(dep, [...stack, token])));
        const instance = new provider.useClass(...deps);
        registration.instance = instance;
        registration.promise = undefined;
        return instance;
      })();

      return registration.promise;
    }

    const deps = await Promise.all((provider.deps ?? []).map((dep) => this.#resolveAsync(dep, [...stack, token])));
    return new provider.useClass(...deps);
  }

  async #resolveFactoryAsync<T>(token: Token<T>, registration: Registration<T>, stack: Token<any>[]): Promise<T> {
    const provider = registration.provider as FactoryProvider<T>;
    const lifetime = provider.lifetime ?? 'transient';

    if (lifetime === 'singleton') {
      if (registration.instance) {
        return registration.instance;
      }
      if (registration.promise) {
        return registration.promise;
      }

      registration.promise = (async () => {
        const deps = await Promise.all((provider.deps ?? []).map((dep) => this.#resolveAsync(dep, [...stack, token])));
        const instance = await provider.useFactory(...deps);
        registration.instance = instance;
        registration.promise = undefined;
        return instance;
      })();

      return registration.promise;
    }

    const deps = await Promise.all((provider.deps ?? []).map((dep) => this.#resolveAsync(dep, [...stack, token])));
    return provider.useFactory(...deps);
  }
}

/** -------------------- Factory -------------------- **/

/**
 * Create a new dependency injection container
 * @example
 * const container = createContainer();
 * const container = createContainer({ parent: rootContainer });
 */
export function createContainer(parent?: Container): Container {
  return new Container(parent);
}

/** -------------------- Testing Helpers -------------------- **/

/**
 * Create a test container with automatic cleanup
 * @example
 * const { container, dispose } = createTestContainer();
 * container.registerValue(Config, testConfig);
 * // ... run tests
 * dispose();
 */
export function createTestContainer(base?: Container) {
  const root = base ?? createContainer();
  const child = root.createChild();

  return {
    container: child,
    dispose: () => child.clear(),
  };
}

/**
 * Temporarily mock a dependency
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
  const hadOriginal = container.has(token);
  const originalValue = hadOriginal ? container.getOptional(token) : undefined;
  container.register(token, { useValue: mock });
  try {
    return await fn();
  } finally {
    if (hadOriginal && originalValue !== undefined) {
      container.register(token, { useValue: originalValue });
    } else if (!hadOriginal) {
      container.unregister(token);
    }
  }
}
