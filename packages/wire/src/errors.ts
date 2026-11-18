/** Base class for all wire errors. Use `instanceof WireError` to catch any wire-originated error. */
export class WireError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a graph operation receives an edge that references a node id outside the supplied node set. */
export class WireGraphError extends WireError {}

/** Thrown when routing options are invalid, such as a negative `handleLength`, `padding`, `stub`, or `bendPenalty`. */
export class WireConfigError extends WireError {}
