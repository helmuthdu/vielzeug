import { describe, expect, it, vi } from 'vitest';
import { createPoolCore, type PoolSlot } from '../_pool-core.js';
import { FamiliarTerminatedError } from '../errors.js';

type TestSlot = PoolSlot & { id: string };

const makeSlots = (count: number): TestSlot[] =>
  Array.from({ length: count }, (_, id) => ({ id: `slot-${id}`, terminate: vi.fn() }));

const options = { defaultTimeout: undefined, maxQueue: undefined, onFull: 'wait' } as const;

describe('createPoolCore', () => {
  it('returns the slot to the free pool when the acquire callback throws synchronously', async () => {
    const slots = makeSlots(1);
    const core = createPoolCore(slots, options);

    await expect(
      core.acquire({ priority: 0 }, () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // Without the release-on-throw path the slot would be stranded and idle never settle.
    await expect(core.drain({ timeout: 100 })).resolves.toBeUndefined();
  });

  it('returns a handed-off slot when a queued acquire callback throws synchronously', async () => {
    const slots = makeSlots(1);
    const core = createPoolCore(slots, options);

    const held = core.acquire({ priority: 0 }, (slot) => ({ release: () => core.release(slot), slot }));
    const first = await held;

    const queued = core.acquire({ priority: 0 }, () => {
      throw new Error('queued boom');
    });

    first.release();

    await expect(queued).rejects.toThrow('queued boom');
    await expect(core.drain({ timeout: 100 })).resolves.toBeUndefined();
  });

  it('rejects waiters with FamiliarTerminatedError on dispose', async () => {
    const slots = makeSlots(1);
    const core = createPoolCore(slots, options);

    await core.acquire({ priority: 0 }, (slot) => {
      core.release(slot);

      return undefined;
    });

    const first = core.acquire({ priority: 0 }, (slot) => ({ release: () => core.release(slot), slot }));
    await first;
    const queued = core.acquire({ priority: 0 }, () => 'never');

    const settled = queued.catch((error: unknown) => error);
    core.dispose();

    await expect(settled).resolves.toBeInstanceOf(FamiliarTerminatedError);
  });

  it('serves waiters in priority then FIFO order', async () => {
    const slots = makeSlots(1);
    const core = createPoolCore(slots, options);
    const order: string[] = [];

    const held = await core.acquire({ priority: 0 }, (slot) => ({ release: () => core.release(slot), slot }));

    const low = core.acquire({ priority: 0 }, (slot) => {
      order.push('low');
      core.release(slot);
    });
    const high = core.acquire({ priority: 5 }, (slot) => {
      order.push('high');
      core.release(slot);
    });

    held.release();
    await Promise.all([low, high]);

    expect(order).toEqual(['high', 'low']);
  });
});
