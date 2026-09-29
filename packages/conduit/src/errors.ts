import type { Token } from './types.js';

function tokenName(token: Token<unknown>): string {
  return token.description ?? 'anonymous';
}

export class ConduitError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConduitCircularDependencyError extends ConduitError {
  readonly cycle: readonly Token<unknown>[];

  constructor(cycle: readonly Token<unknown>[]) {
    super(`Circular dependency detected: ${cycle.map(tokenName).join(' -> ')}`);
    this.cycle = Object.freeze([...cycle]);
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

export class ConduitDisposedError extends ConduitError {
  readonly containerName: string;

  constructor(containerName: string) {
    super(`Cannot use disposed container '${containerName}'.`);
    this.containerName = containerName;
  }
}

export class ConduitDisposeError extends ConduitError {
  readonly errors: readonly unknown[];

  constructor(errors: readonly unknown[]) {
    super(`Container disposal failed with ${errors.length} cleanup error${errors.length === 1 ? '' : 's'}.`);
    this.errors = Object.freeze([...errors]);
  }
}
