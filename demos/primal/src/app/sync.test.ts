// @vitest-environment jsdom: the scheduler listens to visibilitychange and pagehide.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, SubjectRef } from '../domain/types';
import type { PrimalStore } from './database';
import { campaignById, removeSubject, runCommand } from './store';
import { type SyncDeletion, type SyncPort, type SyncRecord, startSync } from './sync';
import { flush, openTestStore, putCampaign } from './test-harness';

const SEED: SubjectRef = { id: 'campaign-seed', kind: 'campaign' };

interface PushCall {
  deletions: SyncDeletion[];
  keepalive?: boolean;
  records: readonly SyncRecord[];
}

interface RemoteState {
  cursor?: string | null;
  deletions?: SyncDeletion[];
  records?: SyncRecord[];
}

/** A SyncPort double: records pushes/pulls, can delay, reject, and change remote state. */
const createPort = (remote: RemoteState = {}) => {
  const pushes: PushCall[] = [];
  const pulls: (string | null)[] = [];
  const warnings: string[] = [];
  let delayMs = 0;
  let inFlight = 0;
  let overlapped = false;
  let rejectNext = false;
  const port: SyncPort = {
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
        // The engine hands over opaque envelopes; the test only ever pushes primal records.
        pushes.push({
          deletions: [...deletions],
          keepalive: options?.keepalive,
          records: records as readonly SyncRecord[],
        });
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
    warnings,
  };
};

let vault: PrimalStore;
let handle: ReturnType<typeof startSync> | undefined;

beforeEach(async () => {
  vault = await openTestStore();
  await flush();
});

afterEach(() => {
  handle?.dispose();
  handle = undefined;
  vi.restoreAllMocks();
});

describe('startSync push', () => {
  it('batches a burst of commands into one push', async () => {
    const { port, pushes } = createPort();
    handle = startSync(port, { idleDelayMs: 30 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1)); // startup: the seed pushes
    pushes.length = 0;

    runCommand('adjustMonsterCounter', SEED, 'damage', 1);
    runCommand('adjustMonsterCounter', SEED, 'damage', 1);
    runCommand('adjustMonsterCounter', SEED, 'damage', 1);

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    const pushed = pushes[0]!.records.find((entry) => entry.entity === 'campaigns')!;
    expect(pushed.record.monsterState.damage).toBe(3);
  });

  it('does not push records whose rev did not change', async () => {
    const { port, pushes } = createPort();
    handle = startSync(port, { idleDelayMs: 30 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    // A cross-tab write that carries no new rev: the observer fires, nothing is dirty.
    await putCampaign(vault, campaignById('campaign-seed')!);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(pushes).toHaveLength(0);
  });

  it('never runs two pushes at once', async () => {
    const { delay, overlapped, port, pushes } = createPort();
    delay(20);
    handle = startSync(port, { idleDelayMs: 10 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    runCommand('adjustMonsterCounter', SEED, 'damage', 1); // schedules a debounced flush
    void handle!.flush(); // …racing a manual one
    await handle!.flush();

    expect(overlapped()).toBe(false);
  });

  it('flushes when the tab hides instead of waiting for the debounce', async () => {
    const { port, pushes } = createPort();
    handle = startSync(port, { idleDelayMs: 60_000 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    runCommand('adjustMonsterCounter', SEED, 'damage', 1);
    await flush(); // let the vault round-trip schedule the (never-firing) debounce

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(pushes[0]!.keepalive).toBe(true);
  });

  it('pushes deletions as tombstones and clears them once acked', async () => {
    const { port, pushes } = createPort();
    handle = startSync(port, { idleDelayMs: 30 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    removeSubject(SEED);

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(pushes[0]!.deletions).toEqual([{ deletedAt: expect.any(String), entity: 'campaigns', id: 'campaign-seed' }]);

    // The tombstone was cleared with the ack: a manual flush finds nothing to send.
    await handle.flush();
    expect(pushes).toHaveLength(1);
    expect(campaignById('campaign-seed')).toBeUndefined();
  });
});

describe('startSync pull', () => {
  it('applies remote records the server is ahead on', async () => {
    const ahead = { ...campaignById('campaign-seed')!, rev: 999, totalDefeats: 12 } as Campaign;
    const { port, pushes } = createPort({ records: [{ entity: 'campaigns', record: ahead }] });
    handle = startSync(port, { idleDelayMs: 30 });

    await flush(); // observers carry the applied record into memory

    expect(campaignById('campaign-seed')?.totalDefeats).toBe(12);
    // The pulled rev is the baseline: nothing is dirty, nothing pushes.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(pushes).toHaveLength(0);
  });

  it('keeps local records that are ahead of the server and pushes them', async () => {
    const serverCopy = { ...campaignById('campaign-seed')!, rev: 0 } as Campaign;
    runCommand('adjustMonsterCounter', SEED, 'damage', 1); // local rev 1, damage 1
    await flush();

    const { port, pushes } = createPort({ records: [{ entity: 'campaigns', record: serverCopy }] });
    handle = startSync(port, { idleDelayMs: 30 });

    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    expect(campaignById('campaign-seed')?.monsterState.damage).toBe(1); // local state kept
    const pushed = pushes[0]!.records.find((entry) => entry.entity === 'campaigns')!;
    expect(pushed.record.rev).toBe(1);
  });

  it('applies remote deletions only for records without unpushed changes', async () => {
    const { port, pushes, setRemote } = createPort();
    handle = startSync(port, { idleDelayMs: 30 });
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    // Clean local record: the deletion applies.
    setRemote({ deletions: [{ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'campaigns', id: 'campaign-seed' }] });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();

    expect(campaignById('campaign-seed')).toBeUndefined();
  });

  it('keeps a record with unpushed changes over a remote deletion', async () => {
    const { port, pushes, setRemote } = createPort();
    handle = startSync(port, { idleDelayMs: 60_000 }); // debounce never fires
    await vi.waitFor(() => expect(pushes).toHaveLength(1));
    pushes.length = 0;

    runCommand('adjustMonsterCounter', SEED, 'damage', 1); // dirty, never pushed
    await flush();
    setRemote({ deletions: [{ deletedAt: '2026-01-01T00:00:00.000Z', entity: 'campaigns', id: 'campaign-seed' }] });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();

    expect(campaignById('campaign-seed')).toBeDefined(); // the edit beat the deletion
    await handle.flush(); // and the change still reaches the server
    const pushed = pushes.at(-1)!.records.find((entry) => entry.entity === 'campaigns')!;
    expect(pushed.record.monsterState.damage).toBe(1);
  });
});

describe('startSync failure handling', () => {
  it('warns and pulls to reconcile after a rejected push', async () => {
    const { port, pulls, pushes, rejectNextPush } = createPort();
    const warnings: string[] = [];
    handle = startSync(port, {
      idleDelayMs: 30,
      onWarning: (message) => warnings.push(message),
    });
    await vi.waitFor(() => expect(pushes).toHaveLength(1)); // startup push ok
    pushes.length = 0;

    rejectNextPush();
    runCommand('adjustMonsterCounter', SEED, 'damage', 1);

    await vi.waitFor(() => expect(pulls.length).toBeGreaterThanOrEqual(2)); // reconciled
    expect(warnings).toContain('conflict: the server is ahead');
    await handle.flush(); // the retry lands
    const pushed = pushes.at(-1)!.records.find((entry) => entry.entity === 'campaigns')!;
    expect(pushed.record.monsterState.damage).toBe(1);
  });
});

describe('startSync persistence', () => {
  it('keeps the sync baseline across restarts', async () => {
    const first = createPort();
    handle = startSync(first.port, { idleDelayMs: 30 });
    await vi.waitFor(() => expect(first.pushes).toHaveLength(1));
    handle.dispose();
    handle = undefined;

    const second = createPort(); // pull returns nothing new
    handle = startSync(second.port, { idleDelayMs: 30 });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(second.pushes).toHaveLength(0); // nothing dirty: the baseline survived
  });
});
