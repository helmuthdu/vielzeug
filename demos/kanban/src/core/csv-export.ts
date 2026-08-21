import { createWorker } from '@vielzeug/familiar';

import { boardSignal } from './board-store';
import type { Task } from './types';

export async function exportTasksAsCsv(): Promise<void> {
  const worker = createWorker<Task[], string>(new URL('./csv-export.worker.ts', import.meta.url));

  try {
    const csv = await worker.run(boardSignal.value.tasks);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'tasks.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  } finally {
    worker.dispose();
  }
}
