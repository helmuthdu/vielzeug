import { type DocumentVaultStore, table } from '@vielzeug/vault';
import { createIndexedDB } from '@vielzeug/vault/indexeddb';
import { createMemory } from '@vielzeug/vault/memory';
import type { Ascent, Campaign, Challenge, Expedition, HunterLoadout } from '../domain/types';
import {
  ascentCodec,
  type CatalogRecord,
  campaignCodec,
  catalogCodec,
  challengeCodec,
  expeditionCodec,
  loadoutCodec,
  type SettingsRecord,
  settingsCodec,
} from './persistence';
import type { SyncDeletion, SyncStateRecord } from './sync';

/**
 * The device database. Every saved record lives in one Vault document store keyed per table,
 * validated by the persisted schemas on every read and write. Accounts are separate database
 * names, so switching accounts means disposing one store and opening the next.
 */

export const SETTINGS_ID = 'app';

export const primalSchema = {
  ascents: table<Ascent>('id', { indexes: ['updatedAt'] }),
  campaigns: table<Campaign>('id', { indexes: ['updatedAt'] }),
  /** The catalog stub's bookkeeping: one row per account. */
  catalogState: table<CatalogRecord>('id'),
  challenges: table<Challenge>('id', { indexes: ['updatedAt'] }),
  expeditions: table<Expedition>('id', { indexes: ['updatedAt'] }),
  loadouts: table<HunterLoadout>('id', { indexes: ['hunterId'] }),
  settings: table<SettingsRecord>('id'),
  /** Per-account sync bookkeeping: the pull cursor and the last-synced rev per entity. */
  syncState: table<SyncStateRecord>('id'),
  /** Deletions recorded so the sync port can propagate them; local reads ignore them. */
  tombstones: table<SyncDeletion>('id'),
};

export type PrimalSchema = typeof primalSchema;
export type PrimalStore = DocumentVaultStore<PrimalSchema>;

const codecs = {
  ascents: ascentCodec,
  campaigns: campaignCodec,
  catalogState: catalogCodec,
  challenges: challengeCodec,
  expeditions: expeditionCodec,
  loadouts: loadoutCodec,
  settings: settingsCodec,
  syncState: { parse: (value: unknown) => value as SyncStateRecord },
  tombstones: { parse: (value: unknown) => value as SyncDeletion },
};

/** The IndexedDB name for one account's database. */
export const primalDatabaseName = (accountId = 'local'): string => `primal:${accountId}`;

/** Opens the account's IndexedDB database. Tests pass a memory store to `hydratePrimalStore` instead. */
export function openPrimalStore(accountId = 'local'): PrimalStore {
  // The version tracks store layout only (version 5 renamed the old `challengeRuns` store to
  // `challenges`; the old store is left orphaned. Version 7 added the `catalogState` table).
  // Record shapes are never
  // migrated: nothing has shipped, so a database this build cannot read is reset at boot
  // by `hydratePrimalStore`, not repaired.
  return createIndexedDB({ codecs, name: primalDatabaseName(accountId), schema: primalSchema, version: 7 });
}

/** In-memory twin of the real database, with the same codecs and validation. */
export function createMemoryPrimalStore(): PrimalStore {
  return createMemory({ codecs, schema: primalSchema }) as PrimalStore;
}
