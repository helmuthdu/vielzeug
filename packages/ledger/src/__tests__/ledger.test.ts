import { describe, expect, it, vi } from 'vitest';

import { LedgerDisposedError, LedgerError, LedgerExecutionError, LedgerRollbackError, createLedger } from '../index';

describe('createLedger', () => {
  it('executes a command and adds to undo stack', async () => {
    const ledger = createLedger();
    const execute = vi.fn();
    const rollback = vi.fn();

    await ledger.do({ execute, rollback });
    expect(execute).toHaveBeenCalledOnce();
    expect(ledger.canUndo.value).toBe(true);
    expect(ledger.canRedo.value).toBe(false);
    expect(ledger.historySize.value).toBe(1);

    ledger.dispose();
  });

  it('undo calls rollback and moves entry to redo stack', async () => {
    const ledger = createLedger();
    const execute = vi.fn();
    const rollback = vi.fn();

    await ledger.do({ execute, rollback });
    await ledger.undo();
    expect(rollback).toHaveBeenCalledOnce();
    expect(ledger.canUndo.value).toBe(false);
    expect(ledger.canRedo.value).toBe(true);

    ledger.dispose();
  });

  it('redo re-executes command', async () => {
    const ledger = createLedger();
    const execute = vi.fn();
    const rollback = vi.fn();

    await ledger.do({ execute, rollback });
    await ledger.undo();
    await ledger.redo();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(ledger.canUndo.value).toBe(true);
    expect(ledger.canRedo.value).toBe(false);

    ledger.dispose();
  });

  it('do() clears the redo stack', async () => {
    const ledger = createLedger();

    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    await ledger.undo();
    expect(ledger.canRedo.value).toBe(true);

    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    expect(ledger.canRedo.value).toBe(false);

    ledger.dispose();
  });

  it('respects maxHistory eviction', async () => {
    const ledger = createLedger({ maxHistory: 3 });

    for (let i = 0; i < 5; i++) {
      await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    }

    expect(ledger.historySize.value).toBe(3);

    ledger.dispose();
  });

  it('maxHistory: 1 keeps only the latest command', async () => {
    const ledger = createLedger({ maxHistory: 1 });

    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });

    expect(ledger.historySize.value).toBe(1);

    ledger.dispose();
  });

  it('clear() wipes both stacks', async () => {
    const ledger = createLedger();

    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    await ledger.undo();
    await ledger.clear();
    expect(ledger.canUndo.value).toBe(false);
    expect(ledger.canRedo.value).toBe(false);
    expect(ledger.historySize.value).toBe(0);

    ledger.dispose();
  });

  it('clear() during in-flight operation \u2014 stack is empty after op completes', async () => {
    const ledger = createLedger();
    let resolver!: () => void;
    const longOp = new Promise<void>((r) => {
      resolver = r;
    });

    const doPromise = ledger.do({ execute: () => longOp, rollback: vi.fn() });
    const clearPromise = ledger.clear();

    resolver();
    await doPromise;
    await clearPromise;

    expect(ledger.historySize.value).toBe(0);
    expect(ledger.canRedo.value).toBe(false);

    ledger.dispose();
  });

  it('undo() is a no-op when stack is empty', async () => {
    const ledger = createLedger();

    await expect(ledger.undo()).resolves.toBeUndefined();

    ledger.dispose();
  });

  it('redo() is a no-op when stack is empty', async () => {
    const ledger = createLedger();

    await expect(ledger.redo()).resolves.toBeUndefined();

    ledger.dispose();
  });

  it('isProcessing is true while executing', async () => {
    const ledger = createLedger();
    const states: boolean[] = [];
    let resolver!: () => void;

    const longOp = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    const promise = ledger.do({
      execute: () => longOp,
      rollback: vi.fn(),
    });

    await Promise.resolve();
    states.push(ledger.isProcessing.value);
    resolver();
    await promise;
    states.push(ledger.isProcessing.value);
    expect(states).toEqual([true, false]);

    ledger.dispose();
  });

  it('historySnapshot is newest-first', async () => {
    const ledger = createLedger();

    await ledger.do({ execute: vi.fn(), label: 'first', rollback: vi.fn() });
    await ledger.do({ execute: vi.fn(), label: 'second', rollback: vi.fn() });
    expect(ledger.historySnapshot.value.map((e) => e.label)).toEqual(['second', 'first']);

    ledger.dispose();
  });

  it('historySnapshot reflects labels', async () => {
    const ledger = createLedger();

    await ledger.do({ execute: vi.fn(), label: 'rename', rollback: vi.fn() });
    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    expect(ledger.historySnapshot.value.map((e) => e.label)).toEqual([undefined, 'rename']);

    ledger.dispose();
  });

  it('serialises concurrent do() calls', async () => {
    const ledger = createLedger();
    const order: number[] = [];

    const p1 = ledger.do({
      execute: async () => {
        order.push(1);
      },
      rollback: vi.fn(),
    });
    const p2 = ledger.do({
      execute: async () => {
        order.push(2);
      },
      rollback: vi.fn(),
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);

    ledger.dispose();
  });

  it('supports Symbol.dispose', async () => {
    const ledger = createLedger();

    await ledger.do({ execute: vi.fn(), rollback: vi.fn() });
    ledger[Symbol.dispose]();
    expect(ledger.canUndo.disposed).toBe(true);
    expect(ledger.historySize.disposed).toBe(true);
  });

  it('redo() execute failure — entry stays on redo stack', async () => {
    const ledger = createLedger();
    let calls = 0;

    await ledger.do({
      execute: () => {
        calls++;

        if (calls > 1) throw new Error('re-execute failed');
      },
      rollback: vi.fn(),
    });

    await ledger.undo();
    await expect(ledger.redo()).rejects.toThrow('re-execute failed');
    expect(ledger.canRedo.value).toBe(true);
    expect(ledger.canUndo.value).toBe(false);

    ledger.dispose();
  });

  it('pendingCount tracks queued and in-flight operations', async () => {
    const ledger = createLedger();
    let resolver1!: () => void;
    let resolver2!: () => void;
    const op1 = new Promise<void>((r) => {
      resolver1 = r;
    });
    const op2 = new Promise<void>((r) => {
      resolver2 = r;
    });

    const p1 = ledger.do({ execute: () => op1, rollback: vi.fn() });
    const p2 = ledger.do({ execute: () => op2, rollback: vi.fn() });

    await Promise.resolve();
    expect(ledger.pendingCount.value).toBe(2);

    resolver1();
    await p1;
    expect(ledger.pendingCount.value).toBe(1);

    resolver2();
    await p2;
    expect(ledger.pendingCount.value).toBe(0);

    ledger.dispose();
  });

  it('data field is preserved in historySnapshot', async () => {
    const ledger = createLedger<{ after: string; before: string }>();

    await ledger.do({
      data: { after: 'bar', before: 'foo' },
      execute: vi.fn(),
      rollback: vi.fn(),
    });

    expect(ledger.historySnapshot.value[0].data).toEqual({ after: 'bar', before: 'foo' });

    ledger.dispose();
  });

  it('dispose() while mid-operation does not crash or write to disposed signals', async () => {
    const ledger = createLedger();
    let resolver!: () => void;
    const longOp = new Promise<void>((resolve) => {
      resolver = resolve;
    });

    const promise = ledger.do({ execute: () => longOp, rollback: vi.fn() });

    await Promise.resolve();
    ledger.dispose();
    resolver();
    await promise;
  });

  it('maxHistory: 0 emits a dev warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ledger = createLedger({ maxHistory: 0 });

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
    ledger.dispose();
  });

  it('queue survives a failed execute — subsequent operations still run', async () => {
    const ledger = createLedger();
    const good = vi.fn();

    await expect(
      ledger.do({
        execute: async () => {
          throw new Error('boom');
        },
        rollback: vi.fn(),
      }),
    ).rejects.toThrow('boom');

    await ledger.do({ execute: good, rollback: vi.fn() });
    expect(good).toHaveBeenCalledOnce();

    ledger.dispose();
  });

  it('failed execute does not add command to undo stack', async () => {
    const ledger = createLedger();

    await expect(
      ledger.do({
        execute: async () => {
          throw new Error('fail');
        },
        rollback: vi.fn(),
      }),
    ).rejects.toThrow();

    expect(ledger.canUndo.value).toBe(false);

    ledger.dispose();
  });

  describe('optional rollback', () => {
    it('undo with no rollback still pops the entry', async () => {
      const ledger = createLedger();

      await ledger.do({ execute: vi.fn() });
      expect(ledger.canUndo.value).toBe(true);

      await ledger.undo();
      expect(ledger.canUndo.value).toBe(false);
      expect(ledger.canRedo.value).toBe(true);

      ledger.dispose();
    });

    it('redo re-executes a command that had no rollback', async () => {
      const execute = vi.fn();
      const ledger = createLedger();

      await ledger.do({ execute });
      await ledger.undo();
      await ledger.redo();
      expect(execute).toHaveBeenCalledTimes(2);

      ledger.dispose();
    });

    it('rollback failure leaves stack position unchanged', async () => {
      const ledger = createLedger();

      await ledger.do({
        execute: vi.fn(),
        rollback: async () => {
          throw new Error('rollback failed');
        },
      });

      await ledger.undo();
      expect(ledger.canUndo.value).toBe(true);
      expect(ledger.canRedo.value).toBe(false);

      ledger.dispose();
    });

    it('calls onRollbackError with error and meta when rollback throws', async () => {
      const onRollbackError = vi.fn();
      const ledger = createLedger({ onRollbackError });
      const err = new Error('rollback failed');

      await ledger.do({
        execute: vi.fn(),
        label: 'my-command',
        rollback: async () => {
          throw err;
        },
      });

      await ledger.undo();
      expect(onRollbackError).toHaveBeenCalledWith(err, { data: undefined, label: 'my-command' });

      ledger.dispose();
    });
  });
});

describe('LedgerError — named subclasses', () => {
  it('each subclass is instanceof LedgerError and Error', () => {
    expect(new LedgerDisposedError('disposed')).toBeInstanceOf(LedgerError);
    expect(new LedgerDisposedError('disposed')).toBeInstanceOf(Error);
    expect(new LedgerExecutionError('exec')).toBeInstanceOf(LedgerError);
    expect(new LedgerRollbackError('roll')).toBeInstanceOf(LedgerError);
  });

  it('each subclass has the correct .name', () => {
    expect(new LedgerDisposedError('').name).toBe('LedgerDisposedError');
    expect(new LedgerExecutionError('').name).toBe('LedgerExecutionError');
    expect(new LedgerRollbackError('').name).toBe('LedgerRollbackError');
  });

  it('LedgerError.is() returns true for any subclass', () => {
    expect(LedgerError.is(new LedgerDisposedError(''))).toBe(true);
    expect(LedgerError.is(new Error('plain'))).toBe(false);
  });

  it('supports cause chaining via opts?.cause', () => {
    const cause = new Error('original');
    const err = new LedgerExecutionError('wrapped', { cause });

    expect(err.cause).toBe(cause);
  });
});
