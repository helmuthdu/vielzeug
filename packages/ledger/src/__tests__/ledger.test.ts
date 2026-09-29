import { describe, expect, it, vi } from 'vitest';

import {
  createLedger,
  LedgerCancelledError,
  LedgerConfigError,
  LedgerDisposedError,
  LedgerError,
  LedgerExecutionError,
  LedgerRollbackError,
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
    expect(ledger.state.getSnapshot().undo).toHaveLength(1);
    expect(ledger.state.getSnapshot().redo).toHaveLength(0);
    ledger.dispose();
  });

  it('publishes immutable history metadata newest first', async () => {
    const ledger = createLedger<{ id: string }>();

    await ledger.do({ apply: vi.fn(), label: 'first', meta: { id: '1' }, revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'second', meta: { id: '2' }, revert: vi.fn() });

    expect(ledger.state.getSnapshot().undo.map((entry) => entry.label)).toEqual(['first', 'second']);
    expect(ledger.state.getSnapshot().undo.at(-1)?.meta).toEqual({ id: '2' });
    expect(Object.isFrozen(ledger.state.getSnapshot())).toBe(true);
    expect(Object.isFrozen(ledger.state.getSnapshot().undo)).toBe(true);
    expect(Object.isFrozen(ledger.state.getSnapshot().undo[0]!)).toBe(true);
    ledger.dispose();
  });

  it('evicts oldest history entries at maxHistory', async () => {
    const ledger = createLedger({ maxHistory: 2 });

    await ledger.do({ apply: vi.fn(), label: 'first', revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'second', revert: vi.fn() });
    await ledger.do({ apply: vi.fn(), label: 'third', revert: vi.fn() });

    expect(ledger.state.getSnapshot().undo.map((entry) => entry.label)).toEqual(['second', 'third']);
    ledger.dispose();
  });

  it('does not retain history when maxHistory is zero', async () => {
    const apply = vi.fn();
    const ledger = createLedger({ maxHistory: 0 });

    await ledger.do({ apply, revert: vi.fn() });

    expect(apply).toHaveBeenCalledOnce();
    expect(ledger.state.getSnapshot().undo).toHaveLength(0);
    ledger.dispose();
  });

  it.each([-1, 1.5, Infinity, NaN])('rejects invalid maxHistory: %s', (maxHistory) => {
    expect(() => createLedger({ maxHistory })).toThrow(LedgerConfigError);
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
    expect(ledger.state.getSnapshot().undo).toHaveLength(1);
    expect(ledger.state.getSnapshot().redo).toHaveLength(0);
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

    expect(ledger.state.getSnapshot().undo).toHaveLength(0);
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
    expect(ledger.state.getSnapshot()).toMatchObject({ queued: 1, running: 1 });

    ledger.dispose();
    release();

    await expect(running).rejects.toBeInstanceOf(LedgerCancelledError);
    await expect(queued).rejects.toBeInstanceOf(LedgerDisposedError);
    expect(queuedApply).not.toHaveBeenCalled();
    expect(ledger.state.getSnapshot()).toMatchObject({ queued: 0, redo: [], running: 0, undo: [] });
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

    expect(ledger.state.getSnapshot()).toMatchObject({ queued: 0, running: 0 });
    ledger.dispose();
  });

  it('rejects whenIdle when disposal happens while waiting', async () => {
    const ledger = createLedger();
    let release!: () => void;
    const active = new Promise<void>((resolve) => {
      release = resolve;
    });

    const operation = ledger.do({ apply: () => active, revert: vi.fn() });
    const idle = ledger.whenIdle();

    ledger.dispose();
    release();

    await expect(idle).rejects.toBeInstanceOf(LedgerDisposedError);
    await expect(operation).rejects.toBeInstanceOf(LedgerDisposedError);
  });

  it('clear() is a no-op when history is already empty', async () => {
    const ledger = createLedger();
    const listener = vi.fn();
    const unsubscribe = ledger.state.subscribe(listener);

    await expect(ledger.clear()).resolves.toBeUndefined();
    expect(listener).not.toHaveBeenCalled();

    await ledger.do({ apply: vi.fn(), revert: vi.fn() });
    await expect(ledger.clear()).resolves.toBeUndefined();
    expect(ledger.state.getSnapshot().undo).toHaveLength(0);

    unsubscribe();
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

  it('subscribes without an immediate notification and stops after unsubscribe', async () => {
    const ledger = createLedger();
    const listener = vi.fn();
    const unsubscribe = ledger.state.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();

    await ledger.do({ apply: vi.fn(), revert: vi.fn() });
    expect(listener).toHaveBeenCalled();

    const calls = listener.mock.calls.length;
    unsubscribe();
    await ledger.clear();

    expect(listener).toHaveBeenCalledTimes(calls);
    ledger.dispose();
  });

  it('isolates subscriber failures from operation bookkeeping', async () => {
    const reports: VoidFunction[] = [];
    const reportSpy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => reports.push(callback));
    const ledger = createLedger();
    const followingSubscriber = vi.fn();
    const apply = vi.fn();

    ledger.state.subscribe(() => {
      throw new Error('subscriber failed');
    });
    ledger.state.subscribe(followingSubscriber);

    await expect(ledger.do({ apply, revert: vi.fn() })).resolves.toBeUndefined();
    await expect(ledger.whenIdle()).resolves.toBeUndefined();

    expect(apply).toHaveBeenCalledOnce();
    expect(followingSubscriber).toHaveBeenCalled();
    expect(reports.length).toBeGreaterThan(0);
    expect(ledger.state.getSnapshot()).toMatchObject({ queued: 0, running: 0 });
    expect(ledger.state.getSnapshot().undo).toHaveLength(1);
    expect(() => ledger.dispose()).not.toThrow();
    reportSpy.mockRestore();
  });

  it('does not notify subscribers added during the current state publication', async () => {
    const ledger = createLedger();
    const lateSubscriber = vi.fn();
    let subscribed = false;

    ledger.state.subscribe(() => {
      if (subscribed) return;
      subscribed = true;
      ledger.state.subscribe(lateSubscriber);
    });

    const operation = ledger.do({ apply: vi.fn(), revert: vi.fn() });

    expect(lateSubscriber).not.toHaveBeenCalled();
    await operation;
    expect(lateSubscriber).toHaveBeenCalled();
    ledger.dispose();
  });
});

describe('record', () => {
  it('appends already-executed work for undo without invoking apply', async () => {
    const ledger = createLedger();
    const apply = vi.fn();
    let value = 0;

    value = 1;
    ledger.record({
      apply,
      label: 'external',
      revert: () => {
        value = 0;
      },
    });
    expect(apply).not.toHaveBeenCalled();

    await ledger.undo();

    expect(value).toBe(0);
    expect(ledger.state.getSnapshot().undo).toHaveLength(0);
    ledger.dispose();
  });

  it('re-applies through the recorded apply on redo', async () => {
    const ledger = createLedger();
    let value = 0;

    value = 1;
    ledger.record({
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
    expect(ledger.state.getSnapshot().undo.map((entry) => entry.label)).toEqual([undefined]);
    ledger.dispose();
  });

  it('clears the redo stack like do()', async () => {
    const ledger = createLedger();

    ledger.record({
      apply: vi.fn(),
      label: 'first',
      revert: vi.fn(),
    });
    await ledger.undo();
    ledger.record({
      apply: vi.fn(),
      label: 'second',
      revert: vi.fn(),
    });

    expect(ledger.state.getSnapshot().redo).toHaveLength(0);
    expect(ledger.state.getSnapshot().undo.map((entry) => entry.label)).toEqual(['second']);
    ledger.dispose();
  });

  it('evicts oldest entries at maxHistory', () => {
    const ledger = createLedger({ maxHistory: 1 });

    ledger.record({ apply: vi.fn(), label: 'first', revert: vi.fn() });
    ledger.record({ apply: vi.fn(), label: 'second', revert: vi.fn() });

    expect(ledger.state.getSnapshot().undo.map((entry) => entry.label)).toEqual(['second']);
    ledger.dispose();
  });

  it('throws on a disposed ledger without touching history', () => {
    const ledger = createLedger();
    ledger.dispose();

    expect(() => ledger.record({ apply: vi.fn(), revert: vi.fn() })).toThrow(LedgerDisposedError);
    expect(ledger.state.getSnapshot().undo).toHaveLength(0);
  });
});

describe('LedgerError', () => {
  it('identifies every Ledger error subtype', () => {
    expect(new LedgerCancelledError('cancelled') instanceof LedgerError).toBe(true);
    expect(new LedgerDisposedError('disposed') instanceof LedgerError).toBe(true);
    expect(new LedgerExecutionError('execution') instanceof LedgerError).toBe(true);
    expect(new LedgerRollbackError('rollback') instanceof LedgerError).toBe(true);
    expect(new Error('plain') instanceof LedgerError).toBe(false);
  });
});
