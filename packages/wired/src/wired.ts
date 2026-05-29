/**
 * Wired — Lightweight typed dependency injection container.
 */

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueOptions<T> = {
  dispose?: (instance: T) => void | Promise<void>;
  multi?: boolean;
};

export type FactoryOptions<T, Deps extends unknown[] = []> = {
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
  multi?: boolean;
};

export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

export class CircularDependencyError extends Error {
  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ProviderNotFoundError extends Error {
  constructor(token: Token<any>) {
    super(`No provider registered for token: ${tokenName(token)}`);
    this.name = 'ProviderNotFoundError';
  }
}

export class MultipleProvidersError extends Error {
  constructor(token: Token<any>, count: number) {
    super(`Token "${tokenName(token)}" has ${count} providers. Use resolveMany().`);
    this.name = 'MultipleProvidersError';
  }
}

export class SyncResolutionError extends Error {
  constructor(token: Token<any>, lifetime: Lifetime) {
    const reason =
      lifetime === 'transient'
        ? 'transient factories are never cached'
        : 'the instance has not been resolved yet; call await container.resolve() first';

    super(`Token "${tokenName(token)}" cannot be resolved synchronously: ${reason}.`);
    this.name = 'SyncResolutionError';
  }
}

export class ScopedResolutionError extends Error {
  constructor(token: Token<any>) {
    super(`Token "${tokenName(token)}" uses scoped lifetime but was resolved on the root container.`);
    this.name = 'ScopedResolutionError';
  }
}

export class ContainerDisposedError extends Error {
  constructor() {
    super('Cannot use a disposed container.');
    this.name = 'ContainerDisposedError';
  }
}

// Internal types — not exported

type ValueRegistration<T> = {
  dispose?: (instance: T) => void | Promise<void>;
  kind: 'value';
  value: T;
};

type FactoryRegistration<T> = {
  deps: Token<any>[];
  dispose?: (instance: T) => void | Promise<void>;
  factory: (...deps: any[]) => T | Promise<T>;
  // Runtime cache state
  instance?: T;
  kind: 'factory';
  lifetime: Lifetime;
  promise?: Promise<T>;
  resolved: boolean;
};

type Registration<T = unknown> = ValueRegistration<T> | FactoryRegistration<T>;

export class Container {
  #registry = new Map<Token<any>, Registration<any>[]>();
  // scopeCache maps a root FactoryRegistration to a child-local copy for scoped lifetime
  #scopeCache = new Map<FactoryRegistration<any>, FactoryRegistration<any>>();
  #parent?: Container;
  #disposed = false;

  constructor(parent?: Container) {
    this.#parent = parent;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError();
  }

  has<T>(token: Token<T>): boolean {
    this.#assertNotDisposed();

    return this.#getRegistrations(token).length > 0;
  }

  value<T>(token: Token<T>, val: T, opts?: ValueOptions<T>): this {
    this.#assertNotDisposed();

    const existing = this.#registry.get(token);
    const reg: ValueRegistration<T> = { dispose: opts?.dispose, kind: 'value', value: val };

    if (opts?.multi) {
      this.#registry.set(token, existing ? [...existing, reg] : [reg]);

      return this;
    }

    if (existing && existing.length > 0) {
      throw new Error(`Token "${tokenName(token)}" is already registered.`);
    }

    this.#registry.set(token, [reg]);

    return this;
  }

  factory<T>(token: Token<T>, fn: () => T | Promise<T>, opts?: FactoryOptions<T, []>): this;
  factory<T, Deps extends [unknown, ...unknown[]]>(
    token: Token<T>,
    fn: (...deps: Deps) => T | Promise<T>,
    opts: FactoryOptions<T, Deps> & { deps: { [K in keyof Deps]: Token<Deps[K]> } },
  ): this;
  factory<T, Deps extends unknown[]>(
    token: Token<T>,
    fn: (...deps: any[]) => T | Promise<T>,
    opts?: FactoryOptions<T, Deps>,
  ): this {
    this.#assertNotDisposed();

    const existing = this.#registry.get(token);
    const reg: FactoryRegistration<T> = {
      deps: (opts?.deps as Token<any>[]) ?? [],
      dispose: opts?.dispose,
      factory: fn,
      kind: 'factory',
      lifetime: opts?.lifetime ?? 'singleton',
      resolved: false,
    };

    if (opts?.multi) {
      this.#registry.set(token, existing ? [...existing, reg] : [reg]);

      return this;
    }

    if (existing && existing.length > 0) {
      throw new Error(`Token "${tokenName(token)}" is already registered.`);
    }

    this.#registry.set(token, [reg]);

    return this;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  createChild(): Container {
    this.#assertNotDisposed();

    return new Container(this);
  }

  async resolve<T>(token: Token<T>): Promise<T> {
    this.#assertNotDisposed();

    return this.#resolveToken(token, [], new Set());
  }

  /**
   * Resolve a token synchronously. Works for:
   * - Value registrations (always)
   * - Singleton and scoped instances that have already been resolved at least once
   *
   * Throws SyncResolutionError for:
   * - Transient factories (never cached, always require async resolution)
   * - Singleton/scoped factories that have not been resolved yet
   *
   * Throws ScopedResolutionError when called on the root container for a scoped token.
   */
  resolveSync<T>(token: Token<T>): T {
    this.#assertNotDisposed();

    const regs = this.#getRegistrations(token) as Registration<T>[];

    if (regs.length === 0) throw new ProviderNotFoundError(token);

    if (regs.length > 1) throw new MultipleProvidersError(token, regs.length);

    return this.#resolveSyncReg(token, regs[0]);
  }

  #resolveSyncReg<T>(token: Token<T>, reg: Registration<T>): T {
    if (reg.kind === 'value') return reg.value;

    const { lifetime } = reg;

    if (lifetime === 'scoped' && !this.#parent) throw new ScopedResolutionError(token);

    // Read-only lookup — do not call #getScopedReg here, which would create a
    // phantom cache entry as a side effect of what is semantically a read.
    const cacheReg = lifetime === 'singleton' ? reg : lifetime === 'scoped' ? this.#scopeCache.get(reg) : undefined;

    if (cacheReg?.resolved) return cacheReg.instance as T;

    throw new SyncResolutionError(token, lifetime);
  }

  async resolveMany<T>(token: Token<T>): Promise<T[]> {
    this.#assertNotDisposed();

    const regs = this.#getRegistrations(token) as Registration<T>[];

    if (regs.length === 0) return [];

    const stack = [token];
    const seen = new Set([token]);

    // stack and seen are never mutated — #resolveToken snapshots both before
    // descending, so sharing them across concurrent Promise.all branches is safe.
    return Promise.all(regs.map((reg) => this.#resolveReg(token, reg, stack, seen)));
  }

  async resolveOptional<T>(token: Token<T>): Promise<T | undefined> {
    try {
      return await this.resolve(token);
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return undefined;

      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;

    let failures: unknown[] = [];

    try {
      const hooks: Promise<void>[] = [];
      const registryRegs = [...this.#registry.values()].flat() as Registration<any>[];
      const allRegs = [...registryRegs, ...this.#scopeCache.values()];

      for (const reg of allRegs) {
        if (reg.kind === 'value') {
          if (reg.dispose) hooks.push(Promise.resolve().then(() => reg.dispose!(reg.value)));
        } else if (reg.resolved && reg.dispose) {
          hooks.push(Promise.resolve().then(() => reg.dispose!(reg.instance as any)));
        }
      }

      if (hooks.length > 0) {
        const outcomes = await Promise.allSettled(hooks);

        failures = outcomes.filter((o): o is PromiseRejectedResult => o.status === 'rejected').map((o) => o.reason);
      }
    } finally {
      this.#scopeCache.clear();
      this.#registry.clear();
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'One or more dispose hooks failed.');
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  #getRegistrations<T>(token: Token<T>): Registration<T>[] {
    const local = this.#registry.get(token) as Registration<T>[] | undefined;

    if (local) return local;

    if (!this.#parent) return [];

    this.#parent.#assertNotDisposed();

    return this.#parent.#getRegistrations(token);
  }

  #getScopedReg<T>(source: FactoryRegistration<T>): FactoryRegistration<T> {
    let local = this.#scopeCache.get(source) as FactoryRegistration<T> | undefined;

    if (!local) {
      local = { ...source, instance: undefined, promise: undefined, resolved: false };
      this.#scopeCache.set(source, local);
    }

    return local;
  }

  async #resolveToken<T>(token: Token<T>, stack: Token<any>[], seen: Set<Token<any>>): Promise<T> {
    if (seen.has(token)) throw new CircularDependencyError([...stack, token]);

    const regs = this.#getRegistrations(token) as Registration<T>[];

    if (regs.length === 0) throw new ProviderNotFoundError(token);

    if (regs.length > 1) throw new MultipleProvidersError(token, regs.length);

    // Snapshot the resolution path for this branch so sibling deps each get an
    // accurate error path if a cycle is detected in their subtree.
    const childStack = [...stack, token];
    const childSeen = new Set([...seen, token]);

    return this.#resolveReg(token, regs[0], childStack, childSeen);
  }

  async #resolveReg<T>(token: Token<T>, reg: Registration<T>, stack: Token<any>[], seen: Set<Token<any>>): Promise<T> {
    if (reg.kind === 'value') return reg.value;

    const { deps, factory, lifetime } = reg;

    if (lifetime === 'scoped' && !this.#parent) throw new ScopedResolutionError(token);

    const cacheReg = lifetime === 'singleton' ? reg : lifetime === 'scoped' ? this.#getScopedReg(reg) : undefined;

    if (cacheReg?.resolved) return cacheReg.instance as T;

    if (cacheReg?.promise) return cacheReg.promise;

    const build = async (): Promise<T> => {
      const args = await Promise.all(deps.map((dep) => this.#resolveToken(dep, stack, seen)));

      return factory(...args);
    };

    if (!cacheReg) return build();

    cacheReg.promise = build()
      .then((instance) => {
        cacheReg.instance = instance;
        cacheReg.resolved = true;

        return instance;
      })
      .finally(() => {
        cacheReg.promise = undefined;
      });

    return cacheReg.promise;
  }
}

export function createContainer(): Container {
  return new Container();
}
