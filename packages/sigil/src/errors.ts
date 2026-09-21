/**
 * Base class for all sigil errors.
 * Use `instanceof SigilError` to catch any sigil-originated error in one branch.
 */
export class SigilError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when input data does not fit in the requested version/level. */
export class SigilCapacityError extends SigilError {
  readonly bytes: number;
  readonly maxBytes: number;
  readonly version: number;

  constructor(message: string, bytes: number, maxBytes: number, version: number, opts?: ErrorOptions) {
    super(message, opts);
    this.bytes = bytes;
    this.maxBytes = maxBytes;
    this.version = version;
  }
}

/** Thrown for an invalid option: version/minVersion out of range, mask outside 0–7. */
export class SigilOptionError extends SigilError {}

/**
 * Thrown when the environment lacks `BarcodeDetector`, `getUserMedia`, or QR
 * format support. Feature-detect with `isQrScanSupported()`/`qrScanSupport()`.
 */
export class SigilUnsupportedError extends SigilError {}

/** Thrown when camera access is denied (wraps `NotAllowedError`). */
export class SigilPermissionError extends SigilError {}

/** Thrown when a disposed scanner is used. */
export class SigilDisposedError extends SigilError {}
