export type Unsubscribe = () => void;

/**
 * Read-only observable contract: `getSnapshot()` reads current state,
 * `subscribe()` registers a change listener. Structural by design; matches
 * `Subscribable` in `@vielzeug/arsenal`.
 */
export interface Subscribable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): Unsubscribe;
}

export interface CommandContext {
  readonly signal: AbortSignal;
}

export interface ReversibleCommand<TMeta = undefined> {
  readonly apply: (context: CommandContext) => Promise<void> | void;
  readonly label?: string;
  readonly meta?: TMeta;
  readonly revert: (context: CommandContext) => Promise<void> | void;
}

export interface HistoryEntry<TMeta = undefined> {
  readonly label: string | undefined;
  readonly meta: TMeta | undefined;
}

export interface LedgerCallOptions {
  signal?: AbortSignal;
}

export interface LedgerOptions {
  maxHistory?: number;
}

export interface LedgerState<TMeta = undefined> {
  readonly queued: number;
  readonly redo: readonly HistoryEntry<TMeta>[];
  readonly running: number;
  readonly undo: readonly HistoryEntry<TMeta>[];
}

export interface Ledger<TMeta = undefined> {
  clear(): Promise<void>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  do(command: ReversibleCommand<TMeta>, options?: LedgerCallOptions): Promise<void>;
  /**
   * Appends an already-executed command to the history without running it through the queue.
   * For stores that execute synchronously and own their writes: `undo()` calls the recorded
   * `revert`, `redo()` calls the recorded `apply`, so `apply` must be able to re-apply the
   * effect. Synchronous by design: the work happened before `record`, there is nothing to run.
   */
  record(command: ReversibleCommand<TMeta>): void;
  redo(options?: LedgerCallOptions): Promise<void>;
  readonly state: Subscribable<LedgerState<TMeta>>;
  undo(options?: LedgerCallOptions): Promise<void>;
  whenIdle(): Promise<void>;
  [Symbol.dispose](): void;
}
