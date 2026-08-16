import { signal } from '@vielzeug/ripple';
import {
  LedgerCancelledError,
  LedgerDisposedError,
  LedgerError,
  LedgerExecutionError,
  LedgerRollbackError,
} from './errors';
import type {
  CommandContext,
  HistoryEntry,
  Ledger,
  LedgerCallOptions,
  LedgerOptions,
  LedgerState,
  ReversibleCommand,
} from './types';

type StoredCommand<TMeta> = {
  apply: (context: CommandContext) => Promise<void> | void;
  entry: HistoryEntry<TMeta>;
  revert: (context: CommandContext) => Promise<void> | void;
};

type Operation = {
  cancel: () => void;
  reject: (reason?: unknown) => void;
  resolve: () => void;
  settled: boolean;
  start: () => Promise<void>;
  started: boolean;
};

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function snapshotCommand<TMeta>(command: ReversibleCommand<TMeta>): StoredCommand<TMeta> {
  const { apply, label, meta, revert } = command;

  return { apply, entry: Object.freeze({ label, meta }), revert };
}

function snapshotState<TMeta>(state: LedgerState<TMeta>): LedgerState<TMeta> {
  return Object.freeze({
    ...state,
    redo: Object.freeze([...state.redo]),
    undo: Object.freeze([...state.undo]),
  });
}

function operationError(method: string, disposed: boolean): LedgerCancelledError | LedgerDisposedError {
  return disposed
    ? new LedgerDisposedError(`Cannot call ${method}() on a disposed ledger.`)
    : new LedgerCancelledError(`${method}() was cancelled before it started.`);
}

/**
 * Creates a serialized history of reversible commands.
 *
 * Commands are snapshotted when submitted. Queued commands cancelled before their queue turn do
 * not invoke user code. Active commands receive an abort signal and stop cooperatively.
 *
 * @example
 * const ledger = createLedger({ maxHistory: 50 });
 * await ledger.do({
 *   apply: () => { item.name = next; },
 *   revert: () => { item.name = previous; },
 * });
 * await ledger.undo();
 * await ledger.redo();
 * using ledger = createLedger();
 */
export function createLedger<TMeta = undefined>(options: LedgerOptions = {}): Ledger<TMeta> {
  const { maxHistory = 100 } = options;

  if (!Number.isSafeInteger(maxHistory) || maxHistory < 0) {
    throw new RangeError('maxHistory must be a non-negative safe integer');
  }

  const state = signal<LedgerState<TMeta>>(
    snapshotState({ accepting: true, queued: 0, redo: [], running: 0, undo: [] }),
    { name: 'ledger:state' },
  );
  const commandStore = new WeakMap<HistoryEntry<TMeta>, StoredCommand<TMeta>>();
  const disposalController = new AbortController();
  const idleWaiters = new Set<() => void>();
  const operations = new Set<Operation>();
  let disposed = false;
  let queue = Promise.resolve();

  function updateState(update: (current: LedgerState<TMeta>) => LedgerState<TMeta>): void {
    state.value = snapshotState(update(state.value));

    if (state.value.queued === 0 && state.value.running === 0) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters.clear();
    }
  }

  function settle(operation: Operation, error?: unknown): void {
    if (operation.settled) return;

    operation.settled = true;
    operations.delete(operation);
    operation.cancel();

    if (error === undefined) operation.resolve();
    else operation.reject(error);
  }

  function enqueue(
    method: string,
    externalSignal: AbortSignal | undefined,
    task: (context: CommandContext) => Promise<void>,
  ): Promise<void> {
    if (disposed) return Promise.reject(operationError(method, true));

    const abortSignal = externalSignal
      ? AbortSignal.any([externalSignal, disposalController.signal])
      : disposalController.signal;

    return new Promise<void>((resolve, reject) => {
      const operation = {} as Operation;
      const onAbort = (): void => {
        if (operation.started || operation.settled || disposed) return;

        updateState((current) => ({ ...current, queued: current.queued - 1 }));
        settle(operation, operationError(method, false));
      };

      Object.assign(operation, {
        cancel: () => abortSignal.removeEventListener('abort', onAbort),
        reject,
        resolve,
        settled: false,
        start: async () => {
          if (operation.settled) return;

          if (disposed || abortSignal.aborted) {
            updateState((current) => ({ ...current, queued: current.queued - 1 }));
            settle(operation, operationError(method, disposed));

            return;
          }

          operation.started = true;
          updateState((current) => ({ ...current, queued: current.queued - 1, running: current.running + 1 }));

          try {
            await task({ signal: abortSignal });
            settle(operation);
          } catch (error) {
            settle(operation, error);
          } finally {
            updateState((current) => ({ ...current, running: current.running - 1 }));
          }
        },
        started: false,
      });

      abortSignal.addEventListener('abort', onAbort, { once: true });
      operations.add(operation);
      updateState((current) => ({ ...current, queued: current.queued + 1 }));
      queue = queue.then(operation.start, operation.start);
    });
  }

  async function runDo(command: StoredCommand<TMeta>, context: CommandContext): Promise<void> {
    try {
      await command.apply(context);
    } catch (error) {
      throw context.signal.aborted
        ? new LedgerCancelledError('do() was cancelled while running.', { cause: error })
        : new LedgerExecutionError(toMessage(error), { cause: error });
    }

    if (disposed || context.signal.aborted) {
      throw new LedgerCancelledError('do() was cancelled while running.');
    }

    updateState((current) => {
      if (maxHistory === 0) return { ...current, redo: [] };

      const undo = [...current.undo, command.entry];

      if (undo.length > maxHistory) undo.shift();

      return { ...current, redo: [], undo };
    });
    commandStore.set(command.entry, command);
  }

  async function runUndo(context: CommandContext): Promise<void> {
    const entry = state.value.undo[state.value.undo.length - 1];

    if (!entry) return;

    const command = commandStore.get(entry);

    if (!command) throw new LedgerError('Undo history is corrupted.');

    try {
      await command.revert(context);
    } catch (error) {
      throw context.signal.aborted
        ? new LedgerCancelledError('undo() was cancelled while running.', { cause: error })
        : new LedgerRollbackError(toMessage(error), { cause: error });
    }

    if (disposed || context.signal.aborted) {
      throw new LedgerCancelledError('undo() was cancelled while running.');
    }

    updateState((current) => ({ ...current, redo: [...current.redo, entry], undo: current.undo.slice(0, -1) }));
  }

  async function runRedo(context: CommandContext): Promise<void> {
    const entry = state.value.redo[state.value.redo.length - 1];

    if (!entry) return;

    const command = commandStore.get(entry);

    if (!command) throw new LedgerError('Redo history is corrupted.');

    try {
      await command.apply(context);
    } catch (error) {
      throw context.signal.aborted
        ? new LedgerCancelledError('redo() was cancelled while running.', { cause: error })
        : new LedgerExecutionError(toMessage(error), { cause: error });
    }

    if (disposed || context.signal.aborted) {
      throw new LedgerCancelledError('redo() was cancelled while running.');
    }

    updateState((current) => ({ ...current, redo: current.redo.slice(0, -1), undo: [...current.undo, entry] }));
  }

  return {
    clear(): Promise<void> {
      return enqueue('clear', undefined, async () => {
        updateState((current) => ({ ...current, redo: [], undo: [] }));
      });
    },

    get disposalSignal(): AbortSignal {
      return disposalController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      disposalController.abort();

      const queued = [...operations].filter((operation) => !operation.started);

      for (const operation of queued) settle(operation, operationError('operation', true));

      updateState((current) => ({ ...current, accepting: false, queued: 0, redo: [], undo: [] }));
    },

    get disposed(): boolean {
      return disposed;
    },

    do(command: ReversibleCommand<TMeta>, callOptions?: LedgerCallOptions): Promise<void> {
      const snapshot = snapshotCommand(command);

      return enqueue('do', callOptions?.signal, (context) => runDo(snapshot, context));
    },

    redo(callOptions?: LedgerCallOptions): Promise<void> {
      return enqueue('redo', callOptions?.signal, runRedo);
    },

    get state() {
      return state;
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    undo(callOptions?: LedgerCallOptions): Promise<void> {
      return enqueue('undo', callOptions?.signal, runUndo);
    },

    whenIdle(): Promise<void> {
      if (state.value.queued === 0 && state.value.running === 0) return Promise.resolve();

      return new Promise((resolve) => idleWaiters.add(resolve));
    },
  };
}
