import { computed, resource } from '@vielzeug/ripple';
import { fetchModelsRequest } from './api';
import { models as seedModels } from './seed-data';
import type { Model } from './types';

// The catalog is immutable, so a single resource load (cached forever by Courier)
// is enough. `resource()` exposes an `AsyncState` we derive a plain `Readable` from,
// keeping seed data as the fallback while the fetch is pending or has errored — the
// same resilience the old one-shot load had, but with a reactive `AsyncState` core.
const modelsResource = resource(
  () => null,
  (_source, context) => fetchModelsRequest(context.signal),
  { name: 'models' },
);

export const modelsSignal = computed<Model[]>(() => {
  const state = modelsResource.value;

  return state.status === 'success' ? state.value : seedModels;
});

export const modelMap = computed(() => new Map(modelsSignal.value.map((model) => [model.id, model])));

export function getModelBySlug(slug: string): Model | undefined {
  return modelsSignal.value.find((model) => model.slug === slug);
}
