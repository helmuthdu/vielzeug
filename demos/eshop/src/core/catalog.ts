import type { AsyncState } from '@vielzeug/courier';

import { fromQuery } from '@vielzeug/flux/courier';
import { toSignal } from '@vielzeug/flux/ripple';
import { computed } from '@vielzeug/ripple';

import type { Model } from './types';

import { courier, fetchModelsRequest } from './api';
import { models as seedModels } from './seed-data';

/**
 * Reactive model catalog — chained through three packages exactly like
 * demos/kanban/src/core/users.ts's user directory: `@vielzeug/courier`'s query cache
 * fetches/caches the mock `/api/models` response, `@vielzeug/flux`'s `fromQuery` adapts its
 * query handle into a stream, and `@vielzeug/ripple`'s `toSignal` lands that stream as a
 * reactive signal every view below can read.
 */
const modelsQuery = courier.queries.create<Model[]>({
  fetch: () => fetchModelsRequest(),
  key: ['models'],
  staleTime: 60_000,
});

courier.queries.set(['models'], seedModels);

const modelsBinding = toSignal(fromQuery<AsyncState<Model[]>>(modelsQuery), { initial: modelsQuery.getSnapshot() });

export const modelsSignal = computed<Model[]>(() => modelsBinding.value.data ?? seedModels);

export const modelMap = computed(() => new Map(modelsSignal.value.map((m) => [m.id, m])));

export function getModelBySlug(slug: string): Model | undefined {
  return modelsSignal.value.find((m) => m.slug === slug);
}
