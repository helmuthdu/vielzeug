import { effect } from '@vielzeug/ripple';
import { createIndex } from '@vielzeug/scout';
import { modelsSignal } from './catalog';
import type { Model } from './types';

export const modelIndex = createIndex<Model>(modelsSignal.value, {
  fields: ['name', 'segment', 'tagline', 'description'],
});

// Keep index membership, field values, and source order synchronized in one mutation.
effect(() => {
  modelIndex.setItems(modelsSignal.value);
});
