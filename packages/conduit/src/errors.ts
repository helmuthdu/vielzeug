import type { Lifetime, ScopeToken, Token } from './types.js';

export const tokenName = (t: Token<any>): string => t.description ?? 'anonymous';

/** Base class for all conduit errors. Use `instanceof ContainerError` to catch any conduit-originated error. */
export class ContainerError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ContainerError {
    return err instanceof ContainerError;
  }
}

export class ContainerCircularDependencyError extends ContainerError {
  /** The token path that forms the cycle. */
  readonly cycle: Token<any>[];

  constructor(path: Token<any>[]) {
    super(`Circular dependency detected: ${path.map(tokenName).join(' -> ')}`);
    this.cycle = path;
  }
}

export class ContainerProviderNotFoundError extends ContainerError {
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

export class ContainerDuplicateRegistrationError extends ContainerError {
  /** The token that was registered twice. */
  readonly token: Token<any>;

  constructor(tok: Token<any>) {
    super(`Token "${tokenName(tok)}" is already registered.`);
    this.token = tok;
  }
}

export class ContainerSyncResolutionError extends ContainerError {
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

export class ContainerScopedResolutionError extends ContainerError {
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
