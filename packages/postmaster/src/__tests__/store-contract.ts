import {
  claimJob,
  completeJob,
  deadLetterJob,
  enqueueJob,
  releaseJob,
  removeJob,
  renewLeaseJob,
  rescheduleJob,
  retryJob,
  toEntry,
} from '../store-ops.ts';
import type { PostmasterStore, StoredJob, StoreTx } from '../types.ts';

const entry = (overrides: Partial<StoredJob> & { id: string }): StoredJob => ({
  attempts: 0,
  availableAt: 0,
  createdAt: 0,
  key: overrides.id,
  name: 'send',
  payload: { id: overrides.id },
  status: 'queued',
  updatedAt: 0,
  version: 1,
  ...overrides,
});

export interface StoreFactory {
  create(): Promise<PostmasterStore>;
}

/**
 * Reusable behavioral suite for every PostmasterStore implementation.
 * Exercises the transact-based store primitives through the processor-side
 * store-ops functions, covering FIFO claims, atomic ownership, lease renewal,
 * expired-lease recovery, rescheduling, dead-letter transitions, retry/remove
 * results, stats, observation, and disposal.
 */
export function describePostmasterStore(label: string, factory: StoreFactory): void {
  describe(label, () => {
    let store: PostmasterStore;

    beforeEach(async () => {
      store = await factory.create();
    });

    afterEach(async () => {
      await store.dispose();
    });

    const tx = <T>(fn: (tx: StoreTx) => Promise<T>): Promise<T> => store.transact(fn);

    it('enqueues and lists jobs ordered by createdAt', async () => {
      await tx((t) => enqueueJob(t, entry({ createdAt: 20, id: 'b', updatedAt: 20 })));
      await tx((t) => enqueueJob(t, entry({ createdAt: 10, id: 'a', updatedAt: 10 })));

      await expect(store.list()).resolves.toMatchObject([{ id: 'a' }, { id: 'b' }]);
    });

    it('filters list by status', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'a', status: 'queued' })));
      await tx((t) => enqueueJob(t, entry({ id: 'b', status: 'dead-letter' })));

      await expect(store.list({ status: 'dead-letter' })).resolves.toMatchObject([{ id: 'b' }]);
    });

    it('rejects duplicate ids on enqueue', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'a' })));
      await expect(tx((t) => enqueueJob(t, entry({ id: 'a' })))).rejects.toThrow();
    });

    it('claims the earliest available queued job and increments attempts', async () => {
      await tx((t) => enqueueJob(t, entry({ availableAt: 50, createdAt: 50, id: 'late' })));
      await tx((t) => enqueueJob(t, entry({ availableAt: 10, createdAt: 10, id: 'early' })));

      const claimed = await tx((t) => claimJob(t, { leaseDuration: 1000, now: 100, ownerId: 'a' }));

      expect(claimed).toMatchObject({
        attempts: 1,
        id: 'early',
        leaseExpiresAt: 1100,
        ownerId: 'a',
        status: 'running',
      });
    });

    it('skips queued jobs whose availableAt is in the future', async () => {
      await tx((t) => enqueueJob(t, entry({ availableAt: 200, id: 'future' })));

      await expect(tx((t) => claimJob(t, { leaseDuration: 1000, now: 100, ownerId: 'a' }))).resolves.toBeUndefined();
    });

    it('atomically grants only one owner a lease', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));

      const [first, second] = await Promise.all([
        tx((t) => claimJob(t, { leaseDuration: 1000, now: 10, ownerId: 'a' })),
        tx((t) => claimJob(t, { leaseDuration: 1000, now: 10, ownerId: 'b' })),
      ]);

      expect([first, second].filter(Boolean)).toHaveLength(1);
      expect(first ?? second).toMatchObject({ ownerId: expect.any(String), status: 'running' });
    });

    it('reclaims an abandoned lease after expiry', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 10, ownerId: 'a' }));

      await expect(tx((t) => claimJob(t, { leaseDuration: 1000, now: 1009, ownerId: 'b' }))).resolves.toBeUndefined();
      await expect(tx((t) => claimJob(t, { leaseDuration: 1000, now: 1010, ownerId: 'b' }))).resolves.toMatchObject({
        attempts: 2,
        ownerId: 'b',
      });
    });

    it('renews a lease for the current owner only', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(
        tx((t) => renewLeaseJob(t, { id: 'one', leaseExpiresAt: 5000, now: 500, ownerId: 'b' })),
      ).resolves.toBe(false);
      await expect(
        tx((t) => renewLeaseJob(t, { id: 'one', leaseExpiresAt: 5000, now: 500, ownerId: 'a' })),
      ).resolves.toBe(true);
    });

    it('rejects stale owners from completing a reclaimed job', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 1000, ownerId: 'b' }));

      await expect(tx((t) => completeJob(t, { id: 'one', now: 1000, ownerId: 'a' }))).resolves.toBe(false);
      await expect(tx((t) => completeJob(t, { id: 'one', now: 1000, ownerId: 'b' }))).resolves.toBe(true);
    });

    it('deletes completed jobs', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => completeJob(t, { id: 'one', now: 0, ownerId: 'a' }))).resolves.toBe(true);
      await expect(store.list()).resolves.toEqual([]);
    });

    it('releases a claimed job back to queued without consuming an attempt', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => releaseJob(t, { id: 'one', now: 100, ownerId: 'a' }))).resolves.toBe(true);
      await expect(tx((t) => releaseJob(t, { id: 'one', now: 100, ownerId: 'a' }))).resolves.toBe(false);
      await expect(store.list()).resolves.toMatchObject([{ attempts: 1, id: 'one', status: 'queued' }]);
      await expect(store.list()).resolves.toMatchObject([{ id: 'one' }]);
      // ownerId is absent after release (normalized records omit undefined optional fields)
      const [released] = await store.list();
      expect('ownerId' in released).toBe(false);
      expect('leaseExpiresAt' in released).toBe(false);
    });

    it('reschedules a running job back to queued with a future availableAt and failure', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      const failure = { message: 'offline', name: 'Error', occurredAt: 100 };
      await expect(
        tx((t) => rescheduleJob(t, { availableAt: 150, failure, id: 'one', now: 100, ownerId: 'a' })),
      ).resolves.toBe(true);

      await expect(store.list()).resolves.toMatchObject([{ availableAt: 150, failure, id: 'one', status: 'queued' }]);
      const [rescheduled] = await store.list();
      expect('ownerId' in rescheduled).toBe(false);
      expect('leaseExpiresAt' in rescheduled).toBe(false);
    });

    it('rejects reschedule from a stale owner', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(
        tx((t) =>
          rescheduleJob(t, {
            availableAt: 150,
            failure: { message: 'x', name: 'Error', occurredAt: 100 },
            id: 'one',
            now: 100,
            ownerId: 'b',
          }),
        ),
      ).resolves.toBe(false);
    });

    it('moves a running job to dead-letter and clears ownership', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      const failure = { message: 'bad', name: 'Error', occurredAt: 100 };
      await expect(tx((t) => deadLetterJob(t, { failure, id: 'one', now: 100, ownerId: 'a' }))).resolves.toBe(true);

      await expect(store.list()).resolves.toMatchObject([{ failure, id: 'one', status: 'dead-letter' }]);
      const [deadLettered] = await store.list();
      expect('ownerId' in deadLettered).toBe(false);
      expect('leaseExpiresAt' in deadLettered).toBe(false);
    });

    it('retry returns not-found for unknown ids', async () => {
      await expect(tx((t) => retryJob(t, 'missing', 100))).resolves.toMatchObject({ status: 'not-found' });
    });

    it('retry returns not-dead-letter for queued or running jobs', async () => {
      await tx((t) => enqueueJob(t, entry({ createdAt: 0, id: 'running', updatedAt: 0 })));
      await tx((t) => enqueueJob(t, entry({ createdAt: 10, id: 'queued', updatedAt: 10 })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => retryJob(t, 'queued', 100))).resolves.toMatchObject({ status: 'not-dead-letter' });
      await expect(tx((t) => retryJob(t, 'running', 100))).resolves.toMatchObject({ status: 'running' });
    });

    it('retry moves a dead-letter job back to queued at now', async () => {
      await tx((t) =>
        enqueueJob(
          t,
          entry({
            attempts: 3,
            failure: { message: 'bad', name: 'Error', occurredAt: 0 },
            id: 'one',
            status: 'dead-letter',
          }),
        ),
      );

      await expect(tx((t) => retryJob(t, 'one', 500))).resolves.toMatchObject({
        entry: { availableAt: 500, id: 'one', status: 'queued' },
        status: 'retried',
      });

      await expect(store.list()).resolves.toMatchObject([{ id: 'one', status: 'queued' }]);
      const [retried] = await store.list();
      expect('failure' in retried).toBe(false);
    });

    it('remove returns not-found for unknown ids', async () => {
      await expect(tx((t) => removeJob(t, 'missing'))).resolves.toMatchObject({ status: 'not-found' });
    });

    it('remove returns running for active jobs', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => removeJob(t, 'one'))).resolves.toMatchObject({ status: 'running' });
    });

    it('remove deletes queued or dead-letter jobs', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one', status: 'dead-letter' })));

      await expect(tx((t) => removeJob(t, 'one'))).resolves.toMatchObject({ id: 'one', status: 'removed' });
      await expect(store.list()).resolves.toEqual([]);
    });

    it('stats counts jobs by status', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'q1' })));
      await tx((t) => enqueueJob(t, entry({ id: 'q2' })));
      await tx((t) => enqueueJob(t, entry({ id: 'd1', status: 'dead-letter' })));
      await tx((t) => enqueueJob(t, entry({ id: 'r1' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => t.countByStatus())).resolves.toEqual({ deadLetter: 1, queued: 2, running: 1 });
    });

    it('findNextWake returns earliest future queued availableAt', async () => {
      await tx((t) => enqueueJob(t, entry({ availableAt: 200, id: 'a' })));
      await tx((t) => enqueueJob(t, entry({ availableAt: 100, id: 'b' })));

      await expect(tx((t) => t.findNextWake(50))).resolves.toBe(100);
    });

    it('findNextWake considers running lease expiry', async () => {
      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => claimJob(t, { leaseDuration: 1000, now: 0, ownerId: 'a' }));

      await expect(tx((t) => t.findNextWake(500))).resolves.toBe(1000);
    });

    it('findNextWake returns undefined when nothing is scheduled', async () => {
      await tx((t) => enqueueJob(t, entry({ availableAt: 50, id: 'a' })));

      await expect(tx((t) => t.findNextWake(100))).resolves.toBeUndefined();
    });

    it('subscribe notifies listeners after writes', async () => {
      const calls: number[] = [];
      const unsubscribe = store.subscribe(() => calls.push(calls.length));

      await tx((t) => enqueueJob(t, entry({ id: 'one' })));
      await tx((t) => enqueueJob(t, entry({ id: 'two' })));
      await new Promise((resolve) => setTimeout(resolve, 0));
      unsubscribe();
      await tx((t) => enqueueJob(t, entry({ id: 'three' })));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('disposal is idempotent and aborts the disposal signal', async () => {
      expect(store.disposed).toBe(false);
      await store.dispose();
      expect(store.disposed).toBe(true);
      expect(store.disposalSignal.aborted).toBe(true);
      await store.dispose();
    });
  });
}

export { toEntry };
