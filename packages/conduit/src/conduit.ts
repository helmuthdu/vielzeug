/**
 * Conduit — Lightweight typed dependency injection container.
 */

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export type Token<T = unknown> = symbol & { __type?: T };

export function token<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

// ---------------------------------------------------------------------------
// ScopeToken — named lifecycle scopes
// ---------------------------------------------------------------------------

/**
 * A named scope identifier. Created via scope(). Used as a `lifetime` in
 * factory registrations to bind instances to a specific scope container.
 */
export type ScopeToken = symbol & { __scopeToken?: never };

/**
 * Creates a named scope token. Factories registered with a ScopeToken lifetime
 * are only resolvable from a container created with createScope(scopeToken).
 *
 * @example
 * const RequestScope = scope('request');
 * container.factory(Session, () => ({ id: crypto.randomUUID() }), { lifetime: RequestScope });
 * const requestContainer = container.createScope(RequestScope);
 * const session = await requestContainer.resolve(Session);
 */
export function scope(name: string): ScopeToken {
  return Symbol(name) as ScopeToken;
}

// ---------------------------------------------------------------------------
// Lifetime & options
// ---------------------------------------------------------------------------

export type Lifetime = 'scoped' | 'singleton' | 'transient' | ScopeToken;

export type ValueOptions<T> = {
  dispose?: (instance: T) => Promise<void> | void;
};

// Infer dep types directly from the token tuple — no manual generics needed.
type InferTokenTypes<D extends Token<any>[]> = { [K in keyof D]: D[K] extends Token<infer U> ? U : never };

export type FactoryOptions<T> = {
  dispose?: (instance: T) => Promise<void> | void;
  lifetime?: Lifetime;
};

// ---------------------------------------------------------------------------
// ContainerModule — grouping and async setup
// ---------------------------------------------------------------------------

/** A function that registers providers on a container. May be async. */
export type ContainerModule = (container: Container) => Promise<void> | void;

// ---------------------------------------------------------------------------
// Events — observable container state
// ---------------------------------------------------------------------------

export type ContainerEvent =
  | { description: string; kind: 'factory' | 'value'; type: 'register' }
  | { description: string; type: 'resolve' }
  | { type: 'dispose' };

export type ContainerEventListener = (event: ContainerEvent) => void;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

export class CircularDependencyError extends Error {
  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ProviderNotFoundError extends Error {
  constructor(tok: Token<any>) {
    super(`No provider registered for token: ${tokenName(tok)}`);
    this.name = 'ProviderNotFoundError';
  }
}

export class DuplicateRegistrationError extends Error {
  constructor(tok: Token<any>) {
    super(`Token "${tokenName(tok)}" is already registered.`);
    this.name = 'DuplicateRegistrationError';
  }
}

export class SyncResolutionError extends Error {
  constructor(tok: Token<any>, lifetime: Lifetime) {
    const reason =
      lifetime === 'transient'
        ? 'transient factories are never cached'
        : 'the instance has not been resolved yet; call await container.resolve() first';

    super(`Token "${tokenName(tok)}" cannot be resolved synchronously: ${reason}.`);
    this.name = 'SyncResolutionError';
  }
}

export class ScopedResolutionError extends Error {
  constructor(tok: Token<any>, requiredScope?: ScopeToken) {
    if (requiredScope) {
      const scopeName = requiredScope.description ?? 'anonymous';

      super(
        `Token "${tokenName(tok)}" requires scope "${scopeName}" but no matching scope container was found in the hierarchy.`,
      );
    } else {
      super(`Token "${tokenName(tok)}" uses scoped lifetime but was resolved from the root container.`);
    }

    this.name = 'ScopedResolutionError';
  }
}

export class ContainerDisposedError extends Error {
  constructor() {
    super('Cannot use a disposed container.');
    this.name = 'ContainerDisposedError';
  }
}

// ---------------------------------------------------------------------------
// Internal registration types
// ---------------------------------------------------------------------------

type ValueRegistration<T> = {
  dispose?: (instance: T) => Promise<void> | void;
  kind: 'value';
  value: T;
};

type FactoryDescriptor<T> = {
  deps: Token<any>[];
  dispose?: (instance: T) => Promise<void> | void;
  factory: (...args: any[]) => Promise<T> | T;
  kind: 'factory';
  lifetime: Lifetime;
};

type Registration<T = unknown> = FactoryDescriptor<T> | ValueRegistration<T>;

// Cache state separated from the immutable factory descriptor.
type CacheEntry<T = unknown> = {
  instance?: T;
  // Retained on failure — subsequent calls rethrow the same rejection (no silent retry).
  promise?: Promise<T>;
  resolved: boolean;
};

// ---------------------------------------------------------------------------
// ContainerGraph — inspect() output
// ---------------------------------------------------------------------------

export type ContainerNode = {
  deps: string[];
  description: string;
  kind: 'factory' | 'value';
  /** 'singleton', 'transient', 'scoped', or 'scope:<name>' for named scopes. */
  lifetime?: string;
};

export type ContainerGraph = {
  nodes: ContainerNode[];
};

// ---------------------------------------------------------------------------
// Container public interface
// ---------------------------------------------------------------------------

export interface Container {
  /** Whether the container has been disposed. */
  readonly disposed: boolean;

  /** Register a static value. */
  value<T>(tok: Token<T>, val: T, opts?: ValueOptions<T>): this;

  /** Register a factory with no dependencies. */
  factory<T>(tok: Token<T>, fn: () => Promise<T> | T, opts?: FactoryOptions<T>): this;

  /** Register a factory with typed dependencies inferred from the deps tuple. */
  factory<T, const D extends Token<any>[]>(
    tok: Token<T>,
    fn: (...deps: InferTokenTypes<D>) => Promise<T> | T,
    opts: FactoryOptions<T> & { deps: D },
  ): this;

  /** Check whether a token is registered (walks parent chain). */
  has<T>(tok: Token<T>): boolean;

  /** Resolve a single registered provider. */
  resolve<T>(tok: Token<T>): Promise<T>;

  /**
   * Resolve a token synchronously.
   * Works for value registrations and already-resolved singletons/scoped instances.
   * Throws SyncResolutionError for unresolved or transient factories.
   */
  resolveSync<T>(tok: Token<T>): T;

  /** Resolve a token, returning undefined when not registered. */
  resolveOptional<T>(tok: Token<T>): Promise<T | undefined>;

  /**
   * Eagerly resolve all registered singleton factories across the entire
   * container hierarchy. Useful for startup validation and pre-warming
   * resolveSync() hot paths.
   */
  resolveAll(): Promise<void>;

  /**
   * Return a proxy that defers synchronous resolution until the first property
   * access. The token must be resolvable via resolveSync() at access time
   * (i.e., a value or an already-warmed singleton/scoped instance).
   */
  deferred<T extends object>(tok: Token<T>): T;

  /**
   * Return a serializable graph of every registered token and its dependency
   * edges. By default traverses the full parent chain (deep: true).
   */
  inspect(opts?: { deep?: boolean }): ContainerGraph;

  /**
   * Perform registration-time cycle detection across the full dependency graph.
   * Throws CircularDependencyError if any cycle is found. Returns this for
   * chaining.
   */
  validate(): this;

  /** Create a generic child container that inherits this container's registrations. */
  createChild(): Container;

  /**
   * Create a named-scope child container. Factories registered with this
   * ScopeToken as their lifetime will be resolved and cached within this
   * scope container.
   */
  createScope(scopeToken: ScopeToken): Container;

  /**
   * Apply container modules sequentially (each module may be async). Throws
   * ContainerDisposedError if the container is disposed. Returns Promise<this>
   * for chaining: `const c = await createContainer().load(authModule)`.
   */
  load(...modules: ContainerModule[]): Promise<this>;

  /**
   * Apply container modules in parallel via Promise.all. Use for independent
   * modules that do not register tokens that depend on each other.
   */
  loadAll(...modules: ContainerModule[]): Promise<this>;

  /**
   * Subscribe to container events (register, resolve, dispose). Returns an
   * unsubscribe function.
   *
   * @example
   * const unsubscribe = container.on((event) => console.log(event));
   * // later:
   * unsubscribe();
   */
  on(listener: ContainerEventListener): () => void;

  /** Dispose the container, running all registered cleanup hooks in parallel. */
  dispose(): Promise<void>;

  [Symbol.asyncDispose](): Promise<void>;
}

// ---------------------------------------------------------------------------
// ContainerImpl (internal — not exported directly)
// ---------------------------------------------------------------------------

class ContainerImpl implements Container {
  #registry = new Map<Token<any>, Registration<any>>();
  // Per-container cache: maps a FactoryDescriptor to its resolved state.
  // Scoped instances live in the child's #cache, keyed by the parent descriptor.
  #cache = new Map<FactoryDescriptor<any>, CacheEntry<any>>();
  #parent?: ContainerImpl;
  #scope?: ScopeToken;
  #listeners = new Set<ContainerEventListener>();
  #disposed = false;

  constructor(parent?: ContainerImpl, scope?: ScopeToken) {
    this.#parent = parent;
    this.#scope = scope;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError();
  }

  // Errors in listeners must not affect container operation.
  #emit(event: ContainerEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch {
        // intentionally swallowed
      }
    }
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  value<T>(tok: Token<T>, val: T, opts?: ValueOptions<T>): this {
    this.#assertNotDisposed();

    if (this.#registry.has(tok)) throw new DuplicateRegistrationError(tok);

    const reg: ValueRegistration<T> = { dispose: opts?.dispose, kind: 'value', value: val };

    this.#registry.set(tok, reg);
    this.#emit({ description: tokenName(tok), kind: 'value', type: 'register' });

    return this;
  }

  factory<T, const D extends Token<any>[]>(
    tok: Token<T>,
    fn: (...deps: any[]) => Promise<T> | T,
    opts?: FactoryOptions<T> & { deps?: D },
  ): this {
    this.#assertNotDisposed();

    if (this.#registry.has(tok)) throw new DuplicateRegistrationError(tok);

    const reg: FactoryDescriptor<T> = {
      deps: (opts?.deps as Token<any>[]) ?? [],
      dispose: opts?.dispose,
      factory: fn,
      kind: 'factory',
      lifetime: opts?.lifetime ?? 'singleton',
    };

    this.#registry.set(tok, reg);
    this.#emit({ description: tokenName(tok), kind: 'factory', type: 'register' });

    return this;
  }

  has<T>(tok: Token<T>): boolean {
    this.#assertNotDisposed();

    return this.#getRegistration(tok) !== undefined;
  }

  async resolve<T>(tok: Token<T>): Promise<T> {
    this.#assertNotDisposed();

    const result = await this.#resolveToken(tok, []);

    this.#emit({ description: tokenName(tok), type: 'resolve' });

    return result;
  }

  resolveSync<T>(tok: Token<T>): T {
    this.#assertNotDisposed();

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ProviderNotFoundError(tok);

    const result = this.#resolveSyncReg(tok, reg);

    this.#emit({ description: tokenName(tok), type: 'resolve' });

    return result;
  }

  #resolveSyncReg<T>(tok: Token<T>, reg: Registration<T>): T {
    if (reg.kind === 'value') return reg.value;

    const { lifetime } = reg;

    // Named scope token — find the ancestor scope container and read its cache.
    if (typeof lifetime === 'symbol') {
      const scopeContainer = this.#findScope(lifetime);

      if (!scopeContainer) throw new ScopedResolutionError(tok, lifetime);

      const entry = scopeContainer.#cache.get(reg);

      if (entry?.resolved) return entry.instance as T;

      throw new SyncResolutionError(tok, lifetime);
    }

    if (lifetime === 'scoped' && !this.#parent) throw new ScopedResolutionError(tok);

    if (lifetime === 'transient') throw new SyncResolutionError(tok, lifetime);

    const cacheContainer = lifetime === 'singleton' ? this.#findOwnerContainer(tok) : this;
    const entry = cacheContainer.#cache.get(reg);

    if (entry?.resolved) return entry.instance as T;

    throw new SyncResolutionError(tok, lifetime);
  }

  async resolveOptional<T>(tok: Token<T>): Promise<T | undefined> {
    try {
      return await this.resolve(tok);
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return undefined;

      throw error;
    }
  }

  async resolveAll(): Promise<void> {
    this.#assertNotDisposed();

    const seen = new Set<Token<any>>();
    const singletons: Promise<unknown>[] = [];

    // Walk the full hierarchy so child.resolveAll() warms inherited singletons too.
    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (!seen.has(tok as Token<any>) && reg.kind === 'factory' && reg.lifetime === 'singleton') {
          seen.add(tok as Token<any>);
          singletons.push(this.#resolveToken(tok as Token<unknown>, []));
        }
      }
    }

    await Promise.all(singletons);
  }

  // R1+R2: Arrow function captures `this` — no `const self` alias needed.
  // Renamed from lazy() to deferred() to reflect that resolution is sync on access,
  // not truly async-lazy (the token must already be pre-warmed).
  deferred<T extends object>(tok: Token<T>): T {
    let resolved: T | undefined;

    return new Proxy({} as T, {
      get: (_target, prop, receiver) => {
        if (!resolved) {
          const reg = this.#getRegistration(tok);

          if (!reg) throw new ProviderNotFoundError(tok);

          resolved = this.#resolveSyncReg(tok, reg as Registration<T>);
        }

        return Reflect.get(resolved, prop, receiver);
      },
    });
  }

  inspect(opts?: { deep?: boolean }): ContainerGraph {
    const deep = opts?.deep ?? true;
    const nodes: ContainerNode[] = [];
    const seen = new Set<Token<any>>();

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (!seen.has(tok as Token<any>)) {
          seen.add(tok as Token<any>);

          if (reg.kind === 'value') {
            nodes.push({ deps: [], description: tokenName(tok as Token<any>), kind: 'value' });
          } else {
            // Represent named scope tokens as 'scope:<name>' for serializability.
            const lifetime =
              typeof reg.lifetime === 'symbol'
                ? `scope:${(reg.lifetime as symbol).description ?? 'anonymous'}`
                : reg.lifetime;

            nodes.push({
              deps: reg.deps.map((d: Token<any>) => tokenName(d)),
              description: tokenName(tok as Token<any>),
              kind: 'factory',
              lifetime,
            });
          }
        }
      }

      if (!deep) break;
    }

    return { nodes };
  }

  validate(): this {
    const visiting = new Set<Token<any>>();
    const visited = new Set<Token<any>>();

    const visit = (tok: Token<any>, path: Token<any>[]): void => {
      if (visiting.has(tok)) throw new CircularDependencyError([...path, tok]);

      if (visited.has(tok)) return;

      visiting.add(tok);

      const reg = this.#getRegistration(tok);

      if (reg?.kind === 'factory') {
        for (const dep of reg.deps) {
          visit(dep, [...path, tok]);
        }
      }

      visiting.delete(tok);
      visited.add(tok);
    };

    for (const tok of this.#registry.keys()) {
      if (!visited.has(tok as Token<any>)) {
        visit(tok as Token<any>, []);
      }
    }

    return this;
  }

  createChild(): Container {
    this.#assertNotDisposed();

    return new ContainerImpl(this);
  }

  createScope(scopeToken: ScopeToken): Container {
    this.#assertNotDisposed();

    return new ContainerImpl(this, scopeToken);
  }

  async load(...modules: ContainerModule[]): Promise<this> {
    this.#assertNotDisposed();

    for (const mod of modules) await mod(this);

    return this;
  }

  async loadAll(...modules: ContainerModule[]): Promise<this> {
    this.#assertNotDisposed();

    await Promise.all(modules.map((mod) => mod(this)));

    return this;
  }

  on(listener: ContainerEventListener): () => void {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;

    this.#emit({ type: 'dispose' });

    const hooks: Promise<void>[] = [];

    // Locally-registered providers (value + factory)
    for (const reg of this.#registry.values()) {
      if (reg.kind === 'value') {
        if (reg.dispose) hooks.push(Promise.resolve().then(() => reg.dispose!(reg.value)));
      } else if (reg.dispose) {
        const entry = this.#cache.get(reg);

        if (entry?.resolved) hooks.push(Promise.resolve().then(() => reg.dispose!(entry.instance as any)));
      }
    }

    // Scoped/named-scope instances inherited from the parent are not in #registry
    // but their resolved entries live in this child's #cache.
    const ownDescriptors = new Set<FactoryDescriptor<any>>();

    for (const reg of this.#registry.values()) {
      if (reg.kind === 'factory') ownDescriptors.add(reg);
    }

    for (const [descriptor, entry] of this.#cache) {
      if (!ownDescriptors.has(descriptor) && descriptor.dispose && entry.resolved) {
        hooks.push(Promise.resolve().then(() => descriptor.dispose!(entry.instance as any)));
      }
    }

    const outcomes = await Promise.allSettled(hooks);

    this.#cache.clear();
    this.#registry.clear();
    this.#listeners.clear();

    const failures = outcomes.filter((o): o is PromiseRejectedResult => o.status === 'rejected').map((o) => o.reason);

    if (failures.length > 0) {
      throw new AggregateError(failures, 'One or more dispose hooks failed.');
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  #getRegistration<T>(tok: Token<T>): Registration<T> | undefined {
    const local = this.#registry.get(tok) as Registration<T> | undefined;

    if (local) return local;

    if (!this.#parent) return undefined;

    this.#parent.#assertNotDisposed();

    return this.#parent.#getRegistration(tok);
  }

  /** Returns the container that owns the registration for tok (the first in the chain that has it). */
  #findOwnerContainer<T>(tok: Token<T>): ContainerImpl {
    for (const c of this.#ancestors()) {
      if (c.#registry.has(tok)) return c;
    }

    return this; // fallback — caller has verified tok exists
  }

  /** Iterates this container then each ancestor up the parent chain. */
  *#ancestors(): Generator<ContainerImpl> {
    yield this;

    let parent = this.#parent;

    while (parent) {
      yield parent;
      parent = parent.#parent;
    }
  }

  #findScope(scopeToken: ScopeToken): ContainerImpl | undefined {
    if (this.#scope === scopeToken) return this;

    if (!this.#parent) return undefined;

    return this.#parent.#findScope(scopeToken);
  }

  #getCache<T>(descriptor: FactoryDescriptor<T>): CacheEntry<T> {
    let entry = this.#cache.get(descriptor) as CacheEntry<T> | undefined;

    if (!entry) {
      entry = { resolved: false };
      this.#cache.set(descriptor, entry);
    }

    return entry;
  }

  async #resolveToken<T>(tok: Token<T>, stack: Token<any>[]): Promise<T> {
    if (stack.includes(tok)) throw new CircularDependencyError([...stack, tok]);

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ProviderNotFoundError(tok);

    const childStack = [...stack, tok];

    return this.#resolveReg(tok, reg, childStack);
  }

  async #resolveReg<T>(tok: Token<T>, reg: Registration<T>, stack: Token<any>[]): Promise<T> {
    if (reg.kind === 'value') return reg.value;

    const { deps, factory, lifetime } = reg;

    // Named scope token — find the scope container and use its cache.
    if (typeof lifetime === 'symbol') {
      const scopeContainer = this.#findScope(lifetime);

      if (!scopeContainer) throw new ScopedResolutionError(tok, lifetime);

      const entry = scopeContainer.#getCache(reg);

      if (entry.resolved) return entry.instance as T;

      if (entry.promise) return entry.promise;

      entry.promise = (async () => {
        const args = await Promise.all(deps.map((dep) => this.#resolveToken(dep, stack)));

        return factory(...args);
      })().then((instance) => {
        entry.instance = instance;
        entry.resolved = true;

        return instance;
      });

      return entry.promise;
    }

    if (lifetime === 'scoped' && !this.#parent) throw new ScopedResolutionError(tok);

    if (lifetime === 'transient') {
      const args = await Promise.all(deps.map((dep) => this.#resolveToken(dep, stack)));

      return factory(...args);
    }

    // singleton or scoped: cache in the owner container (for singletons) or this container (for scoped).
    // Singletons must live in the owning container so they are shared across child containers.
    const cacheContainer = lifetime === 'singleton' ? this.#findOwnerContainer(tok) : this;
    const entry = cacheContainer.#getCache(reg);

    if (entry.resolved) return entry.instance as T;

    // Return any in-flight or failed promise — no silent retry on failure.
    if (entry.promise) return entry.promise;

    entry.promise = (async () => {
      const args = await Promise.all(deps.map((dep) => this.#resolveToken(dep, stack)));

      return factory(...args);
    })().then((instance) => {
      entry.instance = instance;
      entry.resolved = true;

      return instance;
    });

    return entry.promise;
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createContainer(): Container {
  return new ContainerImpl();
}
