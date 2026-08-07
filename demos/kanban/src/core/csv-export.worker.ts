import { exposeTask } from '@vielzeug/familiar/protocol';

import type { Task } from './types';

function serializeTasksAsCsv(tasks: Task[]): string {
  const header = 'id,title,status,assigneeId,dueDate,budget';
  const rows = tasks.map((task) =>
    [
      task.id,
      task.title,
      task.status,
      task.assigneeId ?? '',
      task.dueDate ?? '',
      task.budget ? `${task.budget.amount} ${task.budget.currency}` : '',
    ]
      .map((value) => JSON.stringify(String(value)))
      .join(','),
  );

  return [header, ...rows].join('\n');
}

exposeTask(serializeTasksAsCsv);
