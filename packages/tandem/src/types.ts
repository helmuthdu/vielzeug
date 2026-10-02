/**
 * The two seams Tandem drives: a {@link SyncPort} that reaches the server, and a
 * {@link SyncGateway} that reaches the device's own storage. The engine never
 * sees a database, a transport, or a record shape — records travel as opaque
 * envelopes carrying only an `id` and a write-counter `rev`. Every rev
 * comparison is the engine's: the gateway upserts, validates, and tombstones
 * without re-deriving the sync policy.
 */

/** A record that syncs: identified, versioned by committed writes, otherwise opaque. */
export interface SyncRecordBase {
  /** Stable identity, unique within its entity. */
  readonly id: string;
  /** Counts this record's committed writes; equal revs on two devices mean a concurrent edit. */
  readonly rev: number;
}

/** A record paired with the entity (table or kind) it belongs to. */
export interface SyncEnvelope<TRecord extends SyncRecordBase = SyncRecordBase> {
  readonly entity: string;
  readonly record: TRecord;
}

/** A deletion that travels: stored locally as a tombstone, propagated on the next push. */
export interface SyncDeletion {
  readonly deletedAt: string;
  readonly entity: string;
  readonly id: string;
}

/** Per-account sync bookkeeping the gateway persists: the pull cursor and the newest
 *  rev the server has seen per record (`"${entity}:${id}"` → rev). A record is dirty
 *  exactly when its current rev is above that baseline — across reloads, not just
 *  this session. */
export interface SyncState {
  cursor: string | null;
  revs: Record<string, number>;
}

/** What a pull returned: remote records changed after the cursor, remote deletions,
 *  and the cursor for the next pull (null when the backend has no incremental pull). */
export interface SyncPullResult<TRecord extends SyncRecordBase = SyncRecordBase> {
  readonly cursor: string | null;
  readonly deletions: readonly SyncDeletion[];
  readonly records: readonly SyncEnvelope<TRecord>[];
}

/** The server side of sync, implemented over HTTP, GraphQL, or anything else. */
export interface SyncPort<TRecord extends SyncRecordBase = SyncRecordBase> {
  /** Remote records changed after `since`, plus remote deletions. */
  pull(since: string | null): Promise<SyncPullResult<TRecord>>;
  /**
   * Push local records and deletions. Reject when the server diverged (it is ahead
   * of the pushed lineage) so the engine can pull and reconcile. `keepalive` marks
   * a flush that must survive the tab closing — serve it with `navigator.sendBeacon`
   * or a `keepalive` fetch.
   */
  push(
    records: readonly SyncEnvelope<TRecord>[],
    deletions: readonly SyncDeletion[],
    options?: { readonly keepalive?: boolean },
  ): Promise<void>;
}

/**
 * The device side of sync: the app's storage, expressed as the handful of reads
 * and writes the engine needs. The engine does the rev math — `applyRecords`
 * receives only records the server is ahead on, already filtered against
 * same-or-ahead locals and locally tombstoned ids, so the gateway upserts and
 * validates without comparing revs itself. Remote records are untrusted —
 * `applyRecords` is the app's validation boundary and reports the ids it refused.
 */
export interface SyncGateway<TRecord extends SyncRecordBase = SyncRecordBase> {
  /** Applies pulled deletions — no tombstone: the deletion came from the server. */
  applyDeletions(deletions: readonly SyncDeletion[]): Promise<void>;
  /** Upserts the given pulled records; returns the ids of records that failed validation. */
  applyRecords(records: readonly SyncEnvelope<TRecord>[]): Promise<string[]>;
  /** Removes the tombstones a successful push carried — only those, since new
   *  deletions may have been recorded while the push was in flight. */
  clearDeletions(deletions: readonly SyncDeletion[]): Promise<void>;
  /** The persisted baseline, or `null` on a fresh device. */
  loadState(): Promise<SyncState | null>;
  /** Tombstones not yet acknowledged by the server. */
  pendingDeletions(): Promise<SyncDeletion[]>;
  /** The device's own records — no remote mirrors. */
  records(): SyncEnvelope<TRecord>[];
  /** Persists the baseline after a completed pull or push. */
  saveState(state: SyncState): Promise<void>;
}

/** Notable moments the engine reports through {@link SyncHandle.tap}. */
export type TandemEvent =
  | { readonly records: number; readonly type: 'pull' }
  | { readonly records: number; readonly type: 'push' }
  | { readonly message: string; readonly skipped: readonly string[]; readonly type: 'invalid' }
  | { readonly message: string; readonly type: 'warning' }
  | { readonly type: 'dispose' };

/** Options for {@link createSync}. */
export interface SyncOptions<TRecord extends SyncRecordBase = SyncRecordBase> {
  /** The device's storage. */
  gateway: SyncGateway<TRecord>;
  /** Quiet period after the last change before a flush, in ms (default 3000). */
  idleDelayMs?: number;
  /** The server. */
  port: SyncPort<TRecord>;
}

/** The running sync scheduler returned by {@link createSync}. */
export interface SyncHandle {
  /** Records that a local change happened; (re)starts the idle timer that flushes
   *  dirty records. Wire this to the app's write path or reactive layer. */
  changed(): void;
  /** Aborted when the handle is disposed. */
  readonly disposalSignal: AbortSignal;
  /** Stops the scheduler. Dispose before switching accounts — the baseline is
   *  per-account state and a running scheduler would push into the wrong port. */
  dispose(): void;
  /** True once {@link dispose} has run. */
  readonly disposed: boolean;
  /** Runs a full sync cycle now — pulls remote changes, then pushes dirty records.
   *  Resolves when the cycle completes; rejects when it fails (dirty records stay
   *  dirty and the next cycle retries them). A no-op after {@link dispose}. */
  flush(): Promise<void>;
  /** Subscribes to {@link TandemEvent}s. Handler errors are swallowed; the
   *  subscription detaches when `signal` aborts or the handle is disposed. */
  tap(handler: (event: TandemEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  [Symbol.dispose](): void;
}
