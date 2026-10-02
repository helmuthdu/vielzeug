import type { Campaign, Expedition } from '../domain/types';
import type { PrimalStore } from './database';
import { createMemoryPrimalStore } from './database';
import { hydratePrimalStore } from './store';

/**
 * Test harness for the Vault-backed store. Each test opens a fresh in-memory database (with
 * the same codecs and repair pipeline as IndexedDB), so tests exercise the real
 * observer-driven flow: writes go to the database and the table observers carry them back
 * into the signals. `flush` waits for one observer round-trip.
 */

/** Waits for queued work to settle: one tick per observer round-trip or forwarded message. */
export const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Opens a fresh memory database, seeds the development campaign, and returns the store. */
export async function openTestStore(): Promise<PrimalStore> {
  const store = createMemoryPrimalStore();
  await hydratePrimalStore(store);
  await flush();
  return store;
}

/** Writes a campaign row directly (bypassing commands) and waits for the observer. */
export async function putCampaign(store: PrimalStore, campaign: Campaign): Promise<void> {
  await store.put('campaigns', campaign);
  await flush();
}

/** Writes an expedition row directly (bypassing commands) and waits for the observer. */
export async function putExpedition(store: PrimalStore, expedition: Expedition): Promise<void> {
  await store.put('expeditions', expedition);
  await flush();
}
