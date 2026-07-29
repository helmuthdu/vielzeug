import { effect } from '@vielzeug/ripple';
import { createIndex } from '@vielzeug/scout';

import type { Model } from './types';

import { modelsSignal } from './catalog';

export const modelIndex = createIndex<Model>(modelsSignal.value, {
  fields: ['name', 'segment', 'tagline', 'description'],
});

// Keep the index in sync when the model catalog changes. ScoutIndex has no bulk-replace API —
// patch incrementally via add/remove/reindex, mirroring demos/kanban/src/core/search-index.ts.
effect(() => {
  const models = modelsSignal.value;
  const existing = new Set(modelIndex.items);
  const incoming = new Set(models);

  for (const item of existing) {
    if (!incoming.has(item)) modelIndex.remove(item);
  }

  for (const item of models) {
    if (!existing.has(item)) modelIndex.add(item);
    else modelIndex.reindex(item);
  }
});
