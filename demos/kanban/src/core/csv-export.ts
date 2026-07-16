import { createWorker } from '@vielzeug/familiar';

import type { Task } from './types';

import { boardSignal } from './board-store';

const csvWorker = createWorker((tasks: Task[]) => {
  const header = 'id,title,status,assigneeId,dueDate,budget';
  const rows = tasks.map((t) =>
    [
      t.id,
      t.title,
      t.status,
      t.assigneeId ?? '',
      t.dueDate ?? '',
      t.budget ? t.budget.amount + ' ' + t.budget.currency : '',
    ]
      .map((v) => JSON.stringify(String(v)))
      .join(','),
  );

  return [header, ...rows].join('\n');
});

export async function exportTasksAsCsv(): Promise<void> {
  const csv = await csvWorker.run(boardSignal.value.tasks);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'tasks.csv';
  a.click();
  URL.revokeObjectURL(url);
}
