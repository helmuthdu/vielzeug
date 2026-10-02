import {
  createSync,
  type SyncDeletion,
  type SyncGateway,
  type SyncHandle,
  type SyncPort,
  type SyncState,
} from '@vielzeug/tandem';
import type { Ascent, Campaign, Challenge, Expedition, HunterLoadout } from '../domain/types';
import { ascents, campaigns, challenges, expeditions, loadouts, syncGateway } from './store';

/**
 * The seam between the local Vault database and a remote backend. The scheduler
 * itself: rev baselines, idle-batched pushes, tombstone flow, hide-flows, and
 * push-reconcile: lives in `@vielzeug/tandem`. What remains here is the primal
 * shape of it: the entity union, the vault-backed gateway, and the store
 * subscriptions that announce local writes. Settings never sync: they are device
 * preferences, not game state, so they stay out of the scope below.
 */

/** The tables that sync: everything the account owns except device-local settings. */
export type SyncEntity = 'ascents' | 'campaigns' | 'challenges' | 'expeditions' | 'loadouts';

export type SyncRecord =
  | { entity: 'ascents'; record: Ascent }
  | { entity: 'campaigns'; record: Campaign }
  | { entity: 'challenges'; record: Challenge }
  | { entity: 'expeditions'; record: Expedition }
  | { entity: 'loadouts'; record: HunterLoadout };

/** The sync-state row in the vault: the tandem baseline plus its primary key. */
export interface SyncStateRecord extends SyncState {
  id: 'app';
}

export type { SyncDeletion, SyncPort };

export interface SyncOptions {
  /** Quiet period after the last change before a flush (default 3 s). */
  idleDelayMs?: number;
  /** Reports recoverable problems: push rejections, network failures, invalid remote records. */
  onWarning?: (message: string) => void;
}

/**
 * Starts the tandem scheduler over the vault-backed gateway. Every store signal is
 * wired to `changed()`, so a burst of commands becomes one batched push; disposing
 * the handle stops the scheduler and the subscriptions with it.
 */
export function startSync(port: SyncPort, options: SyncOptions = {}): SyncHandle {
  const gateway: SyncGateway = {
    applyDeletions: (deletions) => syncGateway.applyDeletions(deletions),
    // The gateway validates every pulled record against the persisted schemas, so
    // the opaque envelopes are safe to hand over as-is.
    applyRecords: (records) => syncGateway.applyRecords(records as readonly SyncRecord[]),
    clearDeletions: (deletions) => syncGateway.clearDeletions(deletions),
    loadState: () => syncGateway.loadState(),
    pendingDeletions: () => syncGateway.pendingDeletions(),
    records: () => syncGateway.records(),
    saveState: (state) => syncGateway.saveState({ ...state, id: 'app' }),
  };
  const handle = createSync({ gateway, idleDelayMs: options.idleDelayMs, port });
  if (options.onWarning) {
    const { onWarning } = options;
    handle.tap((event) => {
      if (event.type === 'invalid' || event.type === 'warning') onWarning(event.message);
    });
  }
  const stops = [ascents, campaigns, challenges, expeditions, loadouts].map((signal) =>
    signal.subscribe(() => handle.changed()),
  );
  handle.disposalSignal.addEventListener(
    'abort',
    () => {
      for (const stop of stops) stop();
    },
    { once: true },
  );
  return handle;
}
