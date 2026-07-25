// Brand symbols used for runtime type guards (isSignal, isComputed, isStore).
// Declared as unique symbols so TypeScript treats them as distinct types.

export const IS_SIGNAL: unique symbol = Symbol('ripple.is-signal');
export const IS_COMPUTED: unique symbol = Symbol('ripple.is-computed');
export const IS_STORE: unique symbol = Symbol('ripple.is-store');

// Internal sentinels

/** Marks an uninitialized computed value — distinct from any user-provided value. */
export const UNINITIALIZED: unique symbol = Symbol('ripple.uninitialized');

/**
 * @internal Symbol-keyed effect() option, never part of the public EffectOptions type.
 * resource() sets this on the internal effect it builds itself with — a resource already
 * emits its own 'compute' devtools event per re-run (see async-computed.ts), so the
 * internal effect's own 'run' event would just be a second, redundant signal for the
 * same re-run. No external caller can ever set this: it's never exported from index.ts,
 * so nothing outside this package can reference the symbol to build a literal with it.
 */
export const SUPPRESS_RUN_EVENT: unique symbol = Symbol('ripple.suppress-run-event');
