/** Base class for all clockwork errors. Use `instanceof ClockworkError` to catch any clockwork-originated error. */
export class ClockworkError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ClockworkError {
    return err instanceof ClockworkError;
  }
}

/** Thrown when a compound state does not declare an `initial` substate. */
export class ClockworkMissingCompoundInitialError extends ClockworkError {
  readonly path: string;
  constructor(message: string, path: string, opts?: ErrorOptions) {
    super(message, opts);
    this.path = path;
  }
}

/** Thrown when a compound state's `initial` value does not match any substate. */
export class ClockworkInvalidInitialStateError extends ClockworkError {
  readonly path: string;
  readonly initial: string;
  constructor(message: string, path: string, initial: string, opts?: ErrorOptions) {
    super(message, opts);
    this.path = path;
    this.initial = initial;
  }
}

/** Thrown when a transition definition is empty or not a valid array. */
export class ClockworkInvalidTransitionArrayError extends ClockworkError {
  readonly path: string;
  readonly eventType?: string;
  constructor(message: string, path: string, eventType?: string, opts?: ErrorOptions) {
    super(message, opts);
    this.path = path;
    this.eventType = eventType;
  }
}

/** Thrown when a transition or `after` definition targets an unknown state. */
export class ClockworkUnknownTargetError extends ClockworkError {
  readonly path: string;
  readonly target: string;
  readonly eventType?: string;
  constructor(message: string, path: string, target: string, eventType?: string, opts?: ErrorOptions) {
    super(message, opts);
    this.path = path;
    this.target = target;
    this.eventType = eventType;
  }
}

/** Thrown when an `after` delay value is invalid (must be a finite number ≥ 0). */
export class ClockworkInvalidAfterDelayError extends ClockworkError {
  readonly path: string;
  readonly delay: number;
  constructor(message: string, path: string, delay: number, opts?: ErrorOptions) {
    super(message, opts);
    this.path = path;
    this.delay = delay;
  }
}

/** Thrown when `maxTransitionsPerFlush` is configured with a value less than 1. */
export class ClockworkInvalidMaxTransitionsError extends ClockworkError {
  readonly maxTransitionsPerFlush: number;
  constructor(message: string, maxTransitionsPerFlush: number, opts?: ErrorOptions) {
    super(message, opts);
    this.maxTransitionsPerFlush = maxTransitionsPerFlush;
  }
}

/** Thrown when a persisted snapshot references a state that no longer exists in the machine definition. */
export class ClockworkInvalidSnapshotStateError extends ClockworkError {
  readonly state: string;
  constructor(message: string, state: string, opts?: ErrorOptions) {
    super(message, opts);
    this.state = state;
  }
}

/** Thrown when `validateContext` returns a failure reason during init or transition. */
export class ClockworkInvalidValidateContextError extends ClockworkError {
  readonly phase: 'init' | 'transition';
  readonly reason: string | true;
  constructor(message: string, phase: 'init' | 'transition', reason: string | true, opts?: ErrorOptions) {
    super(message, opts);
    this.phase = phase;
    this.reason = reason;
  }
}

/** Thrown when the transition queue exceeds `maxTransitionsPerFlush`, indicating an infinite loop. */
export class ClockworkTransitionLoopGuardError extends ClockworkError {
  readonly maxTransitionsPerFlush: number;
  constructor(message: string, maxTransitionsPerFlush: number, opts?: ErrorOptions) {
    super(message, opts);
    this.maxTransitionsPerFlush = maxTransitionsPerFlush;
  }
}
