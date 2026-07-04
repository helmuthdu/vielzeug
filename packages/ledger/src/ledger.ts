import { computed, signal } from '@vielzeug/ripple';

import type { Command, CommandMeta, Ledger, LedgerCallOptions, LedgerOptions } from './types';

import { warn } from './_dev';
import { LedgerDisposedError, LedgerExecutionError, LedgerRollbackError } from './errors';

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

type StackEntry<TData = unknown> = {
  execute: (signal?: AbortSignal) => Promise<void>;
  meta: CommandMeta<TData>;
  rollback?: (signal?: AbortSignal) => Promise<void>;
};

function entryFromCommand<TData>(command: Command<TData>): StackEntry<TData> {
  const { rollback } = command;

  return {
    execute: async (signal) => command.execute(signal),
    meta: { data: command.data, label: command.label },
    rollback: rollback != null ? async (signal) => rollback(signal) : undefined,
  };
}

/**
 * Creates an async undo/redo command history.
 *
 * Each command is `{ execute, rollback? }`. `rollback` is optional — commands
 * without one are still tracked in history but undo skips the reversal step.
 * Operations are serialised — concurrent calls queue behind each other.
 * All state signals are Ripple `Computed` values for zero-glue UI binding.
 *
 * `execute`/`rollback` receive an `AbortSignal` — merged from the ledger's own
 * `disposalSignal` and any `signal` passed to `do()`/`undo()`/`redo()` — so long-running
 * commands can observe cancellation or disposal.
 *
 * @example
 * const ledger = createLedger({ maxHistory: 50 });
 * await ledger.do({ execute: () => { item.name = next; }, rollback: () => { item.name = prev; } });
 * await ledger.undo();
 * await ledger.redo();
 * using ledger = createLedger();
 */
export function createLedger<TData = unknown>(options: LedgerOptions<TData> = {}): Ledger<TData> {
  const { maxHistory = 100, onRollbackError } = options;

  if (maxHistory < 1) warn('maxHistory must be >= 1; history tracking is disabled for this ledger.');

  const undoStack = signal<StackEntry<TData>[]>([], { name: 'ledger:undoStack' });
  const redoStack = signal<StackEntry<TData>[]>([], { name: 'ledger:redoStack' });
  const pending = signal(0, { name: 'ledger:pending' });
  const processing = signal(false, { name: 'ledger:processing' });

  const canUndo = computed(() => undoStack.value.length > 0, { name: 'ledger:canUndo' });
  const canRedo = computed(() => redoStack.value.length > 0, { name: 'ledger:canRedo' });
  const historySize = computed(() => undoStack.value.length, { name: 'ledger:historySize' });
  const isProcessing = computed(() => processing.value, { name: 'ledger:isProcessing' });
  const pendingCount = computed(() => pending.value, { name: 'ledger:pendingCount' });
  const historySnapshot = computed(
    (): readonly CommandMeta<TData>[] => [...undoStack.value].reverse().map((e) => e.meta),
    { name: 'ledger:historySnapshot' },
  );

  const disposables = [
    undoStack,
    redoStack,
    pending,
    processing,
    canUndo,
    canRedo,
    historySize,
    isProcessing,
    pendingCount,
    historySnapshot,
  ];

  let isDisposed = false;
  let queue = Promise.resolve();

  const ac = new AbortController();

  function operationSignal(external?: AbortSignal): AbortSignal {
    return external ? AbortSignal.any([external, ac.signal]) : ac.signal;
  }

  function enqueue(method: string, task: () => Promise<void>): Promise<void> {
    if (isDisposed) return Promise.reject(new LedgerDisposedError(`Cannot call ${method}() on a disposed ledger.`));

    pending.value++;

    const current = queue.then(task).finally(() => {
      if (!isDisposed) pending.value--;
    });

    queue = current.catch(() => {});

    return current;
  }

  async function withProcessing(fn: () => Promise<void>): Promise<void> {
    processing.value = true;

    try {
      await fn();
    } finally {
      if (!isDisposed) processing.value = false;
    }
  }

  async function runDo(entry: StackEntry<TData>, signal: AbortSignal): Promise<void> {
    await withProcessing(async () => {
      try {
        await entry.execute(signal);
      } catch (err) {
        throw new LedgerExecutionError(toMessage(err), { cause: err });
      }

      if (isDisposed) return;

      const next = [...undoStack.value, entry];

      if (next.length > maxHistory) next.shift();

      undoStack.value = next;
      redoStack.value = [];
    });
  }

  async function runUndo(signal: AbortSignal): Promise<void> {
    const stack = undoStack.value;

    if (stack.length === 0) return;

    const entry = stack[stack.length - 1];

    await withProcessing(async () => {
      if (entry.rollback) {
        try {
          await entry.rollback(signal);
        } catch (err) {
          warn(`rollback() threw for "${entry.meta.label ?? '(unlabelled)'}". Stack position unchanged.`);
          onRollbackError?.(new LedgerRollbackError(toMessage(err), { cause: err }), entry.meta);

          return;
        }
      }

      if (isDisposed) return;

      undoStack.value = stack.slice(0, -1);
      redoStack.value = [...redoStack.value, entry];
    });
  }

  async function runRedo(signal: AbortSignal): Promise<void> {
    const stack = redoStack.value;

    if (stack.length === 0) return;

    const entry = stack[stack.length - 1];

    await withProcessing(async () => {
      try {
        await entry.execute(signal);
      } catch (err) {
        throw new LedgerExecutionError(toMessage(err), { cause: err });
      }

      if (isDisposed) return;

      redoStack.value = stack.slice(0, -1);
      undoStack.value = [...undoStack.value, entry];
    });
  }

  function clear(): Promise<void> {
    return enqueue('clear', async () => {
      if (isDisposed) return;

      undoStack.value = [];
      redoStack.value = [];
    });
  }

  function dispose(): void {
    isDisposed = true;
    ac.abort();

    undoStack.value = [];
    redoStack.value = [];

    for (const d of disposables) d.dispose();
  }

  return {
    canRedo,
    canUndo,

    clear,

    get disposalSignal(): AbortSignal {
      return ac.signal;
    },
    dispose,
    get disposed(): boolean {
      return isDisposed;
    },

    do(command: Command<TData>, callOptions?: LedgerCallOptions): Promise<void> {
      return enqueue('do', () => runDo(entryFromCommand<TData>(command), operationSignal(callOptions?.signal)));
    },

    historySize,
    historySnapshot,
    isProcessing,
    pendingCount,

    redo(callOptions?: LedgerCallOptions): Promise<void> {
      return enqueue('redo', () => runRedo(operationSignal(callOptions?.signal)));
    },

    [Symbol.dispose](): void {
      dispose();
    },

    undo(callOptions?: LedgerCallOptions): Promise<void> {
      return enqueue('undo', () => runUndo(operationSignal(callOptions?.signal)));
    },
  };
}
