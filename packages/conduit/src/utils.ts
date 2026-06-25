import type { Container, ContainerModule, ResolveResult, Token } from './types.js';

import { ContainerProviderNotFoundError } from './errors.js';

/**
 * Resolve a token, returning `undefined` when not registered.
 * Re-throws any error other than `ContainerProviderNotFoundError`.
 */
export async function resolveOptional<T>(container: Container, tok: Token<T>): Promise<T | undefined> {
  try {
    return await container.resolve(tok);
  } catch (error) {
    if (error instanceof ContainerProviderNotFoundError) return undefined;

    throw error;
  }
}

/**
 * Resolve a token, returning `defaultValue` when not registered.
 * Re-throws any error other than `ContainerProviderNotFoundError`.
 */
export async function resolveOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): Promise<T> {
  const result = await resolveOptional(container, tok);

  return result === undefined ? defaultValue : result;
}

/**
 * Resolve a token, returning a result object instead of throwing.
 * Returns `{ ok: true, value }` on success or `{ ok: false, error }` when the
 * token is not registered. Re-throws all other errors — including
 * `ContainerDisposedError` and `ContainerCircularDependencyError`.
 */
export async function tryResolve<T>(container: Container, tok: Token<T>): Promise<ResolveResult<T>> {
  try {
    const value = await container.resolve(tok);

    return { ok: true, value };
  } catch (error) {
    if (error instanceof ContainerProviderNotFoundError) return { error, ok: false };

    throw error;
  }
}

/**
 * Resolve a token synchronously, returning `undefined` when not registered.
 * Re-throws `ContainerSyncResolutionError`, `ContainerScopedResolutionError`, and `ContainerDisposedError`.
 */
export function resolveSyncOptional<T>(container: Container, tok: Token<T>): T | undefined {
  try {
    return container.resolveSync(tok);
  } catch (error) {
    if (error instanceof ContainerProviderNotFoundError) return undefined;

    throw error;
  }
}

/**
 * Resolve a token synchronously, returning `defaultValue` when not registered.
 * Re-throws `ContainerSyncResolutionError`, `ContainerScopedResolutionError`, and `ContainerDisposedError`.
 */
export function resolveSyncOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): T {
  const result = resolveSyncOptional(container, tok);

  return result === undefined ? defaultValue : result;
}

/**
 * Resolve a token synchronously, returning a result object instead of throwing.
 * Returns `{ ok: true, value }` on success or `{ ok: false, error }` when the
 * token is not registered. Re-throws all other errors — including
 * `ContainerSyncResolutionError`, `ContainerDisposedError`, and `ContainerScopedResolutionError`.
 */
export function trySyncResolve<T>(container: Container, tok: Token<T>): ResolveResult<T> {
  try {
    const value = container.resolveSync(tok);

    return { ok: true, value };
  } catch (error) {
    if (error instanceof ContainerProviderNotFoundError) return { error, ok: false };

    throw error;
  }
}

/**
 * Apply container modules sequentially (each module may be async).
 * Returns the container for chaining.
 */
export async function loadModules(container: Container, ...modules: ContainerModule[]): Promise<Container> {
  for (const mod of modules) await mod(container);

  return container;
}
