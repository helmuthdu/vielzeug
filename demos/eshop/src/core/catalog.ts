import { computed, signal } from '@vielzeug/ripple';
import { courier, fetchModelsRequest } from './api';
import { models as seedModels } from './seed-data';
import type { Model } from './types';

const modelsKey = ['models'] as const;
const modelsDefinition = {
  fetch: () => fetchModelsRequest(),
  key: modelsKey,
  staleTime: 60_000,
};

courier.queries.set(modelsKey, seedModels);

export const modelsSignal = signal<Model[]>(seedModels);

courier.queries.subscribe(modelsKey, () => {
  modelsSignal.value = courier.queries.getSnapshot<Model[]>(modelsKey)?.data ?? seedModels;
});
void courier.queries.fetch(modelsDefinition);

export const modelMap = computed(() => new Map(modelsSignal.value.map((model) => [model.id, model])));

export function getModelBySlug(slug: string): Model | undefined {
  return modelsSignal.value.find((model) => model.slug === slug);
}
