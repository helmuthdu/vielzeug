import { CourierNetworkError } from '@vielzeug/courier';
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';
import { createNetwork } from '@vielzeug/sentinel';
import { syncOpportunity } from './api';
import { bus } from './events';
import { networkStatus } from './store';
import type { OpportunityStage } from './types';

interface StageChangePayload {
  id: string;
  stage: OpportunityStage;
}
function validateStageChange(value: unknown): StageChangePayload {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as StageChangePayload).id !== 'string' ||
    typeof (value as StageChangePayload).stage !== 'string'
  )
    throw new Error('Invalid stage change payload');
  return value as StageChangePayload;
}

const outboxStore = createIndexedDbPostmasterStore({ name: 'vielzeug-crm-outbox' });
const postmaster = createPostmaster({
  jobs: defineJobs({
    syncStage: {
      execute: async (value: unknown) => {
        const payload = validateStageChange(value);
        await syncOpportunity(payload.id, { stage: payload.stage });
      },
      key: (value: unknown) => {
        const payload = validateStageChange(value);
        return `${payload.id}:${payload.stage}`;
      },
      retry: {
        delay: () => 800,
        maxAttempts: 20,
        shouldRetry: (error: unknown) => error instanceof CourierNetworkError,
      },
      validate: validateStageChange,
      version: 1,
    },
  }),
  store: outboxStore,
});
const network = createNetwork();
let initialized = false;

export async function setupOfflineSync(): Promise<void> {
  if (initialized) return;
  initialized = true;
  bus.on('opportunity:stage-changed', ({ opportunityId, to }) => {
    void postmaster.enqueue('syncStage', { id: opportunityId, stage: to });
  });
  network.subscribe(() => {
    if (network.value.online && networkStatus.value !== 'offline') void reconnect();
  });
  await postmaster.start();
}

export function simulateOffline(): void {
  networkStatus.value = 'offline';
  bus.emit('toast:show', { message: 'Offline mode enabled. Changes will be queued.', variant: 'info' });
}

export async function reconnect(): Promise<void> {
  if (networkStatus.value === 'syncing') return;
  networkStatus.value = 'syncing';
  await postmaster.flush();
  networkStatus.value = 'online';
  bus.emit('toast:show', { message: 'All queued changes synced.', variant: 'success' });
}
