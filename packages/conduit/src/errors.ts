import type { ScopeToken, Token } from './types.js';

export function tokenName(token: Token<unknown>): string {
  return token.description ?? 'anonymous';
}

export class ConduitError extends Error {
  protected static readonly errorName: string = 'ConduitError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = (new.target as typeof ConduitError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConduitCircularDependencyError extends ConduitError {
  protected static override readonly errorName = 'ConduitCircularDependencyError';
  readonly cycle: readonly Token<unknown>[];

  constructor(cycle: readonly Token<unknown>[]) {
    super(`Circular dependency detected: ${cycle.map(tokenName).join(' -> ')}`);
    this.cycle = Object.freeze([...cycle]);
  }
}

export class ConduitProviderNotFoundError extends ConduitError {
  protected static override readonly errorName = 'ConduitProviderNotFoundError';
  readonly containerName: string;
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>, containerName: string) {
    super(`No provider registered for token: ${tokenName(token)} (in container '${containerName}')`);
    this.containerName = containerName;
    this.token = token;
  }
}

export class ConduitDuplicateRegistrationError extends ConduitError {
  protected static override readonly errorName = 'ConduitDuplicateRegistrationError';
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>) {
    super(`Token "${tokenName(token)}" is already registered.`);
    this.token = token;
  }
}

export class ConduitScopedResolutionError extends ConduitError {
  protected static override readonly errorName = 'ConduitScopedResolutionError';
  readonly requiredScope: ScopeToken;
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>, requiredScope: ScopeToken) {
    super(`Token "${tokenName(token)}" requires scope "${requiredScope.description ?? 'anonymous'}".`);
    this.requiredScope = requiredScope;
    this.token = token;
  }
}

export class ConduitDisposedError extends ConduitError {
  protected static override readonly errorName = 'ConduitDisposedError';
  readonly containerName: string;

  constructor(containerName: string) {
    super(`Cannot use disposed container '${containerName}'.`);
    this.containerName = containerName;
  }
}

export class ConduitDisposeError extends ConduitError {
  protected static override readonly errorName = 'ConduitDisposeError';
  readonly errors: readonly unknown[];

  constructor(errors: readonly unknown[]) {
    super(`Container disposal failed with ${errors.length} cleanup error${errors.length === 1 ? '' : 's'}.`);
    this.errors = Object.freeze([...errors]);
  }
}
