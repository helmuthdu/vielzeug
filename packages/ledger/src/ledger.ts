import { computed, signal } from '@vielzeug/ripple';

import type { Command, CommandMeta, Ledger, LedgerOptions } from './types';

import { warn } from './_warn';

type StackEntry = {
  execute: () => Promise<void>;
  meta: CommandMeta;
  rollback?: () => Promise<void>;
};

function entryFromCommand(command: Command): StackEntry {
  return {
    execute: async () => command.execute(),
    meta: { label: command.label },
    rollback: command.rollback != null ? async () => command.rollback!() : undefined,
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
 * @example
 * const ledger = createLedger({ maxHistory: 50 });
 * await ledger.do({ execute: () => { item.name = next; }, rollback: () => { item.name = prev; } });
 * await ledger.undo();
 * await ledger.redo();
 * using ledger = createLedger();
 */
export function createLedger(options: LedgerOptions = {}): Ledger {
  const { maxHistory = 100, onRollbackError } = options;

  if (maxHistory < 1) warn('maxHistory must be >= 1; history tracking is disabled for this ledger.');

  const undoStack = signal<StackEntry[]>([], { name: 'ledger:undoStack' });
  const redoStack = signal<StackEntry[]>([], { name: 'ledger:redoStack' });
  const processing = signal(false, { name: 'ledger:processing' });

  const canUndo = computed(() => undoStack.value.length > 0, { name: 'ledger:canUndo' });
  const canRedo = computed(() => redoStack.value.length > 0, { name: 'ledger:canRedo' });
  const historySize = computed(() => undoStack.value.length, { name: 'ledger:historySize' });
  const isProcessing = computed(() => processing.value, { name: 'ledger:isProcessing' });
  const historySnapshot = computed(() => [...undoStack.value].reverse().map((e) => e.meta) as readonly CommandMeta[], {
    name: 'ledger:historySnapshot',
  });

  const disposables = [undoStack, redoStack, processing, canUndo, canRedo, historySize, isProcessing, historySnapshot];

  let isDisposed = false;
  let queue = Promise.resolve();

  function enqueue(task: () => Promise<void>): Promise<void> {
    const current = queue.then(task);

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

  async function runDo(entry: StackEntry): Promise<void> {
    await withProcessing(async () => {
      await entry.execute();

      if (isDisposed) return;

      const next = [...undoStack.value, entry];

      if (next.length > maxHistory) next.shift();

      undoStack.value = next;
      redoStack.value = [];
    });
  }

  async function runUndo(): Promise<void> {
    const stack = undoStack.value;

    if (stack.length === 0) return;

    const entry = stack[stack.length - 1];

    await withProcessing(async () => {
      if (entry.rollback) {
        try {
          await entry.rollback();
        } catch (err) {
          warn(`rollback() threw for "${entry.meta.label ?? '(unlabelled)'}". Stack position unchanged.`);
          onRollbackError?.(err, entry.meta);

          return;
        }
      }

      if (isDisposed) return;

      undoStack.value = stack.slice(0, -1);
      redoStack.value = [...redoStack.value, entry];
    });
  }

  async function runRedo(): Promise<void> {
    const stack = redoStack.value;

    if (stack.length === 0) return;

    const entry = stack[stack.length - 1];

    await withProcessing(async () => {
      await entry.execute();

      if (isDisposed) return;

      redoStack.value = stack.slice(0, -1);
      undoStack.value = [...undoStack.value, entry];
    });
  }

  function clear(): void {
    undoStack.value = [];
    redoStack.value = [];
  }

  function dispose(): void {
    isDisposed = true;

    clear();

    for (const d of disposables) d.dispose();
  }

  return {
    canRedo,
    canUndo,

    clear,

    dispose,

    do(command: Command): Promise<void> {
      return enqueue(() => runDo(entryFromCommand(command)));
    },

    historySize,
    historySnapshot,
    isProcessing,

    redo(): Promise<void> {
      return enqueue(runRedo);
    },

    [Symbol.dispose](): void {
      dispose();
    },

    undo(): Promise<void> {
      return enqueue(runUndo);
    },
  };
}
