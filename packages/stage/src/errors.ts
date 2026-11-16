export class StageError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StageConfigError extends StageError {}

/** A required browser capability (e.g. canvas blob export) is missing. */
export class StageUnsupportedError extends StageError {}

/** The stage (or its worker) was disposed before a pending request settled. */
export class StageDisposedError extends StageError {}
