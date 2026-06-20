// Brand symbols used for runtime type guards (isSignal, isComputed, isStore).
// Declared as unique symbols so TypeScript treats them as distinct types.

export const IS_SIGNAL: unique symbol = Symbol('ripple.is-signal');
export const IS_COMPUTED: unique symbol = Symbol('ripple.is-computed');
export const IS_STORE: unique symbol = Symbol('ripple.is-store');

// Internal sentinels

/** Marks an uninitialized computed value — distinct from any user-provided value. */
export const UNINITIALIZED: unique symbol = Symbol('ripple.uninitialized');
