/** Base class for all dnd errors. Use `instanceof DndError` to catch any dnd-originated error. */
export class DndError extends Error {
  protected static readonly errorName: string = 'DndError';

  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = (new.target as typeof DndError).errorName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a sortable action is called with an invalid scope not created by `createSortableScope()`. */
export class DndScopeError extends DndError {
  protected static override readonly errorName = 'DndScopeError';

  constructor(message = 'Invalid scope — use createSortableScope() to create scopes.') {
    super(message);
  }
}
