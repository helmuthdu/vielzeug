/**
 * Wraps localStorage access for the editor's per-library "last edited code" persistence.
 * `localStorage` can throw (Safari private mode, storage quota exceeded, disabled storage
 * in embedded contexts) — every call site used to inline its own try/catch-less call, so a
 * throw during `resetEditor()`/`clearEditor()` would surface as an unhandled error instead
 * of just... not persisting. Persistence is a nice-to-have here, never worth crashing over.
 */
const STORAGE_PREFIX = 'vielzeug-repl-code-';

function safely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const persistedCode = {
  clear: (libraryId: string): void => safely(() => localStorage.removeItem(`${STORAGE_PREFIX}${libraryId}`), undefined),
  get: (libraryId: string): string | null => safely(() => localStorage.getItem(`${STORAGE_PREFIX}${libraryId}`), null),
  set: (libraryId: string, code: string): void =>
    safely(() => localStorage.setItem(`${STORAGE_PREFIX}${libraryId}`, code), undefined),
};
