// ── Signal name registry ─────────────────────────────────────────────────────
//
// A WeakMap-based registry that maps signal instances to their names.
// Registration happens automatically when a signal is created with a `name`
// option. Zero overhead for unnamed signals.

const registry = new WeakMap<object, string>();

/** @internal Called by ReactiveBase constructor when `name` is set. */
export const registerSignal = (signal: object, name: string): void => {
  registry.set(signal, name);
};

/** Returns the registered name for a signal, or `undefined` if unnamed or unknown. */
export const getSignalName = (signal: object): string | undefined => registry.get(signal);
