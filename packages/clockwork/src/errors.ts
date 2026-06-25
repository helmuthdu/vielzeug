export type MachineErrorCode =
  | 'MACHINE_INVALID_AFTER_DELAY'
  | 'MACHINE_INVALID_INITIAL_STATE'
  | 'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH'
  | 'MACHINE_INVALID_SNAPSHOT_STATE'
  | 'MACHINE_INVALID_TRANSITION_ARRAY'
  | 'MACHINE_INVALID_VALIDATE_CONTEXT'
  | 'MACHINE_MISSING_COMPOUND_INITIAL'
  | 'MACHINE_TRANSITION_LOOP_GUARD'
  | 'MACHINE_UNKNOWN_TARGET';

/** Const object of all `MachineError` codes for ergonomic `switch`/`if` comparisons. */
export const MachineErrorCode = {
  MACHINE_INVALID_AFTER_DELAY: 'MACHINE_INVALID_AFTER_DELAY',
  MACHINE_INVALID_INITIAL_STATE: 'MACHINE_INVALID_INITIAL_STATE',
  MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH: 'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH',
  MACHINE_INVALID_SNAPSHOT_STATE: 'MACHINE_INVALID_SNAPSHOT_STATE',
  MACHINE_INVALID_TRANSITION_ARRAY: 'MACHINE_INVALID_TRANSITION_ARRAY',
  MACHINE_INVALID_VALIDATE_CONTEXT: 'MACHINE_INVALID_VALIDATE_CONTEXT',
  MACHINE_MISSING_COMPOUND_INITIAL: 'MACHINE_MISSING_COMPOUND_INITIAL',
  MACHINE_TRANSITION_LOOP_GUARD: 'MACHINE_TRANSITION_LOOP_GUARD',
  MACHINE_UNKNOWN_TARGET: 'MACHINE_UNKNOWN_TARGET',
} as const satisfies Record<MachineErrorCode, MachineErrorCode>;

export class MachineError extends Error {
  readonly code: MachineErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: MachineErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
    this.details = details;
  }

  static is(err: unknown): err is MachineError {
    return err instanceof MachineError;
  }
}
