export class LinguaError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(error: unknown): error is LinguaError {
    return error instanceof LinguaError;
  }
}

export class LinguaDisposedError extends LinguaError {
  constructor() {
    super('Operation called on a disposed i18n store.');
  }
}

export class LinguaInvalidCatalogError extends LinguaError {}
export class LinguaInvalidLocaleError extends LinguaError {}
export class LinguaInvalidPluralCountError extends LinguaError {}
export class LinguaInvalidStateError extends LinguaError {}
export class LinguaMissingResourceError extends LinguaError {}
