import { describe, expect, it, vi } from 'vitest';

import { compose, createLedger } from '../index';

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

  it('produces undefined rollback when no sub-commands have rollback', () => {
    const cmd = compose([{ execute: vi.fn() }, { execute: vi.fn() }]);

    expect(cmd.rollback).toBeUndefined();
  });

  it('produces defined rollback when at least one sub-command has rollback', () => {
    const cmd = compose([{ execute: vi.fn() }, { execute: vi.fn(), rollback: vi.fn() }]);

    expect(cmd.rollback).toBeDefined();
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
});
