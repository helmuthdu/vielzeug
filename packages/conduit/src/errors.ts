import type { ScopeToken, Token } from './types.js';

export function tokenName(token: Token<unknown>): string {
  return token.description ?? 'anonymous';
}

export class ConduitError extends Error {
  static is(error: unknown): error is ConduitError {
    return error instanceof ConduitError;
  }

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConduitCircularDependencyError extends ConduitError {
  readonly cycle: Token<unknown>[];

  constructor(cycle: Token<unknown>[]) {
    super(`Circular dependency detected: ${cycle.map(tokenName).join(' -> ')}`);
    this.cycle = cycle;
  }
}

export class ConduitProviderNotFoundError extends ConduitError {
  readonly containerName: string;
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>, containerName: string) {
    super(`No provider registered for token: ${tokenName(token)} (in container '${containerName}')`);
    this.containerName = containerName;
    this.token = token;
  }
}

export class ConduitDuplicateRegistrationError extends ConduitError {
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>) {
    super(`Token "${tokenName(token)}" is already registered.`);
    this.token = token;
  }
}

export class ConduitScopedResolutionError extends ConduitError {
  readonly requiredScope: ScopeToken;
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>, requiredScope: ScopeToken) {
    super(`Token "${tokenName(token)}" requires scope "${requiredScope.description ?? 'anonymous'}".`);
    this.requiredScope = requiredScope;
    this.token = token;
  }
}

export class ConduitDisposedError extends ConduitError {
  readonly containerName: string;

  constructor(containerName: string) {
    super(`Cannot use disposed container '${containerName}'.`);
    this.containerName = containerName;
  }
}

export class ConduitDisposeError extends ConduitError {
  readonly errors: unknown[];

  constructor(errors: unknown[]) {
    super(`Container disposal failed with ${errors.length} cleanup error${errors.length === 1 ? '' : 's'}.`);
    this.errors = errors;
  }
}
