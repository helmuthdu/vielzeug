export const ledgerTypes = `
declare module '@vielzeug/ledger' {
  /** Minimal read-only reactive value. Full interface in @vielzeug/ripple. */
  interface Computed<T> {
    readonly value: T;
    readonly disposed: boolean;
    dispose(): void;
    subscribe(listener: () => void): { dispose(): void };
    [Symbol.dispose](): void;
  }

  export interface CommandMeta {
    data:  unknown;
    label: string | undefined;
  }

  export interface Command {
    data?:    unknown;
    execute(): Promise<void> | void;
    rollback?(): Promise<void> | void;
    label?: string;
  }

  export interface LedgerOptions {
    maxHistory?: number;
    onRollbackError?: (err: unknown, meta: CommandMeta) => void;
  }

  export interface Ledger {
    readonly canRedo:         Computed<boolean>;
    readonly canUndo:         Computed<boolean>;
    readonly historySize:     Computed<number>;
    readonly historySnapshot: Computed<readonly CommandMeta[]>;
    readonly isProcessing:    Computed<boolean>;
    readonly pendingCount:    Computed<number>;

    clear(): Promise<void>;
    dispose(): void;
    do(command: Command): Promise<void>;
    redo(): Promise<void>;
    undo(): Promise<void>;
    [Symbol.dispose](): void;
  }

  export function createLedger(options?: LedgerOptions): Ledger;
  export function compose(commands: Command[], label?: string): Command;
}
`;
