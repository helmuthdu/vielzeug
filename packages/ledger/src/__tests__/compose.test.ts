import { describe, expect, it, vi } from 'vitest';

import { LedgerRollbackError, compose, createLedger } from '../index';

describe('compose()', () => {
  it('executes all sub-commands in order', async () => {
    const ledger = createLedger();
    const order: number[] = [];

    await ledger.do(
      compose([
        {
          execute: async () => {
            order.push(1);
          },
          rollback: vi.fn(),
        },
        {
          execute: async () => {
            order.push(2);
          },
          rollback: vi.fn(),
        },
        {
          execute: async () => {
            order.push(3);
          },
          rollback: vi.fn(),
        },
      ]),
    );

    expect(order).toEqual([1, 2, 3]);
    expect(ledger.historySize.value).toBe(1);

    ledger.dispose();
  });

  it('rolls back sub-commands in reverse order', async () => {
    const ledger = createLedger();
    const order: number[] = [];

    await ledger.do(
      compose([
        {
          execute: vi.fn(),
          rollback: async () => {
            order.push(1);
          },
        },
        {
          execute: vi.fn(),
          rollback: async () => {
            order.push(2);
          },
        },
        {
          execute: vi.fn(),
          rollback: async () => {
            order.push(3);
          },
        },
      ]),
    );

    await ledger.undo();
    expect(order).toEqual([3, 2, 1]);

    ledger.dispose();
  });

  it('counts as one undo step', async () => {
    const ledger = createLedger();

    await ledger.do(
      compose([
        { execute: vi.fn(), rollback: vi.fn() },
        { execute: vi.fn(), rollback: vi.fn() },
      ]),
    );

    expect(ledger.historySize.value).toBe(1);
    await ledger.undo();
    expect(ledger.historySize.value).toBe(0);

    ledger.dispose();
  });

  it('stores label in historySnapshot', async () => {
    const ledger = createLedger();

    await ledger.do(
      compose(
        [
          { execute: vi.fn(), rollback: vi.fn() },
          { execute: vi.fn(), rollback: vi.fn() },
        ],
        'multi-edit',
      ),
    );

    expect(ledger.historySnapshot.value[0].label).toBe('multi-edit');

    ledger.dispose();
  });

  it('skips rollback for sub-commands with no rollback defined', async () => {
    const ledger = createLedger();
    const order: number[] = [];

    await ledger.do(
      compose([
        {
          execute: vi.fn(),
          rollback: async () => {
            order.push(1);
          },
        },
        { execute: vi.fn() },
        {
          execute: vi.fn(),
          rollback: async () => {
            order.push(3);
          },
        },
      ]),
    );

    await ledger.undo();
    expect(order).toEqual([3, 1]);

    ledger.dispose();
  });

  it('compose with no-rollback commands can still be re-executed via redo', async () => {
    const execute = vi.fn();
    const ledger = createLedger();

    await ledger.do(compose([{ execute }, { execute: vi.fn() }]));
    await ledger.undo();
    await ledger.redo();
    expect(execute).toHaveBeenCalledTimes(2);

    ledger.dispose();
  });

  it('compose([]) produces no-op execute and undefined rollback', async () => {
    const cmd = compose([]);

    await expect(cmd.execute()).resolves.toBeUndefined();
    expect(cmd.rollback).toBeUndefined();
  });

  it('produces undefined rollback when no sub-commands have rollback', () => {
    const cmd = compose([{ execute: vi.fn() }, { execute: vi.fn() }]);

    expect(cmd.rollback).toBeUndefined();
  });

  it('produces defined rollback when at least one sub-command has rollback', () => {
    const cmd = compose([{ execute: vi.fn() }, { execute: vi.fn(), rollback: vi.fn() }]);

    expect(cmd.rollback).toBeDefined();
  });

  it('compose sub-rollback error reaches onRollbackError', async () => {
    const onRollbackError = vi.fn();
    const ledger = createLedger({ onRollbackError });
    const err = new Error('sub-rollback failed');

    await ledger.do(
      compose([
        { execute: vi.fn(), rollback: vi.fn() },
        {
          execute: vi.fn(),
          rollback: async () => {
            throw err;
          },
        },
      ]),
    );

    await ledger.undo();
    expect(onRollbackError).toHaveBeenCalledWith(
      expect.objectContaining({ cause: err, message: err.message }),
      expect.objectContaining({ label: undefined }),
    );
    expect(onRollbackError.mock.calls[0][0]).toBeInstanceOf(LedgerRollbackError);
    expect(ledger.canUndo.value).toBe(true);
    expect(ledger.canRedo.value).toBe(false);

    ledger.dispose();
  });

  it('rolls back already-executed sub-commands when a later execute fails', async () => {
    const rb = vi.fn();
    const ledger = createLedger();

    await expect(
      ledger.do(
        compose([
          { execute: vi.fn(), rollback: rb },
          {
            execute: async () => {
              throw new Error('boom');
            },
          },
        ]),
      ),
    ).rejects.toThrow('boom');

    expect(rb).toHaveBeenCalledOnce();
    expect(ledger.canUndo.value).toBe(false);

    ledger.dispose();
  });

  it('forwards the same AbortSignal to every sub-command execute/rollback', async () => {
    const ledger = createLedger();
    const executeSignals: (AbortSignal | undefined)[] = [];
    const rollbackSignals: (AbortSignal | undefined)[] = [];

    await ledger.do(
      compose([
        { execute: (s) => executeSignals.push(s), rollback: (s) => rollbackSignals.push(s) },
        { execute: (s) => executeSignals.push(s), rollback: (s) => rollbackSignals.push(s) },
      ]),
    );
    await ledger.undo();

    expect(executeSignals).toHaveLength(2);
    expect(executeSignals[0]).toBeInstanceOf(AbortSignal);
    expect(executeSignals[0]).toBe(executeSignals[1]);
    expect(rollbackSignals).toHaveLength(2);
    expect(rollbackSignals[0]).toBe(rollbackSignals[1]);

    ledger.dispose();
  });
});
