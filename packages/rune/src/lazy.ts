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
 * Non-lazy values are passed through unchanged. Single-pass: allocates only when a lazy
 * binding is actually present (copy-on-first-lazy).
 */
export function resolveBindings(bindings: Bindings): Bindings {
  let resolved: Bindings | undefined;

  for (const [k, v] of Object.entries(bindings)) {
    if (isLazyBinding(v)) {
      resolved ??= { ...bindings };
      resolved[k] = v.fn();
    }
  }

  return resolved ?? bindings;
}
