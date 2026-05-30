import type { Bindings } from './types';

export const LAZY = Symbol.for('rune.lazy');

export type LazyBinding = { readonly fn: () => unknown; readonly [LAZY]: true };

export function isLazyBinding(value: unknown): value is LazyBinding {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[LAZY] === true;
}

/**
 * Defer evaluation of an expensive binding value until after the log level check passes.
 * The factory function is only called when an entry is actually emitted.
 *
 * @example
 * const reqLog = log.withBindings({ diagnostics: lazy(() => buildExpensiveDiagnostics()) });
 * reqLog.debug('trace'); // diagnostics() only called when logLevel allows debug
 */
export function lazy(fn: () => unknown): LazyBinding {
  return { fn, [LAZY]: true } as LazyBinding;
}

/**
 * Resolve any lazy bindings in the given object, returning a plain Bindings object.
 * Non-lazy values are passed through unchanged. Called after the level check, so
 * expensive computations are skipped entirely when the level is suppressed.
 */
export function resolveBindings(bindings: Bindings): Bindings {
  let hasLazy = false;

  for (const v of Object.values(bindings)) {
    if (isLazyBinding(v)) {
      hasLazy = true;
      break;
    }
  }

  if (!hasLazy) return bindings;

  const resolved: Bindings = {};

  for (const [k, v] of Object.entries(bindings)) {
    resolved[k] = isLazyBinding(v) ? v.fn() : v;
  }

  return resolved;
}
