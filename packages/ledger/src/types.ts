import type { Readable } from '@vielzeug/ripple';

export interface Command<TData = unknown> {
  data?: TData;
  execute: (signal?: AbortSignal) => Promise<void> | void;
  label?: string;
  rollback?: (signal?: AbortSignal) => Promise<void> | void;
}

export interface CommandMeta<TData = unknown> {
  data: TData | undefined;
  label: string | undefined;
}

/** Options accepted by `do()`/`undo()`/`redo()`. */
export interface LedgerCallOptions {
  /** Merged with the ledger's own `disposalSignal` and passed to `execute`/`rollback`. */
  signal?: AbortSignal;
}

export interface LedgerOptions<TData = unknown> {
  maxHistory?: number;
  onRollbackError?: (err: unknown, meta: CommandMeta<TData>) => void;
}

export interface Ledger<TData = unknown> {
  readonly canRedo: Readable<boolean>;
  readonly canUndo: Readable<boolean>;
  readonly historySize: Readable<number>;
  readonly historySnapshot: Readable<readonly CommandMeta<TData>[]>;
  readonly isProcessing: Readable<boolean>;
  readonly pendingCount: Readable<number>;

  clear(): Promise<void>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  do(command: Command<TData>, options?: LedgerCallOptions): Promise<void>;
  redo(options?: LedgerCallOptions): Promise<void>;
  undo(options?: LedgerCallOptions): Promise<void>;
  [Symbol.dispose](): void;
}
