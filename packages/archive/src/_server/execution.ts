/** The execution context both Workers use to extend a response with background work. */
export interface ArchiveExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
