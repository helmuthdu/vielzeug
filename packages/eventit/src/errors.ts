export class BusDisposedError extends Error {
  constructor() {
    super('Bus is disposed');
    this.name = 'BusDisposedError';
  }
}
