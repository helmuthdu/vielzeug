import { describe, expect, it, vi } from 'vitest';

import {
  LedgerCancelledError,
  LedgerDisposedError,
  LedgerError,
  LedgerExecutionError,
  LedgerRollbackError,
  createLedger,
} from '../index';

describe('createLedger', () => {
  it('applies, reverts, and reapplies a reversible command', async () => {
    const ledger = createLedger();
    let value = 0;

    await ledger.do({
      apply: () => {
        value = 1;
      },
      revert: () => {
        value = 0;
      },
    });
    await ledger.undo();
    await ledger.redo();

    expect(value).toBe(1);
    expect(ledger.state.value.undo).toHaveLength(1);
    expect(ledger.state.value.redo).toHaveLength(0);
    ledger.dispose();
  });

  it('publishes immutable history metadata newest first', async () => {
    const ledger = createLedger<{ id: string }>();

    await ledger.do({ apply: vi.fn(), label: 'first', meta: { id: '1' }, revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'second', meta: { id: '2' }, revert: vi.fn() });

    expect(ledger.state.value.undo.map((entry) => entry.label)).toEqual(['first', 'second']);
    expect(ledger.state.value.undo.at(-1)?.meta).toEqual({ id: '2' });
    expect(Object.isFrozen(ledger.state.value)).toBe(true);
    expect(Object.isFrozen(ledger.state.value.undo)).toBe(true);
    expect(Object.isFrozen(ledger.state.value.undo[0]!)).toBe(true);
    ledger.dispose();
  });

  it('evicts oldest history entries at maxHistory', async () => {
    const ledger = createLedger({ maxHistory: 2 });

    await ledger.do({ apply: vi.fn(), label: 'first', revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'second', revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'third', revert: vi.fn() });

    expect(ledger.state.value.undo.map((entry) => entry.label)).toEqual(['second', 'third']);
    ledger.dispose();
  });

  it('does not retain history when maxHistory is zero', async () => {
    const apply = vi.fn();
    const ledger = createLedger({ maxHistory: 0 });

    await ledger.do({ apply, revert: vi.fn() });

    expect(apply).toHaveBeenCalledOnce();
    expect(ledger.state.value.undo).toHaveLength(0);
    ledger.dispose();
  });

  it.each([-1, 1.5, Infinity, NaN])('rejects invalid maxHistory: %s', (maxHistory) => {
    expect(() => createLedger({ maxHistory })).toThrow(RangeError);
  });

  it('serializes submitted operations', async () => {
    const ledger = createLedger();
    const order: number[] = [];

    const first = ledger.do({
      apply: async () => {
        order.push(1);
      },
      revert: vi.fn(),
    });
    const second = ledger.do({
      apply: async () => {
        order.push(2);
      },
      revert: vi.fn(),
    });

    await Promise.all([first, second]);

    expect(order).toEqual([1, 2]);
    ledger.dispose();
  });

  it('snapshots command callbacks at submission time', async () => {
    const ledger = createLedger();
    const originalApply = vi.fn();
    const replacementApply = vi.fn();
    const command = { apply: originalApply, revert: vi.fn() };

    const operation = ledger.do(command);

    command.apply = replacementApply;

    await operation;
    await ledger.undo();
    await ledger.redo();

    expect(originalApply).toHaveBeenCalledTimes(2);
    expect(replacementApply).not.toHaveBeenCalled();
    ledger.dispose();
  });

  it('rejects rollback failures while preserving undo history', async () => {
    const ledger = createLedger();
    const cause = new Error('rollback failed');

    await ledger.do({
      apply: vi.fn(),
      revert: () => {
        throw cause;
      },
    });

    await expect(ledger.undo()).rejects.toMatchObject({ cause, message: cause.message });
    await expect(ledger.undo()).rejects.toBeInstanceOf(LedgerRollbackError);
    expect(ledger.state.value.undo).toHaveLength(1);
    expect(ledger.state.value.redo).toHaveLength(0);
    ledger.dispose();
  });

  it('rejects execution failures without recording history', async () => {
    const ledger = createLedger();
    const cause = new Error('apply failed');

    await expect(
      ledger.do({
        apply: () => {
          throw cause;
        },
        revert: vi.fn(),
      }),
    ).rejects.toMatchObject({ cause, message: cause.message });

    expect(ledger.state.value.undo).toHaveLength(0);
    ledger.dispose();
  });

  it('does not start queued work after disposal', async () => {
    const ledger = createLedger();
    let release!: () => void;
    const active = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queuedApply = vi.fn();

    const running = ledger.do({ apply: () => active, revert: vi.fn() });
    const queued = ledger.do({ apply: queuedApply, revert: vi.fn() });

    await Promise.resolve();
    expect(ledger.state.value).toMatchObject({ queued: 1, running: 1 });

    ledger.dispose();
    release();

    await expect(running).rejects.toBeInstanceOf(LedgerCancelledError);
    await expect(queued).rejects.toBeInstanceOf(LedgerDisposedError);
    expect(queuedApply).not.toHaveBeenCalled();
    expect(ledger.state.value).toMatchObject({ accepting: false, queued: 0, redo: [], running: 0, undo: [] });
  });

  it('does not start an operation already cancelled before its queue turn', async () => {
    const ledger = createLedger();
    const controller = new AbortController();
    const apply = vi.fn();

    controller.abort();

    await expect(ledger.do({ apply, revert: vi.fn() }, { signal: controller.signal })).rejects.toBeInstanceOf(
      LedgerCancelledError,
    );
    expect(apply).not.toHaveBeenCalled();
    ledger.dispose();
  });

  it('resolves whenIdle after active work settles', async () => {
    const ledger = createLedger();
    let release!: () => void;
    const active = new Promise<void>((resolve) => {
      release = resolve;
    });

    const operation = ledger.do({ apply: () => active, revert: vi.fn() });
    const idle = ledger.whenIdle();

    release();
    await operation;
    await idle;

    expect(ledger.state.value).toMatchObject({ queued: 0, running: 0 });
    ledger.dispose();
  });

  it('rejects operations submitted after disposal', async () => {
    const ledger = createLedger();

    ledger.dispose();

    await expect(ledger.do({ apply: vi.fn(), revert: vi.fn() })).rejects.toBeInstanceOf(LedgerDisposedError);
    await expect(ledger.undo()).rejects.toBeInstanceOf(LedgerDisposedError);
    await expect(ledger.redo()).rejects.toBeInstanceOf(LedgerDisposedError);
    await expect(ledger.clear()).rejects.toBeInstanceOf(LedgerDisposedError);
  });
});

describe('LedgerError', () => {
  it('identifies every Ledger error subtype', () => {
    expect(LedgerError.is(new LedgerCancelledError('cancelled'))).toBe(true);
    expect(LedgerError.is(new LedgerDisposedError('disposed'))).toBe(true);
    expect(LedgerError.is(new LedgerExecutionError('execution'))).toBe(true);
    expect(LedgerError.is(new LedgerRollbackError('rollback'))).toBe(true);
    expect(LedgerError.is(new Error('plain'))).toBe(false);
  });
});
