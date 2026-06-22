import type { Computed } from '@vielzeug/ripple';

export interface Command {
  data?: unknown;
  execute: () => Promise<void> | void;
  label?: string;
  rollback?: () => Promise<void> | void;
}

export interface CommandMeta<TData = unknown> {
  data: TData | undefined;
  label: string | undefined;
}

export interface LedgerOptions<TData = unknown> {
  maxHistory?: number;
  onRollbackError?: (err: unknown, meta: CommandMeta<TData>) => void;
}

export interface Ledger<TData = unknown> {
  readonly canRedo: Computed<boolean>;
  readonly canUndo: Computed<boolean>;
  readonly historySize: Computed<number>;
  readonly historySnapshot: Computed<readonly CommandMeta<TData>[]>;
  readonly isProcessing: Computed<boolean>;
  readonly pendingCount: Computed<number>;

  clear(): Promise<void>;
  dispose(): void;
  do(command: Command): Promise<void>;
  redo(): Promise<void>;
  undo(): Promise<void>;
  [Symbol.dispose](): void;
}
