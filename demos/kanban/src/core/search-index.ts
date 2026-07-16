import { effect } from '@vielzeug/ripple';
import { createIndex } from '@vielzeug/scout';

import type { Task } from './types';

import { boardSignal } from './board-store';

export const taskIndex = createIndex<Task>(boardSignal.value.tasks, {
  fields: ['title', 'description'],
});

// Keep index in sync when board tasks change.
// ScoutIndex has no bulk-replace API — patch incrementally via add/remove.
effect(() => {
  const tasks = boardSignal.value.tasks;
  const existing = new Set(taskIndex.items);
  const incoming = new Set(tasks);

  // Remove items no longer in the board.
  for (const item of existing) {
    if (!incoming.has(item)) taskIndex.remove(item);
  }

  // Add new items and reindex mutated ones.
  for (const item of tasks) {
    if (!existing.has(item)) {
      taskIndex.add(item);
    } else {
      taskIndex.reindex(item);
    }
  }
});
