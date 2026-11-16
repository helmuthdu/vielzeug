/** Base class for all palette errors. Use `instanceof PaletteError` to catch any palette-originated error. */
export class PaletteError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a color string cannot be parsed, such as a malformed hex digit or an unknown color function. The message includes the offending input. */
export class PaletteParseError extends PaletteError {}

/** Thrown when palette options are invalid, such as a `ramp` step count below two or a `mix` position outside `[0, 1]`. */
export class PaletteConfigError extends PaletteError {}
