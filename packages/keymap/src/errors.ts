/** Base class for all keymap errors. Use `instanceof KeymapError` to catch any keymap-originated error. */
export class KeymapError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a shortcut string cannot be parsed — ambiguous or invalid key step. */
export class KeymapParseError extends KeymapError {}
