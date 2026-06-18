import type { Bindings } from './types';

const LAZY_BRAND = Symbol('rune.lazy');

/** A deferred binding value — evaluated only when an entry is actually emitted. Create via `lazy(fn)`. */
export type LazyBinding = { readonly factory: () => unknown; readonly [LAZY_BRAND]: true };

function isLazy(v: unknown): v is LazyBinding {
  return typeof v === 'object' && v !== null && (v as Record<symbol, unknown>)[LAZY_BRAND] === true;
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
  return { factory: fn, [LAZY_BRAND]: true } as LazyBinding;
}

/**
 * Resolve any lazy bindings in the given object, returning a plain Bindings object.
 * Non-lazy values are passed through unchanged. Single-pass: allocates only when a lazy
 * binding is actually present (copy-on-first-lazy).
 *
 * **Shallow only** — if a lazy factory returns an object that itself contains lazy bindings,
 * those nested lazy values are NOT resolved. Only top-level keys of the bindings object
 * are checked.
 */
export function resolveBindings(bindings: Bindings): Bindings {
  let resolved: Bindings | undefined;

  for (const [k, v] of Object.entries(bindings)) {
    if (isLazy(v)) {
      resolved ??= { ...bindings };
      resolved[k] = v.factory();
    }
  }

  return resolved ?? bindings;
}
