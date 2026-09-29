/** Base error for every Tavern failure. */
export class TavernError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TavernError';
  }
}

/** The consumer pasted the wrong kind of pairing code — a user-input mistake, not a bug. */
export class TavernPairingError extends TavernError {
  constructor(message: string) {
    super(message);
    this.name = 'TavernPairingError';
  }
}
