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
  /**
   * Resolve synchronously. Works for value providers and already-resolved
   * singleton/scoped instances. Throws `ConduitSyncResolutionError` if the instance
   * has not been resolved yet.
   */
  resolveSync<T>(tok: Token<T>): T;
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
// ContainerGraph — inspect() output
// ---------------------------------------------------------------------------

export type ContainerNode = {
  /** Statically-declared dependency token descriptions (from `deps:` option). */
  deps?: string[];
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
  /** Delegates to `dispose()`. Enables `await using` declarations. */
  [Symbol.asyncDispose](): Promise<void>;
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
   * Throws `ConduitSyncResolutionError` for transient factories or unresolved singletons.
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
   * Validate the registration graph without freezing it.
   * Checks statically-declared `deps`: throws `ConduitProviderNotFoundError` if a
   * declared dep is missing, or `ConduitCircularDependencyError` if they form a cycle.
   * Throws `ConduitDisposedError` if the container is already disposed.
   */
  validate(): this;

  /**
   * Freeze the container, locking it against further registrations.
   * After `freeze()`, `value()` and `factory()` throw `ConduitFrozenError`.
   * Validates statically-declared `deps`: throws `ConduitProviderNotFoundError` if a
   * declared dep is missing, or `ConduitCircularDependencyError` if they form a cycle.
   * Idempotent — calling `freeze()` again on an already-frozen container is a no-op.
   * Note: cycle detection for lazy (undeclared) deps happens at resolve time.
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
}
