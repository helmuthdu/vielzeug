export class ArchiveError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ArchiveDefinitionError extends ArchiveError {}

export type ArchiveDerivationStage = 'canonicalize' | 'hash' | 'index' | 'schema';

/** A collection callback or core runtime fault, not invalid submitted content. */
export class ArchiveDerivationError extends ArchiveError {
  readonly stage: ArchiveDerivationStage;

  constructor(stage: ArchiveDerivationStage, message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.stage = stage;
  }
}
