/**
 * Conduit — Lightweight typed dependency injection container.
 */

import { warn } from './_warn.js';

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

/** Caching strategy for factory registrations. Named scopes use a ScopeToken. */
export type Lifetime = 'singleton' | 'transient' | ScopeToken;

export type ValueOptions<T> = {
  dispose?: (instance: T) => Promise<void> | void;
};

export type FactoryOptions<T> = {
  /** Optional statically-declared dependencies. Used for early validation in `freeze()`. */
  deps?: readonly Token<any>[];
  dispose?: (instance: T) => Promise<void> | void;
  lifetime?: Lifetime;
};

// ---------------------------------------------------------------------------
// Resolver — injected into factories
// ---------------------------------------------------------------------------

/** Minimal resolver passed to every factory function. */
export interface FactoryResolver {
  resolve<T>(tok: Token<T>): Promise<T>;
}

// ---------------------------------------------------------------------------
// ContainerModule — grouping and async setup
// ---------------------------------------------------------------------------

export type ContainerModule = (container: Container) => Promise<void> | void;

// ---------------------------------------------------------------------------
// Events — observable container state
// ---------------------------------------------------------------------------

export type ContainerEvent =
  | { description: string; kind: 'factory' | 'value'; source: string; type: 'register' }
  | { description: string; source: string; type: 'resolve' }
  | { source: string; type: 'dispose' };

export type ContainerEventListener = (event: ContainerEvent) => void;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ResolveResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

/**
 * Infer the resolved-value tuple type from a `readonly` array of tokens.
 * Mirrors the return type of `resolveMany`.
 *
 * @example
 * const TOKENS = [AuthToken, LoggerToken] as const;
 * type Services = InferTokenTypes<typeof TOKENS>;
 * // → [AuthService, Logger]
 */
export type InferTokenTypes<T extends readonly Token<any>[]> = {
  [K in keyof T]: T[K] extends Token<infer U> ? U : never;
};

/** Interceptor called after every successful resolution. Receives the token and resolved value. */
export type ResolveInterceptor = <T>(tok: Token<T>, value: T) => void;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

/** Base class for all conduit errors. Use `instanceof ContainerError` to catch any conduit-originated error. */
export class ContainerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(`[@vielzeug/conduit] ${message}`, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CircularDependencyError extends ContainerError {
  /** The token path that forms the cycle. */
  readonly cycle: Token<any>[];

  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' -> ')}`);
    this.cycle = path;
  }
}

export class ProviderNotFoundError extends ContainerError {
  /** The token that could not be found. */
  readonly token: Token<any>;
  /** The container name at the time of the lookup. */
  readonly containerName: string;

  constructor(tok: Token<any>, containerName = 'unknown') {
    super(`No provider registered for token: ${tokenName(tok)} (in container '${containerName}')`);
    this.token = tok;
    this.containerName = containerName;
  }
}

export class DuplicateRegistrationError extends ContainerError {
  /** The token that was registered twice. */
  readonly token: Token<any>;

  constructor(tok: Token<any>) {
    super(`Token "${tokenName(tok)}" is already registered.`);
    this.token = tok;
  }
}

export class SyncResolutionError extends ContainerError {
  /** The token that could not be resolved synchronously. */
  readonly token: Token<any>;
  /** The lifetime that prevented synchronous resolution. */
  readonly lifetime: Lifetime;

  constructor(tok: Token<any>, lifetime: Lifetime) {
    const reason =
      lifetime === 'transient'
        ? 'transient factories are never cached'
        : typeof lifetime === 'symbol'
          ? `named-scope "${(lifetime as symbol).description ?? 'anonymous'}" instance has not been resolved yet in this scope`
          : 'the instance has not been resolved yet; call await container.resolve() or container.resolveAll() first';

    super(`Token "${tokenName(tok)}" cannot be resolved synchronously: ${reason}.`);
    this.token = tok;
    this.lifetime = lifetime;
  }
}

export class ScopedResolutionError extends ContainerError {
  /** The token that required a scope container. */
  readonly token: Token<any>;
  /** The required scope token, if any. */
  readonly requiredScope: ScopeToken | undefined;

  constructor(tok: Token<any>, requiredScope?: ScopeToken) {
    const scopeName = requiredScope?.description ?? 'anonymous';

    super(
      requiredScope
        ? `Token "${tokenName(tok)}" requires scope "${scopeName}" but no matching scope container was found in the hierarchy.`
        : `Token "${tokenName(tok)}" requires a scope container but was resolved from the root.`,
    );
    this.token = tok;
    this.requiredScope = requiredScope;
  }
}

export class ContainerDisposedError extends ContainerError {
  /** The name of the container that was already disposed. */
  readonly containerName: string;

  constructor(containerName = 'unknown') {
    super(`Cannot use a disposed container (container '${containerName}').`);
    this.containerName = containerName;
  }
}

export class ContainerFrozenError extends ContainerError {
  /** The name of the container that is frozen. */
  readonly containerName: string;

  constructor(containerName: string) {
    super(`Container '${containerName}' is frozen and cannot accept new registrations.`);
    this.containerName = containerName;
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
  deps?: readonly Token<any>[];
  dispose?: (instance: T) => Promise<void> | void;
  factory: (resolver: FactoryResolver) => Promise<T> | T;
  kind: 'factory';
  lifetime: Lifetime;
};

type Registration<T = unknown> = FactoryDescriptor<T> | ValueRegistration<T>;

// Cache state is separate from the immutable factory descriptor.
type CacheEntry<T = unknown> = {
  instance?: T;
  // Retained on failure — subsequent calls rethrow the same rejection (no silent retry).
  promise?: Promise<T>;
  // Stored on rejection so resolveSync() can rethrow the original error synchronously.
  rejection?: unknown;
  resolved: boolean;
};

// ---------------------------------------------------------------------------
// ContainerGraph — inspect() output
// ---------------------------------------------------------------------------

export type ContainerNode = {
  description: string;
  kind: 'factory' | 'value';
  /** 'singleton', 'transient', or 'scope:<name>' for named scopes. */
  lifetime?: 'singleton' | 'transient' | `scope:${string}`;
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

  /**
   * Register a factory. The factory receives a `FactoryResolver` to resolve
   * its own dependencies lazily via `resolver.resolve(Token)`.
   */
  factory<T>(tok: Token<T>, fn: (resolver: FactoryResolver) => Promise<T> | T, opts?: FactoryOptions<T>): this;

  /** Check whether a token is registered (walks parent chain). */
  has<T>(tok: Token<T>): boolean;

  /** Resolve a single registered provider. */
  resolve<T>(tok: Token<T>): Promise<T>;

  /**
   * Resolve a token synchronously.
   * Works for value registrations and already-resolved singleton/scope instances.
   * Throws `SyncResolutionError` for transient factories or unresolved singletons.
   * Rethrows the cached rejection if the factory previously failed.
   */
  resolveSync<T>(tok: Token<T>): T;

  /**
   * Resolve multiple tokens in parallel, returning a typed tuple.
   */
  resolveMany<const D extends Token<any>[]>(
    toks: D,
  ): Promise<{ [K in keyof D]: D[K] extends Token<infer U> ? U : never }>;

  /**
   * Eagerly resolve all registered singleton factories across the entire
   * container hierarchy. Useful for startup validation and pre-warming
   * `resolveSync()` hot paths.
   *
   * Pass `{ includeScoped: true }` to also pre-warm named-scope factories
   * registered on the current scope container.
   */
  resolveAll(opts?: { includeScoped?: boolean }): Promise<void>;

  /**
   * Return a serializable graph of every registered token.
   * By default traverses the full parent chain (deep: true).
   */
  inspect(opts?: { deep?: boolean }): ContainerGraph;

  /**
   * Freeze the container, locking it against further registrations.
   * After `freeze()`, `value()` and `factory()` throw `ContainerFrozenError`.
   * Runs a registration-completeness check (all registered tokens have a provider);
   * throws `ProviderNotFoundError` if any token in the graph is unregistered.
   * Note: cycle detection happens lazily at resolve time, not during freeze.
   */
  freeze(): this;

  /**
   * Create a child scope container. If `scopeToken` is provided, factories
   * registered with that token as their lifetime are resolved and cached here.
   * Omit `scopeToken` for a plain child container with no named scope.
   */
  createScope(scopeToken?: ScopeToken, opts?: { name?: string }): Container;

  /**
   * Subscribe to container events (register, resolve, dispose).
   * Events propagate up to parent containers. Returns an unsubscribe function.
   */
  on(listener: ContainerEventListener): () => void;

  /**
   * Register an interceptor called after every successful resolution.
   * Returns an unsubscribe function. Interceptor errors are swallowed.
   */
  onResolve(interceptor: ResolveInterceptor): () => void;

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
  #resolveInterceptors = new Set<ResolveInterceptor>();
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
    this.#emit({ description: tokenName(tok), kind: 'value', source: this.name, type: 'register' });

    return this;
  }

  factory<T>(tok: Token<T>, fn: (resolver: FactoryResolver) => Promise<T> | T, opts?: FactoryOptions<T>): this {
    this.#assertNotDisposed();
    this.#assertNotFrozen();

    if (this.#registry.has(tok)) throw new DuplicateRegistrationError(tok);

    const reg: FactoryDescriptor<T> = {
      deps: opts?.deps,
      dispose: opts?.dispose,
      factory: fn,
      kind: 'factory',
      lifetime: opts?.lifetime ?? 'singleton',
    };

    this.#registry.set(tok, reg);
    this.#emit({ description: tokenName(tok), kind: 'factory', source: this.name, type: 'register' });

    return this;
  }

  has<T>(tok: Token<T>): boolean {
    this.#assertNotDisposed();

    return this.#getRegistration(tok) !== undefined;
  }

  async resolve<T>(tok: Token<T>): Promise<T> {
    this.#assertNotDisposed();

    const result = await this.#resolveToken(tok, new Set(), []);

    this.#emit({ description: tokenName(tok), source: this.name, type: 'resolve' });
    this.#fireInterceptors(tok, result);

    return result;
  }

  resolveSync<T>(tok: Token<T>): T {
    this.#assertNotDisposed();

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ProviderNotFoundError(tok, this.name);

    const result = this.#resolveSyncReg(tok, reg);

    this.#emit({ description: tokenName(tok), source: this.name, type: 'resolve' });
    this.#fireInterceptors(tok, result);

    return result;
  }

  async resolveMany<const D extends Token<any>[]>(
    toks: D,
  ): Promise<{ [K in keyof D]: D[K] extends Token<infer U> ? U : never }> {
    return Promise.all(toks.map((t) => this.resolve(t))) as Promise<{
      [K in keyof D]: D[K] extends Token<infer U> ? U : never;
    }>;
  }

  async resolveAll(opts?: { includeScoped?: boolean }): Promise<void> {
    this.#assertNotDisposed();

    const seen = new Set<Token<any>>();
    const work: Promise<unknown>[] = [];

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (seen.has(tok as Token<any>) || reg.kind !== 'factory') continue;

        seen.add(tok as Token<any>);

        if (reg.lifetime === 'singleton') {
          work.push(this.#resolveToken(tok as Token<unknown>, new Set(), []));
        } else if (opts?.includeScoped && typeof reg.lifetime === 'symbol') {
          const scopeContainer = this.#findScope(reg.lifetime);

          if (scopeContainer) work.push(this.#resolveToken(tok as Token<unknown>, new Set(), []));
        }
      }
    }

    await Promise.all(work);
  }

  inspect(opts?: { deep?: boolean }): ContainerGraph {
    this.#assertNotDisposed();

    const deep = opts?.deep ?? true;
    const nodes: ContainerNode[] = [];
    const seen = new Set<Token<any>>();

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (!seen.has(tok as Token<any>)) {
          seen.add(tok as Token<any>);

          if (reg.kind === 'value') {
            nodes.push({ description: tokenName(tok as Token<any>), kind: 'value' });
          } else {
            const lifetime: ContainerNode['lifetime'] =
              typeof reg.lifetime === 'symbol'
                ? `scope:${(reg.lifetime as symbol).description ?? 'anonymous'}`
                : (reg.lifetime as 'singleton' | 'transient');

            nodes.push({
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

  /**
   * Validate the registration graph. Checks:
   * 1. All registered tokens have a provider.
   * 2. Statically declared `deps` are registered (ProviderNotFoundError).
   * 3. Statically declared `deps` do not form a cycle (CircularDependencyError).
   * Lazy (runtime) deps without `deps:` declarations are checked at resolve time.
   */
  #validate(): void {
    const visited = new Set<Token<any>>();

    // Build token→deps map for static cycle detection.
    const staticDeps = new Map<Token<any>, readonly Token<any>[]>();

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (visited.has(tok as Token<any>)) continue;

        visited.add(tok as Token<any>);

        if (this.#getRegistration(tok as Token<any>) === undefined) {
          throw new ProviderNotFoundError(tok as Token<any>, this.name);
        }

        if (reg.kind === 'factory' && reg.deps && reg.deps.length > 0) {
          staticDeps.set(tok as Token<any>, reg.deps);

          for (const dep of reg.deps) {
            if (this.#getRegistration(dep) === undefined) {
              throw new ProviderNotFoundError(dep, this.name);
            }
          }
        }
      }
    }

    // Static cycle detection over declared deps.
    if (staticDeps.size > 0) {
      const visiting = new Set<Token<any>>();
      const done = new Set<Token<any>>();

      const dfs = (tok: Token<any>, path: Token<any>[]): void => {
        if (visiting.has(tok)) throw new CircularDependencyError([...path, tok]);

        if (done.has(tok)) return;

        visiting.add(tok);

        for (const dep of staticDeps.get(tok) ?? []) {
          dfs(dep, [...path, tok]);
        }

        visiting.delete(tok);
        done.add(tok);
      };

      for (const tok of staticDeps.keys()) {
        if (!done.has(tok)) dfs(tok, []);
      }
    }
  }

  freeze(): this {
    this.#assertNotDisposed();
    this.#validate();
    this.#frozen = true;

    return this;
  }

  createScope(scopeToken?: ScopeToken, opts?: { name?: string }): Container {
    this.#assertNotDisposed();

    return new ContainerImpl(this, { name: opts?.name, scopeTag: scopeToken });
  }

  on(listener: ContainerEventListener): () => void {
    this.#assertNotDisposed();
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  onResolve(interceptor: ResolveInterceptor): () => void {
    this.#assertNotDisposed();
    this.#resolveInterceptors.add(interceptor);

    return () => this.#resolveInterceptors.delete(interceptor);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;

    this.#disposed = true;
    this.#disposeController.abort();
    this.#emit({ source: this.name, type: 'dispose' });

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

    // Inherited scope instances cached locally (not in #registry)
    for (const [descriptor, entry] of this.#cache) {
      if (!ownDescriptors.has(descriptor) && descriptor.dispose && entry.resolved) {
        hooks.push(Promise.resolve().then(() => descriptor.dispose!(entry.instance as any)));
      }
    }

    const outcomes = await Promise.allSettled(hooks);

    this.#cache.clear();
    this.#registry.clear();
    this.#listeners.clear();
    this.#resolveInterceptors.clear();

    for (const outcome of outcomes) {
      if (outcome.status === 'rejected') {
        warn(`dispose hook failed in container '${this.name}':`, outcome.reason);
      }
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #fireInterceptors<T>(tok: Token<T>, value: T): void {
    for (const interceptor of this.#resolveInterceptors) {
      try {
        interceptor(tok, value);
      } catch {
        // swallowed — interceptor errors must not disrupt resolution
      }
    }

    if (this.#parent) this.#parent.#fireInterceptors(tok, value);
  }

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

  /** Build a FactoryResolver scoped to the current resolution context. */
  #makeResolver(visiting: Set<Token<any>>, path: Token<any>[]): FactoryResolver {
    return {
      resolve: <T>(tok: Token<T>): Promise<T> => this.#resolveToken(tok, new Set(visiting), path),
    };
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

    entry.promise = Promise.resolve(reg.factory(this.#makeResolver(visiting, path)))
      .then((instance) => {
        entry.instance = instance;
        entry.resolved = true;

        return instance;
      })
      .catch((err) => {
        entry.rejection = err;
        throw err;
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

    if (lifetime === 'transient') {
      return reg.factory(this.#makeResolver(visiting, path));
    }

    // singleton — cache in owner container
    const cacheContainer = this.#findOwnerContainer(tok);

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

      if (entry?.rejection !== undefined) throw entry.rejection;

      throw new SyncResolutionError(tok, lifetime);
    }

    if (lifetime === 'transient') throw new SyncResolutionError(tok, lifetime);

    const cacheContainer = this.#findOwnerContainer(tok);
    const entry = cacheContainer.#cache.get(reg);

    if (entry?.resolved) return entry.instance as T;

    if (entry?.rejection !== undefined) throw entry.rejection;

    throw new SyncResolutionError(tok, lifetime);
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createContainer(opts?: { name?: string }): Container {
  return new ContainerImpl(undefined, { name: opts?.name ?? 'root' });
}

// ---------------------------------------------------------------------------
// Free-function resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a token, returning `undefined` when not registered.
 * Re-throws any error other than `ProviderNotFoundError`.
 */
export async function resolveOptional<T>(container: Container, tok: Token<T>): Promise<T | undefined> {
  try {
    return await container.resolve(tok);
  } catch (error) {
    if (error instanceof ProviderNotFoundError) return undefined;

    throw error;
  }
}

/**
 * Resolve a token, returning `defaultValue` when not registered.
 * Re-throws any error other than `ProviderNotFoundError`.
 */
export async function resolveOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): Promise<T> {
  const result = await resolveOptional(container, tok);

  return result === undefined ? defaultValue : result;
}

/**
 * Resolve a token, returning a result object instead of throwing.
 * Returns `{ ok: true, value }` on success, `{ ok: false, error }` on any failure.
 */
export async function tryResolve<T>(container: Container, tok: Token<T>): Promise<ResolveResult<T>> {
  try {
    const value = await container.resolve(tok);

    return { ok: true, value };
  } catch (error) {
    return { error, ok: false };
  }
}

/**
 * Resolve a token synchronously, returning `undefined` when not registered.
 * Re-throws `SyncResolutionError`, `ScopedResolutionError`, and `ContainerDisposedError`.
 */
export function resolveSyncOptional<T>(container: Container, tok: Token<T>): T | undefined {
  try {
    return container.resolveSync(tok);
  } catch (error) {
    if (error instanceof ProviderNotFoundError) return undefined;

    throw error;
  }
}

/**
 * Resolve a token synchronously, returning `defaultValue` when not registered.
 * Re-throws `SyncResolutionError`, `ScopedResolutionError`, and `ContainerDisposedError`.
 */
export function resolveSyncOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): T {
  const result = resolveSyncOptional(container, tok);

  return result === undefined ? defaultValue : result;
}

/**
 * Apply container modules sequentially (each module may be async).
 * Returns the container for chaining.
 */
export async function loadModules(container: Container, ...modules: ContainerModule[]): Promise<Container> {
  for (const mod of modules) await mod(container);

  return container;
}
