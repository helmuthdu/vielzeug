/** Base class for all illusionist errors. Use `instanceof IllusionistError` to catch any illusionist-originated error. */
export class IllusionistError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the seeded random source produces an invalid value. */
export class IllusionistSeedError extends IllusionistError {}
