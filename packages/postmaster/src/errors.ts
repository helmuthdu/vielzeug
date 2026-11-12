export class PostmasterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PostmasterDisposedError extends PostmasterError {
  constructor(message = 'Postmaster is disposed') {
    super(message);
  }
}
export class PostmasterJobError extends PostmasterError {}
