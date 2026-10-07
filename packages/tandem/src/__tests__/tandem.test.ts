import { afterEach, describe, expect, it, vi } from 'vitest';
import { TandemDisposedError } from '../errors';
import type { SyncDeletion, SyncEnvelope, SyncGateway, SyncHandle, SyncPort, SyncState, TandemEvent } from '../index';
import { createSync } from '../index';

interface TestRecord {
  id: string;
  rev: number;
  value: number;
}

interface PushCall {
  deletions: SyncDeletion[];
  keepalive?: boolean;
  records: SyncEnvelope<TestRecord>[];
}

interface RemoteState {
  cursor?: string | null;
  deletions?: SyncDeletion[];
  records?: SyncEnvelope<TestRecord>[];
}

/** A SyncPort double: records pushes/pulls, can delay, reject, and change remote state. */
function createPort(remote: RemoteState = {}) {
  const pushes: PushCall[] = [];
  const pulls: (string | null)[] = [];
  let delayMs = 0;
  let inFlight = 0;
  let overlapped = false;
  let rejectNext = false;
  const port: SyncPort<TestRecord> = {
    async pull(since) {
      pulls.push(since);
      return {
        cursor: remote.cursor ?? null,
        deletions: remote.deletions ?? [],
        records: remote.records ?? [],
      };
    },
    async push(records, deletions, options) {
      if (inFlight) overlapped = true;
      inFlight += 1;
      try {
        if (rejectNext) {
          rejectNext = false;
          throw new Error('conflict: the server is ahead');
        }
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        pushes.push({ deletions: [...deletions], keepalive: options?.keepalive, records: [...records] });
      } finally {
        inFlight -= 1;
      }
    },
  };
  return {
    delay: (ms: number) => {
      delayMs = ms;
    },
    overlapped: () => overlapped,
    port,
    pulls,
    pushes,
    rejectNextPush: () => {
      rejectNext = true;
    },
    setRemote: (next: RemoteState) => Object.assign(remote, next),
  };
}

/** An in-memory SyncGateway double over a record list, a tombstone list, and a state row.
 *  The engine owns the rev comparisons, so applyRecords is a pure upsert. */
function createGateway(initial: TestRecord[] = []) {
  let records = [...initial];
  let tombstones: SyncDeletion[] = [];
  let stored: SyncState | null = null;
  const applied: SyncEnvelope<TestRecord>[] = [];
  let refused: string[] = [];
  const gateway: SyncGateway<TestRecord> = {
    async applyDeletions(deletions) {
      for (const { id } of deletions) records = records.filter((record) => record.id !== id);
    },
    async applyRecords(pulled) {
      applied.push(...pulled);
      const skipped: string[] = [];

      for (const { record } of pulled) {
        if (refused.includes(record.id)) {
          skipped.push(record.id);

          continue;
        }
        records = records.some((candidate) => candidate.id === record.id)
          ? records.map((candidate) => (candidate.id === record.id ? record : candidate))
          : [...records, record];
      }
      return skipped;
    },
    async clearDeletions(deletions) {
      const gone = new Set(deletions.map((deletion) => `${deletion.entity}:${deletion.id}`));
      tombstones = tombstones.filter((tombstone) => !gone.has(`${tombstone.entity}:${tombstone.id}`));
    },
    async loadState() {
      return stored;
    },
    async pendingDeletions() {
      return [...tombstones];
    },
    records: () => records.map((record) => ({ entity: 'docs', record })),
    async saveState(next) {
      stored = structuredClone(next);
    },
  };
  return {
    applied,
    edit(id: string, mutate: (record: TestRecord) => TestRecord): void {
      records = records.map((record) => (record.id === id ? { ...mutate(record), rev: record.rev + 1 } : record));
    },
    gateway,
    /** Makes applyRecords report these ids as failing validation. */
    refuse(...ids: string[]): void {
      refused = ids;
    },
    remove(id: string): void {
      records = records.filter((record) => record.id !== id);
      tombstones.push({ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'docs', id });
    },
    /** The last state the engine persisted, exactly as the gateway stored it. */
    get storedState(): SyncState | null {
      return stored;
    },
    get values(): TestRecord[] {
      return records;
    },
    /** Replaces a record verbatim: no rev bump, as a cross-device write would. */
    write(record: TestRecord): void {
      records = records.map((candidate) => (candidate.id === record.id ? record : candidate));
    },
  };
}

let handle: SyncHandle | undefined;

afterEach(() => {
  handle?.dispose();
  handle = undefined;
  vi.restoreAllMocks();
});

describe('push', () => {
  it('batches a burst of changes into one push', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1)); // startup: the seed record pushes
    pushes.length = 0;

    for (let tap = 0; tap < 3; tap += 1) {
      device.edit('a', (record) => ({ ...record, value: record.value + 1 }));
      handle.changed();
    }

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    const pushed = pushes[0]!.records.find((entry) => entry.record.id === 'a')!;
    expect(pushed.record.value).toBe(3);
  });

  it('does not push records whose rev did not change', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    // A write that carries no new rev: changed() fires, nothing is dirty.
    device.write({ id: 'a', rev: 0, value: 5 });
    handle.changed();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(pushes).toHaveLength(0);
  });

  it('never runs two pushes at once', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { delay, overlapped, port, pushes } = createPort();
    delay(20);
    handle = createSync({ gateway: device.gateway, idleDelayMs: 10, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    device.edit('a', (record) => ({ ...record, value: 1 }));
    handle.changed(); // schedules a debounced flush
    void handle.flush(); // …racing a manual one
    await handle.flush();

    expect(overlapped()).toBe(false);
  });

  it('flushes when the tab hides instead of waiting for the debounce', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    device.edit('a', (record) => ({ ...record, value: 1 }));
    handle.changed();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(pushes[0]!.keepalive).toBe(true);
  });

  it('pushes with keepalive when the page is hiding', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    device.edit('a', (record) => ({ ...record, value: 1 }));
    handle.changed();

    window.dispatchEvent(new Event('pagehide'));

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(pushes[0]!.keepalive).toBe(true);
  });

  it('accepts a gateway whose records() reads storage asynchronously', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    const asyncGateway: SyncGateway<TestRecord> = {
      ...device.gateway,
      records: async () => device.values.map((record) => ({ entity: 'docs', record })),
    };
    handle = createSync({ gateway: asyncGateway, idleDelayMs: 30, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));

    const pushed = pushes[0]!.records.find((entry) => entry.record.id === 'a')!;

    expect(pushed.record.value).toBe(0);
  });

  it('pushes deletions as tombstones and clears them once acked', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    device.remove('a');
    handle.changed();

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(pushes[0]!.deletions).toEqual([{ deletedAt: expect.any(String), entity: 'docs', id: 'a' }]);

    // The tombstone was cleared with the ack: a manual flush finds nothing to send.
    await handle.flush();
    expect(pushes).toHaveLength(1);
  });
});

describe('pull', () => {
  it('applies remote records the server is ahead on', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const ahead: SyncEnvelope<TestRecord> = { entity: 'docs', record: { id: 'a', rev: 999, value: 12 } };
    const { port, pushes } = createPort({ records: [ahead] });
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });

    await vi.waitFor(() => expect(device.values.find((record) => record.id === 'a')?.value).toBe(12));
    // The pulled rev becomes the baseline: nothing is dirty, nothing pushes.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(pushes).toHaveLength(0);
  });

  it('keeps local records that are ahead of the server and pushes them', async () => {
    const device = createGateway([{ id: 'a', rev: 1, value: 7 }]);
    const serverCopy: SyncEnvelope<TestRecord> = { entity: 'docs', record: { id: 'a', rev: 0, value: 0 } };
    const { port, pushes } = createPort({ records: [serverCopy] });
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(device.values.find((record) => record.id === 'a')?.value).toBe(7); // local state kept
    expect(device.applied).toHaveLength(0); // the engine filtered the stale copy out
    const pushed = pushes[0]!.records.find((entry) => entry.record.id === 'a')!;
    expect(pushed.record.rev).toBe(1);
  });

  it('applies remote deletions for records without unpushed changes', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes, setRemote } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    setRemote({ deletions: [{ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'docs', id: 'a' }] });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(device.values.find((record) => record.id === 'a')).toBeUndefined());
  });

  it('keeps a record with unpushed changes over a remote deletion', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pulls, pushes, setRemote } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port }); // debounce never fires
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    device.edit('a', (record) => ({ ...record, value: 1 })); // dirty, never pushed
    handle.changed();
    setRemote({ deletions: [{ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'docs', id: 'a' }] });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(pulls.length).toBeGreaterThanOrEqual(2));

    expect(device.values.find((record) => record.id === 'a')).toBeDefined(); // the edit beat the deletion
    await handle.flush(); // and the change still reaches the server
    const pushed = pushes.at(-1)!.records.find((entry) => entry.record.id === 'a')!;
    expect(pushed.record.value).toBe(1);
  });

  it('drops a pulled record whose deletion arrived in the same pull', async () => {
    const device = createGateway();
    const { port, pushes } = createPort({
      deletions: [{ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'docs', id: 'a' }],
      records: [{ entity: 'docs', record: { id: 'a', rev: 5, value: 1 } }],
    });
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(device.values).toHaveLength(0); // the tombstone superseded its record
    expect(device.applied).toHaveLength(0);
    expect(pushes).toHaveLength(0); // nothing resurrected, nothing to push
  });

  it('does not resurrect a locally deleted record from a full pull', async () => {
    const seed: SyncEnvelope<TestRecord> = { entity: 'docs', record: { id: 'a', rev: 1, value: 0 } };
    const device = createGateway([{ id: 'a', rev: 1, value: 0 }]);
    const { port, pulls } = createPort({ records: [seed] }); // a backend with no cursor: every pull is full
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await new Promise((resolve) => setTimeout(resolve, 100)); // boot: full pull, nothing new

    device.remove('a'); // tombstone recorded, not yet pushed
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(pulls.length).toBeGreaterThanOrEqual(2));

    expect(device.values.find((record) => record.id === 'a')).toBeUndefined(); // the tombstone held
  });

  it('reports records the gateway refused as invalid and does not apply them', async () => {
    const device = createGateway();
    device.refuse('bad');
    const { port } = createPort({
      records: [
        { entity: 'docs', record: { id: 'good', rev: 1, value: 1 } },
        { entity: 'docs', record: { id: 'bad', rev: 1, value: 2 } },
      ],
    });
    const events: TandemEvent[] = [];
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    handle.tap((event) => events.push(event));

    await vi.waitFor(() => expect(device.values.map((record) => record.id)).toEqual(['good']));

    const invalid = events.find((event) => event.type === 'invalid');

    expect(invalid).toMatchObject({ skipped: ['bad'], type: 'invalid' });
  });

  it('prunes the baseline for a record a remote deletion removed', async () => {
    const device = createGateway([{ id: 'a', rev: 3, value: 0 }]);
    const { port, setRemote } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(device.storedState?.revs['docs:a']).toBe(3)); // pushed baseline

    setRemote({ deletions: [{ entity: 'docs', id: 'a' }] });
    await handle.flush();

    expect(device.values).toHaveLength(0);
    expect(device.storedState?.revs['docs:a']).toBeUndefined(); // no orphan baseline entry
  });
});

describe('flush', () => {
  it('runs a full cycle: pull, then push', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes, setRemote } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    const remote: SyncEnvelope<TestRecord> = { entity: 'docs', record: { id: 'b', rev: 2, value: 9 } };
    setRemote({ records: [remote] });
    device.edit('a', (record) => ({ ...record, value: 1 }));

    await handle.flush();

    expect(device.values.find((record) => record.id === 'b')?.value).toBe(9); // pulled
    expect(pushes.at(-1)!.records.map((entry) => entry.record.id)).toContain('a'); // and pushed
  });
});

describe('failure handling', () => {
  it('warns and pulls to reconcile after a rejected push', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pulls, pushes, rejectNextPush } = createPort();
    const events: TandemEvent[] = [];
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    handle.tap((event) => events.push(event));
    await vi.waitFor(() => expect(pushes).toHaveLength(1)); // startup push ok
    pushes.length = 0;

    rejectNextPush();
    device.edit('a', (record) => ({ ...record, value: 1 }));
    handle.changed();

    await vi.waitFor(() => expect(pulls.length).toBeGreaterThanOrEqual(2)); // reconciled
    expect(events.some((event) => event.type === 'warning' && event.message === 'conflict: the server is ahead')).toBe(
      true,
    );
    // The cause travels through tap, not just its stringified message.
    expect(events.some((event) => event.type === 'warning' && event.error instanceof Error)).toBe(true);
    await handle.flush(); // the retry lands
    const pushed = pushes.at(-1)!.records.find((entry) => entry.record.id === 'a')!;
    expect(pushed.record.value).toBe(1);
  });

  it('rejects flush when the cycle fails, after reconciling', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pulls, pushes, rejectNextPush } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    rejectNextPush();
    device.edit('a', (record) => ({ ...record, value: 1 }));
    await expect(handle.flush()).rejects.toThrow('conflict: the server is ahead');
    expect(pulls.length).toBeGreaterThanOrEqual(3); // flush pulled, then reconciled

    await handle.flush(); // the retry lands: dirty records survived the failure
    const pushed = pushes.at(-1)!.records.find((entry) => entry.record.id === 'a')!;
    expect(pushed.record.value).toBe(1);
  });
});

describe('persistence', () => {
  it('keeps the sync baseline across restarts', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const first = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port: first.port });
    await vi.waitFor(() => expect(first.pushes).toHaveLength(1));
    handle.dispose();
    handle = undefined;

    const second = createPort(); // pull returns nothing new
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port: second.port });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(second.pushes).toHaveLength(0); // nothing dirty: the baseline survived
  });

  it('carries the pull cursor into the next pull', async () => {
    const device = createGateway();
    const { port, pulls, setRemote } = createPort({ cursor: 'c1' });
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(pulls[0]).toBeNull()); // boot pulls from the start

    setRemote({ cursor: 'c2' });
    await handle.flush();

    expect(pulls.at(-1)).toBe('c1'); // the cursor the last pull returned
    expect(device.storedState?.cursor).toBe('c2');
  });

  it('never hands the gateway a state object it can alias', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port } = createPort();
    const saved: SyncState[] = [];
    const original = device.gateway.saveState.bind(device.gateway);
    const spy = vi.spyOn(device.gateway, 'saveState').mockImplementation(async (next) => {
      saved.push(next);
      await original(next);
    });
    handle = createSync({ gateway: device.gateway, idleDelayMs: 60_000, port });
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());

    const first = saved[0]!;
    const firstBaseline = first.revs['docs:a'];

    device.edit('a', (record) => ({ ...record, value: 1 }));
    await handle.flush();

    expect(first.revs['docs:a']).toBe(firstBaseline); // the earlier object was never mutated in place
    expect(saved.at(-1)!.revs['docs:a']).toBe(1); // and the fresh baseline did reach the gateway
  });
});

describe('lifecycle', () => {
  it('reports dispose through tap before detaching tappers', async () => {
    const device = createGateway();
    const { port } = createPort();
    const events: TandemEvent[] = [];
    handle = createSync({ gateway: device.gateway, port });
    handle.tap((event) => events.push(event));
    handle.dispose();

    expect(events.at(-1)).toEqual({ type: 'dispose' });
    expect(handle.disposed).toBe(true);
    expect(handle.disposalSignal.aborted).toBe(true);
  });

  it('swallows tap handler errors without affecting sync', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 30, port });
    handle.tap(() => {
      throw new Error('observer blew up');
    });

    await vi.waitFor(() => expect(pushes).toHaveLength(1)); // sync unaffected
  });

  it('detaches a tapper when its signal aborts', async () => {
    const device = createGateway();
    const { port } = createPort();
    const controller = new AbortController();
    const events: TandemEvent[] = [];
    handle = createSync({ gateway: device.gateway, port });
    handle.tap((event) => events.push(event), { signal: controller.signal });
    controller.abort();
    handle.dispose();

    expect(events).toHaveLength(0); // detached before the dispose event fired
  });

  it('returns a no-op unsubscribe when tapping after dispose', async () => {
    const device = createGateway();
    const { port } = createPort();
    handle = createSync({ gateway: device.gateway, port });
    handle.dispose();

    const unsubscribe = handle.tap(() => {
      throw new Error('must never run');
    });

    expect(() => unsubscribe()).not.toThrow();
  });

  it('throws from changed() after dispose', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, idleDelayMs: 10, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    handle.dispose();
    device.edit('a', (record) => ({ ...record, value: 1 }));
    expect(() => handle.changed()).toThrow(TandemDisposedError);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pushes).toHaveLength(0);
  });

  it('rejects flush after dispose', async () => {
    const device = createGateway([{ id: 'a', rev: 0, value: 0 }]);
    const { port, pushes } = createPort();
    handle = createSync({ gateway: device.gateway, port });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    handle.dispose();
    device.edit('a', (record) => ({ ...record, value: 1 }));
    await expect(handle.flush()).rejects.toThrow(TandemDisposedError);
    expect(pushes).toHaveLength(0);
  });

  it('disposes through Symbol.dispose', async () => {
    const device = createGateway();
    const { port } = createPort();
    const sync = createSync({ gateway: device.gateway, port });
    {
      using scoped = sync;
      expect(scoped.disposed).toBe(false);
    }
    expect(sync.disposed).toBe(true);
  });
});
