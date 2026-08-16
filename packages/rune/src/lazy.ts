const LAZY_BRAND = Symbol('rune.lazy');

/** A deferred binding value — evaluated only when an entry is actually emitted. Create via `lazy(fn)`. */
export type LazyBinding = { readonly factory: () => unknown; readonly [LAZY_BRAND]: true };

/** @internal */
export function isLazy(v: unknown): v is LazyBinding {
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
