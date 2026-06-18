// ── Signal name lookup ────────────────────────────────────────────────────────
//
// `name` is a first-class property on ReadonlySignal (and ReactiveBase).
// getSignalName() is kept as a convenience for code that holds an opaque
// `object` reference and can't use the typed `.name` property directly.

/** Returns the debug name for any signal or store, or `undefined` if unnamed. */
export const getSignalName = (signal: object): string | undefined => (signal as { name?: string }).name;
