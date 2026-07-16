import type { Signal } from '@vielzeug/ripple';

import { compose, createLedger } from '@vielzeug/ledger';

import type { Board, Task, TaskStatus } from './types';

import { bus } from './events';

export const ledger = createLedger({ maxHistory: 50 });

export type NewTask = Omit<Task, 'id'>;

export async function createTask(boardSignal: Signal<Board>, input: NewTask): Promise<string> {
  const id = crypto.randomUUID();
  const task: Task = { ...input, id };

  await ledger.do(
    compose(
      [
        {
          execute: () => {
            const board = boardSignal.value;

            boardSignal.value = { ...board, tasks: [...board.tasks, task] };
          },
          rollback: () => {
            const board = boardSignal.value;

            boardSignal.value = { ...board, tasks: board.tasks.filter((t) => t.id !== id) };
          },
        },
        {
          execute: () => {
            bus.emit('board:task-created', { taskId: id });
          },
        },
      ],
      `Create task ${id}`,
    ),
  );

  return id;
}

export async function moveTask(
  boardSignal: Signal<Board>,
  taskId: string,
  from: TaskStatus,
  to: TaskStatus,
): Promise<void> {
  // Captured up front so rollback restores the exact prior value — a task can only reach
  // `to === 'done'` from a non-done status (the FSM in task-machine.ts forbids done->done),
  // so `previousCompletedAt` is always `null` on the way in, but reading it here (rather than
  // assuming that) keeps this command correct even if that invariant ever changes.
  const previousCompletedAt = boardSignal.value.tasks.find((t) => t.id === taskId)?.completedAt ?? null;
  const nextCompletedAt = to === 'done' ? new Date().toISOString() : null;

  await ledger.do(
    compose(
      [
        {
          execute: () => {
            const board = boardSignal.value;
            const tasks = board.tasks.map((t) =>
              t.id === taskId ? { ...t, completedAt: nextCompletedAt, status: to } : t,
            );

            boardSignal.value = { ...board, tasks };
          },
          rollback: () => {
            const board = boardSignal.value;
            const tasks = board.tasks.map((t) =>
              t.id === taskId ? { ...t, completedAt: previousCompletedAt, status: from } : t,
            );

            boardSignal.value = { ...board, tasks };
          },
        },
        {
          execute: () => {
            bus.emit('board:task-moved', { from, taskId, to });
          },
        },
      ],
      `Move task ${taskId} from ${from} to ${to}`,
    ),
  );
}

export async function editTask(boardSignal: Signal<Board>, taskId: string, patch: Partial<Task>): Promise<void> {
  const previous = boardSignal.value.tasks.find((t) => t.id === taskId);

  if (!previous) return;

  const previousValues: Partial<Task> = {};

  for (const key of Object.keys(patch) as (keyof Task)[]) {
    (previousValues as Record<string, unknown>)[key] = previous[key];
  }

  await ledger.do(
    compose(
      [
        {
          execute: () => {
            const board = boardSignal.value;
            const tasks = board.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));

            boardSignal.value = { ...board, tasks };
          },
          rollback: () => {
            const board = boardSignal.value;
            const tasks = board.tasks.map((t) => (t.id === taskId ? { ...t, ...previousValues } : t));

            boardSignal.value = { ...board, tasks };
          },
        },
        {
          execute: () => {
            bus.emit('board:task-updated', { taskId });
          },
        },
      ],
      `Edit task ${taskId}`,
    ),
  );
}

export async function deleteTask(boardSignal: Signal<Board>, taskId: string): Promise<void> {
  const board = boardSignal.value;
  const task = board.tasks.find((t) => t.id === taskId);

  if (!task) return;

  const taskIndex = board.tasks.indexOf(task);

  await ledger.do(
    compose(
      [
        {
          execute: () => {
            const current = boardSignal.value;

            boardSignal.value = { ...current, tasks: current.tasks.filter((t) => t.id !== taskId) };
          },
          rollback: () => {
            const current = boardSignal.value;
            const tasks = [...current.tasks];

            tasks.splice(taskIndex, 0, task);
            boardSignal.value = { ...current, tasks };
          },
        },
        {
          execute: () => {
            bus.emit('board:task-deleted', { taskId });
          },
        },
      ],
      `Delete task ${taskId}`,
    ),
  );
}
