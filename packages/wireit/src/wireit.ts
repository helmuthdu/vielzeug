/**
 * Wireit — Lightweight typed dependency injection container.
 */

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueProvider<T> = { useValue: T };

type BaseProvider<T, Deps extends unknown[] = any[]> = {
  deps?: { [K in keyof Deps]: Token<Deps[K]> };
  dispose?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
};

export type FactoryProvider<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  useFactory: (...deps: Deps) => T | Promise<T>;
};

export type Provider<T> = ValueProvider<T> | FactoryProvider<T>;

export type ProviderOptions<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
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

export class ContainerDisposedError extends Error {
  constructor() {
    super('Cannot use a disposed container.');
    this.name = 'ContainerDisposedError';
  }
}

type Registration<T = unknown> = {
  instance?: T;
  promise?: Promise<T>;
  provider: Provider<T>;
  resolved?: boolean;
};

export class Container {
  #registry = new Map<Token<any>, Registration<any>[]>();
  #scoped = new Map<Registration<any>, Registration<any>>();
  #parent?: Container;
  #disposed = false;

  constructor(parent?: Container) {
    this.#parent = parent;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError();
  }

  #register<T>(token: Token<T>, provider: Provider<T>, { multi = false } = {}): this {
    this.#assertNotDisposed();

    const existing = this.#registry.get(token);

    if (multi) {
      this.#registry.set(token, existing ? [...existing, { provider }] : [{ provider }]);

      return this;
    }

    if (existing && existing.length > 0) {
      throw new Error(`Token "${tokenName(token)}" is already registered.`);
    }

    this.#registry.set(token, [{ provider }]);

    return this;
  }

  value<T>(token: Token<T>, val: T, opts?: { multi?: boolean }): this {
    return this.#register(token, { useValue: val }, opts);
  }

  factory<T, Deps extends unknown[] = any[]>(
    token: Token<T>,
    fn: (...deps: Deps) => T | Promise<T>,
    opts?: ProviderOptions<T, Deps>,
  ): this {
    const { multi, ...providerOpts } = opts ?? {};

    return this.#register(token, { useFactory: fn, ...providerOpts } as FactoryProvider<T>, { multi });
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

  async resolveMany<T>(token: Token<T>): Promise<T[]> {
    this.#assertNotDisposed();

    const regs = this.#getRegistrations(token) as Registration<T>[];

    if (regs.length === 0) return [];

    return Promise.all(regs.map((reg) => this.#resolveRegistration(token, reg, [token], new Set([token]))));
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
      const registrations = [...this.#registry.values()].flat();

      for (const reg of [...registrations, ...this.#scoped.values()]) {
        const { instance, provider, resolved } = reg;

        if (resolved && 'dispose' in provider && provider.dispose) {
          hooks.push(Promise.resolve().then(() => provider.dispose!(instance as any)));
        }
      }

      if (hooks.length > 0) {
        const outcomes = await Promise.allSettled(hooks);

        failures = outcomes
          .filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
          .map((outcome) => outcome.reason);
      }
    } finally {
      this.#scoped.clear();
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

  #scopedReg<T>(source: Registration<T>): Registration<T> {
    let local = this.#scoped.get(source) as Registration<T> | undefined;

    if (!local) {
      local = { provider: source.provider };
      this.#scoped.set(source, local);
    }

    return local;
  }

  async #resolveToken<T>(token: Token<T>, stack: Token<any>[], seen: Set<Token<any>>): Promise<T> {
    if (seen.has(token)) throw new CircularDependencyError([...stack, token]);

    const regs = this.#getRegistrations(token) as Registration<T>[];

    if (regs.length === 0) throw new ProviderNotFoundError(token);

    if (regs.length > 1) throw new MultipleProvidersError(token, regs.length);

    return this.#resolveRegistration(token, regs[0], [...stack, token], new Set([...seen, token]));
  }

  async #resolveRegistration<T>(
    token: Token<T>,
    reg: Registration<T>,
    stack: Token<any>[],
    seen: Set<Token<any>>,
  ): Promise<T> {
    const { provider } = reg;

    if ('useValue' in provider) return provider.useValue;

    const { deps = [], lifetime = 'singleton' } = provider;

    if (lifetime === 'scoped' && !this.#parent) {
      throw new Error(`Token "${tokenName(token)}" uses scoped lifetime but was resolved on the root container.`);
    }

    const cacheReg = lifetime === 'singleton' ? reg : lifetime === 'scoped' ? this.#scopedReg(reg) : undefined;

    if (cacheReg?.resolved) return cacheReg.instance as T;

    if (cacheReg?.promise) return cacheReg.promise;

    const build = async (): Promise<T> => {
      const args = await Promise.all(
        (deps as Token<any>[]).map((dep) => this.#resolveToken(dep, stack, new Set(seen))),
      );

      return (provider as FactoryProvider<T>).useFactory(...args);
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
