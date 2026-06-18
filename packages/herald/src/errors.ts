export class BusDisposedError extends Error {
  constructor(busName?: string) {
    super(busName ? `Bus "${busName}" is disposed` : 'Bus is disposed');
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
