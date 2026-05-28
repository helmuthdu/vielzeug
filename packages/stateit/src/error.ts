export type StateErrorCode =
  | 'COMPUTED_CYCLE'
  | 'DISPOSED_READ'
  | 'DISPOSED_SCOPE'
  | 'INFINITE_LOOP'
  | 'INVALID_CLEANUP'
  | 'INVALID_STORE';

export class StateError extends Error {
  readonly code: StateErrorCode;

  constructor(code: StateErrorCode, message: string) {
    super(`[stateit/${code}] ${message}`);
    this.name = 'StateError';
    this.code = code;
  }
}
