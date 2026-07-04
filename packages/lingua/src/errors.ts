/** Base class for all lingua errors. Use `instanceof LinguaError` or `LinguaError.is()` to catch any lingua-originated error. */
export class LinguaError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is LinguaError {
    return err instanceof LinguaError;
  }
}

/** Thrown when a method is called on a disposed i18n instance. */
export class LinguaDisposedError extends LinguaError {
  constructor() {
    super('Operation called on a disposed i18n instance.');
  }
}

/** Thrown when `tp()` receives a non-finite `count` value. */
export class LinguaInvalidCountError extends LinguaError {}

/** Thrown when `vars.count` is set alongside the `count` parameter in `tp()`. */
export class LinguaCountInVarsError extends LinguaError {}

/** Thrown when a requested locale has not been registered. */
export class LinguaMissingLocaleError extends LinguaError {}

/** Thrown when a locale string is not a valid BCP 47 tag. */
export class LinguaInvalidLocaleError extends LinguaError {}

/** Thrown when `loadNamespace()` / `extend()` is called for a namespace that has not been registered with `registerNamespace()`. */
export class LinguaNamespaceMissingError extends LinguaError {}

/** Thrown when restoring i18n state whose locale has no catalog. */
export class LinguaRestoreError extends LinguaError {}

// ─── Internal helpers ─────────────────────────────────────────────────────────

export function checkDisposed(disposed: boolean): void {
  if (disposed) throw new LinguaDisposedError();
}

export function checkDisposedAsync(disposed: boolean): Promise<never> | null {
  return disposed ? Promise.reject(new LinguaDisposedError()) : null;
}
