/** Base class for all tabula errors. Use `instanceof TabulaError` to catch any tabula-originated error. */
export class TabulaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A CSV document that cannot be read at all (e.g. an empty header request with no rows). */
export class TabulaParseError extends TabulaError {}

/** One row failed schema validation; `line` is 1-based over physical document lines. */
export class TabulaRowError extends TabulaError {
  readonly issues: readonly unknown[];
  readonly line: number;

  constructor(line: number, issues: readonly unknown[]) {
    super(`row at line ${line} failed validation`, { cause: issues });
    this.line = line;
    this.issues = issues;
  }
}

/** Aggregate of every invalid row from a typed parse; inspect `errors` per line. */
export class TabulaValidationError extends TabulaError {
  readonly errors: readonly TabulaRowError[];

  constructor(errors: readonly TabulaRowError[], message = `${errors.length} invalid row(s)`) {
    super(message, { cause: errors });
    this.errors = errors;
  }
}
