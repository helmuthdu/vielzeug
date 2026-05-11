/**
 * Wireit — Lightweight typed dependency injection container.
 */

/** -------------------- Types -------------------- **/

export type Token<T = unknown> = symbol & { __type?: T };

export type Lifetime = 'singleton' | 'transient' | 'scoped';

export type ValueProvider<T> = { useValue: T };

type DependencyRef<T> = Token<T>;

type BaseProvider<T, Deps extends unknown[] = any[]> = {
  deps?: { [K in keyof Deps]: DependencyRef<Deps[K]> };
  dispose?: (instance: T) => void | Promise<void>;
  init?: (instance: T) => void | Promise<void>;
  lifetime?: Lifetime;
};

export type ClassProvider<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  useClass: new (...args: Deps) => T;
};

export type FactoryProvider<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  useFactory: (...deps: Deps) => T | Promise<T>;
};

export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

export type ProviderOptions<T, Deps extends unknown[] = any[]> = BaseProvider<T, Deps> & {
  multi?: boolean;
};

/** -------------------- Token -------------------- **/

export function createToken<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

/** -------------------- Errors -------------------- **/

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

/** -------------------- Internal -------------------- **/

type Registration<T = unknown> = {
  instance?: T;
  promise?: Promise<T>;
  provider: Provider<T>;
  resolved?: boolean;
};

/** -------------------- Container -------------------- **/

export class Container {
  #registry = new Map<Token<any>, Registration<any>[]>();
  #scoped = new Map<Registration<any>, Registration<any>>();
  #parent?: Container;
  #disposed = false;

  private constructor(parent?: Container) {
    this.#parent = parent;
  }

  static create(): Container {
    return new Container();
  }

  /* ---- Registration ---- */

  #register<T>(token: Token<T>, provider: Provider<T>, { multi = false } = {}): this {
    this.#assertNotDisposed();

    const prev = this.#registry.get(token);

    if (multi) {
      const next = prev ? [...prev, { provider }] : [{ provider }];

      this.#registry.set(token, next);

      return this;
    }

    if (prev && prev.length > 0) {
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

  bind<T, Deps extends unknown[] = any[]>(
    token: Token<T>,
    cls: new (...args: Deps) => T,
    opts?: ProviderOptions<T, Deps>,
  ): this {
    const { multi, ...providerOpts } = opts ?? {};

    return this.#register(token, { useClass: cls, ...providerOpts } as ClassProvider<T>, { multi });
  }

  /* ---- Lifecycle ---- */

  get disposed(): boolean {
    return this.#disposed;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;

    const hooks: Promise<void>[] = [];
    const regs = [...this.#registry.values()].flat();

    for (const reg of [...regs, ...this.#scoped.values()]) {
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

    this.#scoped.clear();
    this.#registry.clear();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  /* ---- Resolution ---- */

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

    return Promise.all(regs.map((reg) => this.#resolveRegistration(token, reg, [], new Set())));
  }

  /** -------------------- Private -------------------- **/

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError();
  }

  #getRegistrations<T>(token: Token<T>): Registration<T>[] {
    const local = this.#registry.get(token) as Registration<T>[] | undefined;

    if (local) return local;

    return this.#parent ? this.#parent.#getRegistrations(token) : [];
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

    return this.#resolveRegistration(token, regs[0], stack, seen);
  }

  async #resolveRegistration<T>(
    token: Token<T>,
    reg: Registration<T>,
    stack: Token<any>[],
    seen: Set<Token<any>>,
  ): Promise<T> {
    const { provider } = reg;

    if ('useValue' in provider) return provider.useValue;

    const p = provider as ClassProvider<T> | FactoryProvider<T>;
    const { deps = [], lifetime = 'singleton' } = p;

    const cacheReg =
      lifetime === 'scoped' && this.#parent ? this.#scopedReg(reg) : lifetime === 'singleton' ? reg : undefined;

    if (cacheReg?.resolved) return cacheReg.instance as T;

    if (cacheReg?.promise) return cacheReg.promise;

    stack.push(token);
    seen.add(token);

    const build = async (): Promise<T> => {
      const args = await Promise.all((deps as Token<any>[]).map((dep) => this.#resolveToken(dep, stack, seen)));

      const created = (
        'useClass' in p
          ? new (p as ClassProvider<T>).useClass(...args)
          : await (p as FactoryProvider<T>).useFactory(...args)
      ) as T;

      if ('init' in p && p.init) {
        await p.init(created);
      }

      return created;
    };

    try {
      if (!cacheReg) return await build();

      cacheReg.promise = build()
        .then((inst) => {
          cacheReg.instance = inst;
          cacheReg.resolved = true;

          return inst;
        })
        .finally(() => {
          cacheReg.promise = undefined;
        });

      return await cacheReg.promise;
    } finally {
      stack.pop();
      seen.delete(token);
    }
  }
}

/** -------------------- Factory -------------------- **/

export function createContainer(): Container {
  return Container.create();
}
