import type { Computed } from '@vielzeug/ripple';

export interface Command {
  execute: () => Promise<void> | void;
  label?: string;
  rollback?: () => Promise<void> | void;
}

export interface CommandMeta {
  label: string | undefined;
}

export interface LedgerOptions {
  maxHistory?: number;
  onRollbackError?: (err: unknown, meta: CommandMeta) => void;
}

export interface Ledger {
  readonly canRedo: Computed<boolean>;
  readonly canUndo: Computed<boolean>;
  readonly historySize: Computed<number>;
  readonly historySnapshot: Computed<readonly CommandMeta[]>;
  readonly isProcessing: Computed<boolean>;

  clear(): void;
  dispose(): void;
  do(command: Command): Promise<void>;
  redo(): Promise<void>;
  undo(): Promise<void>;
  [Symbol.dispose](): void;
}
