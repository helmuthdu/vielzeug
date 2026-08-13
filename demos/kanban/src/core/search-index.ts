import { effect } from '@vielzeug/ripple';
import { createIndex } from '@vielzeug/scout';
import { boardSignal } from './board-store';
import type { Task } from './types';

export const taskIndex = createIndex<Task>(boardSignal.value.tasks, {
  fields: ['title', 'description'],
});

// Keep index membership, field values, and source order synchronized in one mutation.
effect(() => {
  taskIndex.setItems(boardSignal.value.tasks);
});
