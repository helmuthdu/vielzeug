/** Base class for all dnd errors. Use `instanceof DndError` to catch any dnd-originated error. */
export class DndError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a sortable action is called with an invalid scope not created by `createSortableScope()`. */
export class DndScopeError extends DndError {
  constructor() {
    super('Invalid scope — use createSortableScope() to create scopes.');
  }
}
