/** Base class for all patchwork errors. */
export class PatchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The document could not be patched because a pointer did not resolve. */
export class PatchPathError extends PatchError {}

/** A `test` operation did not match the document. */
export class PatchTestError extends PatchError {}
