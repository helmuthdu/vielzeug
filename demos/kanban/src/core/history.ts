import type { Signal } from '@vielzeug/ripple';

import { compose, createLedger } from '@vielzeug/ledger';

import type { Board, Task, TaskStatus } from './types';

import { bus } from './events';

export const ledger = createLedger({ maxHistory: 50 });

export type NewTask = Omit<Task, 'id'>;

/**
 * Re-splices the subsequence of `tasks` whose `status === status` into `orderedIds`' order,
 * leaving every other task's position (and every other status's relative order) untouched.
 * `orderedIds` must contain exactly the ids currently in that status — extra/missing ids are
 * silently dropped/skipped, matching how `@vielzeug/dnd`'s own `applyReorder()` treats mismatches.
 */
function applyReorderWithinStatus(tasks: Task[], status: TaskStatus, orderedIds: string[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t] as const));
  const reordered = orderedIds.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t));
  let cursor = 0;

  return tasks.map((t) => (t.status === status ? (reordered[cursor++] ?? t) : t));
}

/**
 * Persists a same-column drag reorder (no status change — see `moveTask` for that). Without
 * this, `@vielzeug/dnd` still commits the visual reorder, but `board-column`'s post-drag
 * reconcile redraws from `boardSignal` (which never changed), silently snapping every reordered
 * card back to its original position the instant the drag ends.
 */
export async function reorderTasks(
  boardSignal: Signal<Board>,
  status: TaskStatus,
  orderedIds: string[],
): Promise<void> {
  const previousOrder = boardSignal.value.tasks.filter((t) => t.status === status).map((t) => t.id);

  if (previousOrder.length === orderedIds.length && previousOrder.every((id, i) => id === orderedIds[i])) return;

  await ledger.do(
    compose(
      [
        {
          execute: () => {
            const board = boardSignal.value;

            boardSignal.value = { ...board, tasks: applyReorderWithinStatus(board.tasks, status, orderedIds) };
          },
          rollback: () => {
            const board = boardSignal.value;

            boardSignal.value = { ...board, tasks: applyReorderWithinStatus(board.tasks, status, previousOrder) };
          },
        },
      ],
      `Reorder ${status} tasks`,
    ),
  );
}

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
