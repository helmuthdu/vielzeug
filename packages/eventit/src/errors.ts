export class BusDisposedError extends Error {
  override name = 'BusDisposedError';
  constructor() {
    super('Bus is disposed');
  }
}
