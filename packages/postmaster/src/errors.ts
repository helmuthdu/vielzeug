export class PostmasterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PostmasterDisposedError extends PostmasterError {}
export class PostmasterJobError extends PostmasterError {}
