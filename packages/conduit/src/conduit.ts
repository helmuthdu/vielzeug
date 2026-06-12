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

export type ScopeToken = symbol & { __scopeToken?: never };

/**
 * Creates a named scope token. Factories registered with a ScopeToken lifetime
 * are only resolvable from a container created with createScope(scopeToken).
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

export type InferTokenTypes<D extends Token<any>[]> = { [K in keyof D]: D[K] extends Token<infer U> ? U : never };

export type FactoryOptions<T> = {
  dispose?: (instance: T) => Promise<void> | void;
  lifetime?: Lifetime;
};

// ---------------------------------------------------------------------------
// ContainerModule — grouping and async setup
// ---------------------------------------------------------------------------

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
// Result type
// ---------------------------------------------------------------------------

export type ResolveResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

/** Base class for all conduit errors. Catch with `instanceof ContainerError` to handle any conduit-originated error. */
export class ContainerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(`[@vielzeug/conduit] ${message}`, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ContainerError {
    return err instanceof ContainerError;
  }
}

export class CircularDependencyError extends ContainerError {
  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' -> ')}`);
  }

  static is(err: unknown): err is CircularDependencyError {
    return err instanceof CircularDependencyError;
  }
}

export class ProviderNotFoundError extends ContainerError {
  constructor(tok: Token<any>, containerName?: string) {
    const loc = containerName ? ` (in container '${containerName}')` : '';

    super(`No provider registered for token: ${tokenName(tok)}${loc}`);
  }

  static is(err: unknown): err is ProviderNotFoundError {
    return err instanceof ProviderNotFoundError;
  }
}

export class DuplicateRegistrationError extends ContainerError {
  constructor(tok: Token<any>) {
    super(`Token "${tokenName(tok)}" is already registered.`);
  }

  static is(err: unknown): err is DuplicateRegistrationError {
    return err instanceof DuplicateRegistrationError;
  }
}

export class SyncResolutionError extends ContainerError {
  constructor(tok: Token<any>, lifetime: Lifetime) {
    const reason =
      lifetime === 'transient'
        ? 'transient factories are never cached'
        : typeof lifetime === 'symbol'
          ? `named-scope "${(lifetime as symbol).description ?? 'anonymous'}" instance has not been resolved yet in this scope`
          : 'the instance has not been resolved yet; call await container.resolve() or container.resolveAll() first';

    super(`Token "${tokenName(tok)}" cannot be resolved synchronously: ${reason}.`);
  }

  static is(err: unknown): err is SyncResolutionError {
    return err instanceof SyncResolutionError;
  }
}

export class ScopedResolutionError extends ContainerError {
  constructor(tok: Token<any>, requiredScope?: ScopeToken) {
    if (requiredScope) {
      const scopeName = requiredScope.description ?? 'anonymous';

      super(
        `Token "${tokenName(tok)}" requires scope "${scopeName}" but no matching scope container was found in the hierarchy.`,
      );
    } else {
      super(`Token "${tokenName(tok)}" uses scoped lifetime but was resolved from the root container.`);
    }
  }

  static is(err: unknown): err is ScopedResolutionError {
    return err instanceof ScopedResolutionError;
  }
}

export class ContainerDisposedError extends ContainerError {
  constructor(containerName?: string) {
    const loc = containerName ? ` (container '${containerName}')` : '';

    super(`Cannot use a disposed container${loc}.`);
  }

  static is(err: unknown): err is ContainerDisposedError {
    return err instanceof ContainerDisposedError;
  }
}

export class ContainerFrozenError extends ContainerError {
  constructor(containerName: string) {
    super(`Container '${containerName}' is frozen and cannot accept new registrations.`);
  }

  static is(err: unknown): err is ContainerFrozenError {
    return err instanceof ContainerFrozenError;
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

// Cache state is separate from the immutable factory descriptor.
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
  lifetime?: 'scoped' | 'singleton' | 'transient' | `scope:${string}`;
};

export type ContainerGraph = {
  nodes: ContainerNode[];
};

// ---------------------------------------------------------------------------
// Container public interface
// ---------------------------------------------------------------------------

export interface Container {
  /** Human-readable identifier for this container. Set via createContainer({ name }). */
  readonly name: string;

  /** `AbortSignal` aborted when the container is disposed. Use to tie external lifecycles to this container. */
  readonly disposalSignal: AbortSignal;

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

  /** Resolve a token, returning the provided default value when not registered. */
  resolveOrDefault<T>(tok: Token<T>, defaultValue: T): Promise<T>;

  /**
   * Resolve a token, returning a result object instead of throwing.
   * { ok: true, value } on success, { ok: false, error } on failure.
   */
  tryResolve<T>(tok: Token<T>): Promise<ResolveResult<T>>;

  /**
   * Resolve multiple tokens in parallel, returning a typed tuple.
   */
  resolveMany<const D extends Token<any>[]>(toks: D): Promise<InferTokenTypes<D>>;

  /**
   * Eagerly resolve all registered singleton factories across the entire
   * container hierarchy. Useful for startup validation and pre-warming
   * resolveSync() hot paths.
   */
  resolveAll(): Promise<void>;

  /**
   * Return a serializable graph of every registered token and its dependency
   * edges. By default traverses the full parent chain (deep: true).
   */
  inspect(opts?: { deep?: boolean }): ContainerGraph;

  /**
   * Perform registration-time cycle detection across the full dependency graph
   * (all ancestors included). Throws CircularDependencyError if any cycle is
   * found. Returns this for chaining.
   */
  validate(): this;

  /**
   * Freeze the container. After freeze(), value() and factory() throw. Useful
   * to ensure no further registrations happen after startup completes.
   */
  freeze(): this;

  /** Create a generic child container that inherits this container's registrations. */
  createChild(opts?: { name?: string }): Container;

  /**
   * Create a named-scope child container. Factories registered with this
   * ScopeToken as their lifetime will be resolved and cached within this
   * scope container.
   */
  createScope(scopeToken: ScopeToken, opts?: { name?: string }): Container;

  /**
   * Apply container modules sequentially (each module may be async).
   * Throws ContainerDisposedError if the container is disposed.
   * Returns Promise<this> for chaining.
   */
  load(...modules: ContainerModule[]): Promise<this>;

  /**
   * Subscribe to container events (register, resolve, dispose). Events
   * propagate up to parent containers. Returns an unsubscribe function.
   */
  on(listener: ContainerEventListener): () => void;

  /** Dispose the container, running all registered cleanup hooks in parallel. */
  dispose(): Promise<void>;

  [Symbol.asyncDispose](): Promise<void>;
}

// ---------------------------------------------------------------------------
// ContainerImpl
// ---------------------------------------------------------------------------

class ContainerImpl implements Container {
  #registry = new Map<Token<any>, Registration<any>>();
  #cache = new Map<FactoryDescriptor<any>, CacheEntry<any>>();
  #parent?: ContainerImpl;
  #scopeTag?: ScopeToken;
  #listeners = new Set<ContainerEventListener>();
  #disposeController = new AbortController();
  #disposed = false;
  #frozen = false;
  readonly name: string;

  constructor(parent?: ContainerImpl, opts: { name?: string; scopeTag?: ScopeToken } = {}) {
    this.#parent = parent;
    this.#scopeTag = opts.scopeTag;
    this.name = opts.name ?? (parent ? `${parent.name}:child` : 'root');
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ContainerDisposedError(this.name);
  }

  #assertNotFrozen(): void {
    if (this.#frozen) throw new ContainerFrozenError(this.name);
  }

  // Emit to local listeners then propagate up to parent.
  #emit(event: ContainerEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event);
      } catch {
        // swallowed — listener errors must not disrupt container operation
      }
    }

    if (this.#parent) this.#parent.#emit(event);
  }

  get disposalSignal(): AbortSignal {
    return this.#disposeController.signal;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  value<T>(tok: Token<T>, val: T, opts?: ValueOptions<T>): this {
    this.#assertNotDisposed();
    this.#assertNotFrozen();

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
    this.#assertNotFrozen();

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

    const result = await this.#resolveToken(tok, new Set(), []);

    this.#emit({ description: tokenName(tok), type: 'resolve' });

    return result;
  }

  resolveSync<T>(tok: Token<T>): T {
    this.#assertNotDisposed();

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ProviderNotFoundError(tok, this.name);

    const result = this.#resolveSyncReg(tok, reg);

    this.#emit({ description: tokenName(tok), type: 'resolve' });

    return result;
  }

  async resolveOptional<T>(tok: Token<T>): Promise<T | undefined> {
    try {
      return await this.resolve(tok);
    } catch (error) {
      if (error instanceof ProviderNotFoundError) return undefined;

      throw error;
    }
  }

  async resolveOrDefault<T>(tok: Token<T>, defaultValue: T): Promise<T> {
    return (await this.resolveOptional(tok)) ?? defaultValue;
  }

  async tryResolve<T>(tok: Token<T>): Promise<ResolveResult<T>> {
    try {
      const value = await this.resolve(tok);

      return { ok: true, value };
    } catch (error) {
      return { error, ok: false };
    }
  }

  async resolveMany<const D extends Token<any>[]>(toks: D): Promise<InferTokenTypes<D>> {
    return Promise.all(toks.map((t) => this.resolve(t))) as Promise<InferTokenTypes<D>>;
  }

  async resolveAll(): Promise<void> {
    this.#assertNotDisposed();

    const seen = new Set<Token<any>>();
    const singletons: Promise<unknown>[] = [];

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (!seen.has(tok as Token<any>) && reg.kind === 'factory' && reg.lifetime === 'singleton') {
          seen.add(tok as Token<any>);
          singletons.push(this.#resolveToken(tok as Token<unknown>, new Set(), []));
        }
      }
    }

    await Promise.all(singletons);
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
            const lifetime: ContainerNode['lifetime'] =
              typeof reg.lifetime === 'symbol'
                ? `scope:${(reg.lifetime as symbol).description ?? 'anonymous'}`
                : (reg.lifetime as 'scoped' | 'singleton' | 'transient');

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

      if (reg === undefined) throw new ProviderNotFoundError(tok, this.name);

      if (reg.kind === 'factory') {
        for (const dep of reg.deps) {
          visit(dep, [...path, tok]);
        }
      }

      visiting.delete(tok);
      visited.add(tok);
    };

    // Seed from full ancestor chain so parent-only cycles are also caught.
    for (const c of this.#ancestors()) {
      for (const tok of c.#registry.keys()) {
        if (!visited.has(tok as Token<any>)) visit(tok as Token<any>, []);
      }
    }

    return this;
  }

  freeze(): this {
    this.#frozen = true;

    return this;
  }

  createChild(opts?: { name?: string }): Container {
    this.#assertNotDisposed();

    return new ContainerImpl(this, { name: opts?.name });
  }

  createScope(scopeToken: ScopeToken, opts?: { name?: string }): Container {
    this.#assertNotDisposed();

    return new ContainerImpl(this, { name: opts?.name, scopeTag: scopeToken });
  }

  async load(...modules: ContainerModule[]): Promise<this> {
    this.#assertNotDisposed();
    for (const mod of modules) await mod(this);

    return this;
  }

  on(listener: ContainerEventListener): () => void {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;
    this.#disposeController.abort();
    this.#emit({ type: 'dispose' });

    const hooks: Promise<void>[] = [];
    const ownDescriptors = new Set<FactoryDescriptor<any>>();

    for (const reg of this.#registry.values()) {
      if (reg.kind === 'value') {
        if (reg.dispose) hooks.push(Promise.resolve().then(() => reg.dispose!(reg.value)));
      } else {
        ownDescriptors.add(reg);

        if (reg.dispose) {
          const entry = this.#cache.get(reg);

          if (entry?.resolved) hooks.push(Promise.resolve().then(() => reg.dispose!(entry.instance as any)));
        }
      }
    }

    // Inherited scoped instances cached locally (not in #registry)
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #getRegistration<T>(tok: Token<T>): Registration<T> | undefined {
    const local = this.#registry.get(tok) as Registration<T> | undefined;

    if (local) return local;

    if (!this.#parent) return undefined;

    this.#parent.#assertNotDisposed();

    return this.#parent.#getRegistration(tok);
  }

  #findOwnerContainer<T>(tok: Token<T>): ContainerImpl {
    for (const c of this.#ancestors()) {
      if (c.#registry.has(tok)) return c;
    }

    return this;
  }

  *#ancestors(): Generator<ContainerImpl> {
    yield this;

    let parent = this.#parent;

    while (parent) {
      yield parent;
      parent = parent.#parent;
    }
  }

  #findScope(scopeToken: ScopeToken): ContainerImpl | undefined {
    if (this.#scopeTag === scopeToken) return this;

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

  /** Populate a cache entry for a factory, deduplicating concurrent calls. */
  #populate<T>(
    entry: CacheEntry<T>,
    reg: FactoryDescriptor<T>,
    visiting: Set<Token<any>>,
    path: Token<any>[],
  ): Promise<T> {
    if (entry.resolved) return Promise.resolve(entry.instance as T);

    if (entry.promise) return entry.promise;

    entry.promise = Promise.all(reg.deps.map((dep) => this.#resolveToken(dep, new Set(visiting), path)))
      .then((args) => reg.factory(...args))
      .then((instance) => {
        entry.instance = instance;
        entry.resolved = true;

        return instance;
      });

    return entry.promise;
  }

  async #resolveToken<T>(tok: Token<T>, visiting: Set<Token<any>>, path: Token<any>[]): Promise<T> {
    if (visiting.has(tok)) throw new CircularDependencyError([...path, tok]);

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ProviderNotFoundError(tok, this.name);

    visiting.add(tok);

    const result = await this.#resolveReg(tok, reg, visiting, [...path, tok]);

    visiting.delete(tok);

    return result;
  }

  async #resolveReg<T>(tok: Token<T>, reg: Registration<T>, visiting: Set<Token<any>>, path: Token<any>[]): Promise<T> {
    if (reg.kind === 'value') return reg.value;

    const { lifetime } = reg;

    // Named scope token
    if (typeof lifetime === 'symbol') {
      const scopeContainer = this.#findScope(lifetime);

      if (!scopeContainer) throw new ScopedResolutionError(tok, lifetime);

      return this.#populate(scopeContainer.#getCache(reg), reg, visiting, path);
    }

    if (lifetime === 'scoped' && !this.#parent) throw new ScopedResolutionError(tok);

    if (lifetime === 'transient') {
      const args = await Promise.all(reg.deps.map((dep) => this.#resolveToken(dep, visiting, path)));

      return reg.factory(...args);
    }

    // singleton or scoped — cache in owner (singleton) or this (scoped)
    const cacheContainer = lifetime === 'singleton' ? this.#findOwnerContainer(tok) : this;

    return this.#populate(cacheContainer.#getCache(reg), reg, visiting, path);
  }

  #resolveSyncReg<T>(tok: Token<T>, reg: Registration<T>): T {
    if (reg.kind === 'value') return reg.value;

    const { lifetime } = reg;

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
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createContainer(opts?: { name?: string }): Container {
  return new ContainerImpl(undefined, { name: opts?.name ?? 'root' });
}
