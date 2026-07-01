import type {
  Container,
  ContainerEvent,
  ContainerEventListener,
  ContainerGraph,
  ContainerNode,
  FactoryOptions,
  FactoryResolver,
  Lifetime,
  ResolveInterceptor,
  ScopeToken,
  Token,
  ValueOptions,
} from './types.js';

import { error } from './_warn.js';
import {
  ConduitCircularDependencyError,
  ConduitDisposedError,
  ConduitFrozenError,
  ConduitDuplicateRegistrationError,
  ConduitProviderNotFoundError,
  ConduitScopedResolutionError,
  ConduitSyncResolutionError,
  tokenName,
} from './errors.js';

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
    this.name =
      opts.name ??
      (parent
        ? opts.scopeTag
          ? `${parent.name}:${opts.scopeTag.description ?? 'scope'}`
          : `${parent.name}:child`
        : 'root');
  }

  #assertNotDisposed(): void {
    if (this.#disposed) throw new ConduitDisposedError(this.name);
  }

  #assertNotFrozen(): void {
    if (this.#frozen) throw new ConduitFrozenError(this.name);
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

    if (this.#registry.has(tok)) throw new ConduitDuplicateRegistrationError(tok);

    const reg: ValueRegistration<T> = { dispose: opts?.dispose, kind: 'value', value: val };

    this.#registry.set(tok, reg);
    this.#emit({ description: tokenName(tok), kind: 'value', source: this.name, type: 'register' });

    return this;
  }

  factory<T>(tok: Token<T>, fn: (resolver: FactoryResolver) => Promise<T> | T, opts?: FactoryOptions<T>): this {
    this.#assertNotDisposed();
    this.#assertNotFrozen();

    if (this.#registry.has(tok)) throw new ConduitDuplicateRegistrationError(tok);

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

    if (!reg) throw new ConduitProviderNotFoundError(tok, this.name);

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

    const resolveAndNotify = async (tok: Token<unknown>): Promise<void> => {
      const value = await this.#resolveToken(tok, new Set(), []);

      this.#emit({ description: tokenName(tok), source: this.name, type: 'resolve' });
      this.#fireInterceptors(tok, value);
    };

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (seen.has(tok as Token<any>) || reg.kind !== 'factory') continue;

        seen.add(tok as Token<any>);

        if (reg.lifetime === 'singleton') {
          work.push(resolveAndNotify(tok as Token<unknown>));
        } else if (opts?.includeScoped && typeof reg.lifetime === 'symbol') {
          const scopeContainer = this.#findScope(reg.lifetime);

          if (scopeContainer) work.push(resolveAndNotify(tok as Token<unknown>));
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
              deps: reg.deps?.map((d) => tokenName(d)),
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
   * Validate the registration graph without freezing it.
   * Checks statically-declared `deps`: throws `ConduitProviderNotFoundError` if a
   * declared dep is missing, or `ConduitCircularDependencyError` if they form a cycle.
   * Throws `ConduitDisposedError` if the container is already disposed.
   */
  validate(): this {
    this.#assertNotDisposed();

    const visited = new Set<Token<any>>();

    // Build token→deps map for static cycle detection.
    const staticDeps = new Map<Token<any>, readonly Token<any>[]>();

    for (const c of this.#ancestors()) {
      for (const [tok, reg] of c.#registry) {
        if (visited.has(tok as Token<any>)) continue;

        visited.add(tok as Token<any>);

        if (reg.kind === 'factory' && reg.deps && reg.deps.length > 0) {
          staticDeps.set(tok as Token<any>, reg.deps);

          for (const dep of reg.deps) {
            if (this.#getRegistration(dep) === undefined) {
              throw new ConduitProviderNotFoundError(dep, this.name);
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
        if (visiting.has(tok)) throw new ConduitCircularDependencyError([...path, tok]);

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

    return this;
  }

  freeze(): this {
    this.#assertNotDisposed();

    if (this.#frozen) return this;

    this.validate();
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
        error(`dispose hook failed in container '${this.name}':`, outcome.reason);
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
      resolveSync: <T>(tok: Token<T>): T => this.resolveSync(tok),
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
    if (visiting.has(tok)) throw new ConduitCircularDependencyError([...path, tok]);

    const reg = this.#getRegistration(tok) as Registration<T> | undefined;

    if (!reg) throw new ConduitProviderNotFoundError(tok, this.name);

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

      if (!scopeContainer) throw new ConduitScopedResolutionError(tok, lifetime);

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

      if (!scopeContainer) throw new ConduitScopedResolutionError(tok, lifetime);

      const entry = scopeContainer.#cache.get(reg);

      if (entry?.resolved) return entry.instance as T;

      if (entry?.rejection !== undefined) throw entry.rejection;

      throw new ConduitSyncResolutionError(tok, lifetime);
    }

    if (lifetime === 'transient') throw new ConduitSyncResolutionError(tok, lifetime);

    const cacheContainer = this.#findOwnerContainer(tok);
    const entry = cacheContainer.#cache.get(reg);

    if (entry?.resolved) return entry.instance as T;

    if (entry?.rejection !== undefined) throw entry.rejection;

    throw new ConduitSyncResolutionError(tok, lifetime);
  }
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

export function createContainer(opts?: { name?: string }): Container {
  return new ContainerImpl(undefined, { name: opts?.name ?? 'root' });
}
