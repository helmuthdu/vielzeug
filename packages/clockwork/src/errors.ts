/** Base class for every Clockwork failure. */
export class ClockworkError extends Error {
  readonly details: Readonly<Record<string, unknown>>;

  constructor(message: string, details: Record<string, unknown> = {}, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    this.details = Object.freeze({ ...details });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The machine definition failed validation at `defineMachine()` time. */
export class ClockworkDefinitionError extends ClockworkError {}

/** A snapshot, its context, or a reducer result failed validation. */
export class ClockworkSnapshotError extends ClockworkError {}

/** An actor exceeded the fixed queued-transition limit and disposed itself. */
export class ClockworkTransitionLimitError extends ClockworkError {}
