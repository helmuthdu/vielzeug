/** Base class for all beacon errors. Use `instanceof BeaconError` to catch any beacon-originated error. */
export class BeaconError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when tour or coachmark configuration is invalid, such as an empty `steps` array or duplicate step ids. */
export class BeaconConfigError extends BeaconError {}

/** Thrown when a disposed handle is used after {@link BeaconTourHandle.dispose}. */
export class BeaconDisposedError extends BeaconError {}
