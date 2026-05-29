export type MachineErrorCode =
  | 'MACHINE_INVALID_INITIAL_STATE'
  | 'MACHINE_INVALID_MAX_TRANSITIONS_PER_FLUSH'
  | 'MACHINE_INVALID_SNAPSHOT_STATE'
  | 'MACHINE_INVALID_TRANSITION'
  | 'MACHINE_INVALID_TRANSITION_ARRAY'
  | 'MACHINE_INVALID_TRANSITION_HANDLER'
  | 'MACHINE_INVALID_TYPE_HANDLER'
  | 'MACHINE_INVALID_TYPE_IN_TRANSITION'
  | 'MACHINE_INVALID_VALIDATE_CONTEXT'
  | 'MACHINE_TRANSITION_LOOP_GUARD'
  | 'MACHINE_UNKNOWN_TARGET';

export class MachineError extends Error {
  readonly code: MachineErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: MachineErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'MachineError';
  }
}
