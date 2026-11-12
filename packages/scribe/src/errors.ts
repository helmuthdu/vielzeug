/** Base class for every scribe error. Narrow unknown failures with `instanceof ScribeError`. */
export class ScribeError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
  }
}

/** The input exceeded a parser limit (size or block nesting depth): a hostile or oversized input. */
export class ScribeLimitError extends ScribeError {}
