/** Base class for all ward errors. Use `instanceof WardError` to catch any ward-originated error. */
export class WardError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a rule definition, decision attributes, or principal is malformed. */
export class WardConfigError extends WardError {}

/** Thrown when an application-provided rule condition fails. */
export class WardConditionError extends WardError {
  readonly ruleIndex: number;

  constructor(ruleIndex: number, cause: unknown) {
    super(`Rule[${ruleIndex}].condition failed`, { cause });
    this.ruleIndex = ruleIndex;
  }
}
