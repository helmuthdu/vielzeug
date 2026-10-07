import { TandemDisposedError } from './errors';
import type { SyncEnvelope, SyncHandle, SyncOptions, SyncRecordBase, SyncState, TandemEvent } from './types';

const DEFAULT_IDLE_DELAY_MS = 3000;

const baseline = (cursor: string | null = null): SyncState => ({ cursor, revs: {} });

/** Copies persisted state so the engine never aliases the object its gateway handed it. */
const cloneState = (state: SyncState): SyncState => ({ cursor: state.cursor, revs: { ...state.revs } });

/**
 * Drives a {@link SyncPort} against a {@link SyncGateway}. The engine never sees
 * individual commands or record shapes: it reads the device's records, and after a
 * quiet period pushes every record whose `rev` is above the last-synced baseline: a
 * burst of edits becomes one batched upload instead of one per edit. Every rev
 * comparison is the engine's: the gateway upserts what it is given and tombstones
 * what it deletes. Flushes serialize (one push in flight), fire immediately when
 * the tab hides or closes, and the tab runs a full cycle on return to the
 * foreground. A rejected push triggers a pull to reconcile.
 *
 * Runs in the browser (the visibility/pagehide hooks are no-ops without a document)
 * and in any storage-backed runtime the gateway can reach.
 */
export function createSync<TRecord extends SyncRecordBase = SyncRecordBase>(options: SyncOptions<TRecord>): SyncHandle {
  const { gateway, port } = options;
  const idleDelay = options.idleDelayMs ?? DEFAULT_IDLE_DELAY_MS;

  const controller = new AbortController();
  const tappers = new Set<(event: TandemEvent) => void>();
  const emit = (event: TandemEvent): void => {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect sync behavior.
      }
    }
  };
  const warn = (error: unknown): void => {
    if (tappers.size === 0) return;
    emit({ error, message: error instanceof Error ? error.message : String(error), type: 'warning' });
  };

  let state: SyncState = baseline();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const key = (entity: string, id: string): string => `${entity}:${id}`;
  const envelopeKey = (envelope: SyncEnvelope<TRecord>): string => key(envelope.entity, envelope.record.id);
  const isDirty = (envelope: SyncEnvelope<TRecord>): boolean =>
    envelope.record.rev > (state.revs[envelopeKey(envelope)] ?? -1);
  const save = (): Promise<void> => gateway.saveState(cloneState(state));

  const pull = async (): Promise<void> => {
    if (controller.signal.aborted) return;
    const { cursor, deletions, records } = await port.pull(state.cursor);
    // One read of the device's records answers every rev question this pull raises.
    const localRevs = new Map(
      (await gateway.records()).map((envelope) => [envelopeKey(envelope), envelope.record.rev] as const),
    );
    const entombed = new Set((await gateway.pendingDeletions()).map((deletion) => key(deletion.entity, deletion.id)));
    const deleted = new Set(deletions.map((deletion) => key(deletion.entity, deletion.id)));
    // Apply only records the server is ahead on: a locally tombstoned id or an id
    // deleted in this same pull never resurrects through the apply.
    const ahead = records.filter(
      (envelope) =>
        !entombed.has(envelopeKey(envelope)) &&
        !deleted.has(envelopeKey(envelope)) &&
        (localRevs.get(envelopeKey(envelope)) ?? -1) < envelope.record.rev,
    );
    const skipped = await gateway.applyRecords(ahead);
    if (skipped.length) {
      emit({ message: `Skipped invalid remote records: ${skipped.join(', ')}.`, skipped, type: 'invalid' });
    }
    // A deletion loses to local changes that have not made it to the server yet.
    const doomed = deletions.filter((deletion) => {
      const localKey = key(deletion.entity, deletion.id);

      return (localRevs.get(localKey) ?? -1) <= (state.revs[localKey] ?? -1);
    });
    await gateway.applyDeletions(doomed);
    for (const envelope of records) state.revs[envelopeKey(envelope)] = envelope.record.rev;
    // A record this pull removed locally has no baseline left to keep: pruning
    // keeps `revs` bounded to records that still exist.
    for (const deletion of doomed) delete state.revs[key(deletion.entity, deletion.id)];
    state.cursor = cursor;
    await save();
    emit({ records: ahead.length, type: 'pull' });
  };

  const push = async (keepalive: boolean): Promise<void> => {
    if (controller.signal.aborted) return;
    const records = (await gateway.records()).filter(isDirty);
    const deletions = await gateway.pendingDeletions();
    if (!records.length && !deletions.length) return;
    await port.push(records, deletions, keepalive ? { keepalive: true } : undefined);
    for (const envelope of records) state.revs[envelopeKey(envelope)] = envelope.record.rev;
    // Only the tombstones this push carried: new ones may have landed mid-flight.
    await gateway.clearDeletions(deletions);
    for (const deletion of deletions) delete state.revs[key(deletion.entity, deletion.id)];
    await save();
    emit({ records: records.length, type: 'push' });
  };

  // Jobs serialize through one queue. A failure warns through tap and the queue
  // survives; enqueue returns the raw outcome so flush() can reject.
  const enqueue = (job: () => Promise<void>): Promise<void> => {
    const attempt = queue.then(job);
    queue = attempt.catch(warn);
    return attempt;
  };
  const pushJob = (keepalive: boolean) => (): Promise<void> =>
    push(keepalive).catch(async (error: unknown) => {
      // A rejected push usually means the server moved on: pull to reconcile,
      // then surface the failure to whoever is waiting on this job.
      await pull().catch(() => {});
      throw error;
    });
  // A full cycle: absorb remote changes first, then push the merged dirty set.
  const cycle = async (): Promise<void> => {
    await pull();
    await pushJob(false)();
  };

  const flushSoon = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void enqueue(pushJob(false)), idleDelay);
  };

  const doc = globalThis.document;
  const onVisibility = (): void => {
    if (doc.visibilityState === 'hidden') void enqueue(pushJob(true));
    else void enqueue(cycle);
  };
  const onPageHide = (): void => void enqueue(pushJob(true));
  doc?.addEventListener('visibilitychange', onVisibility);
  globalThis.addEventListener?.('pagehide', onPageHide);

  // Boot: load the persisted baseline, run one full cycle: pull remote changes,
  // then push anything created or changed while offline. Later flushes chain onto it.
  void enqueue(async () => {
    if (controller.signal.aborted) return;
    state = cloneState((await gateway.loadState()) ?? baseline());
    await cycle();
  });

  const disposedError = (): TandemDisposedError => new TandemDisposedError('This sync handle has been disposed.');

  return {
    changed(): void {
      if (controller.signal.aborted) throw disposedError();

      flushSoon();
    },
    disposalSignal: controller.signal,
    dispose(): void {
      if (controller.signal.aborted) return;
      emit({ type: 'dispose' });
      controller.abort();
      if (timer) clearTimeout(timer);
      doc?.removeEventListener('visibilitychange', onVisibility);
      globalThis.removeEventListener?.('pagehide', onPageHide);
      tappers.clear();
    },
    get disposed(): boolean {
      return controller.signal.aborted;
    },
    flush: () => (controller.signal.aborted ? Promise.reject(disposedError()) : enqueue(cycle)),
    tap(handler, tapOptions): () => void {
      if (controller.signal.aborted || tapOptions?.signal?.aborted) return () => {};
      const detach = (): void => {
        tappers.delete(handler);
      };
      tappers.add(handler);
      controller.signal.addEventListener('abort', detach, { once: true });
      tapOptions?.signal?.addEventListener('abort', detach, { once: true });
      return detach;
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
