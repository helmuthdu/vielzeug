/** Base class for all arsenal errors. Use `instanceof ArsenalError` to catch any arsenal-originated error. */
export class ArsenalError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when converting a value to or from its serialized form fails: e.g. `memo`'s default
 * cache key (`JSON.stringify`) encountering a circular reference, or `hash` encountering an
 * unsupported class instance with `{ onClassInstance: 'throw' }`.
 */
export class ArsenalSerializationError extends ArsenalError {}

/** Why a share code was rejected: the envelope format, its byte budget, or the runtime's decode capability. */
export type ShareCodeReason = 'compression-unavailable' | 'invalid' | 'too-large';

/**
 * Thrown when a share code cannot be encoded or decoded: a foreign or malformed code, a payload
 * over the byte budget, or a compressed code on a runtime without `DecompressionStream` support.
 * The `reason` field carries the rejection class so consumers can branch without message matching.
 */
export class ShareCodeError extends ArsenalError {
  readonly reason: ShareCodeReason;

  constructor(reason: ShareCodeReason, message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.reason = reason;
  }
}
