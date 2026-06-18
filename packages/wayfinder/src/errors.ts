/** Thrown when any router method is called after the router has been disposed. */
export class RouterDisposedError extends Error {
  constructor() {
    super('Router is disposed');
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
