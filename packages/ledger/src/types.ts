import type { Readable } from '@vielzeug/ripple';

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
  readonly accepting: boolean;
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
  redo(options?: LedgerCallOptions): Promise<void>;
  readonly state: Readable<LedgerState<TMeta>>;
  undo(options?: LedgerCallOptions): Promise<void>;
  whenIdle(): Promise<void>;
  [Symbol.dispose](): void;
}
