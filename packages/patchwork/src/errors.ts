import type { JsonPointer } from './types';

/** Base class for all patchwork errors. */
export class PatchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * The document could not be patched because a pointer did not resolve. `pointer` names the
 * offending pointer when the library can attribute one (the failing `path` of a `move` is
 * not its `from`).
 */
export class PatchPathError extends PatchError {
  readonly pointer: JsonPointer | undefined;

  constructor(message: string, options?: ErrorOptions & { pointer?: JsonPointer }) {
    super(message, options);
    this.pointer = options?.pointer;
  }
}

/** A `test` operation did not match the document. */
export class PatchTestError extends PatchError {}
