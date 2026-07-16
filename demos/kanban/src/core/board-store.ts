import type { Computed, Signal } from '@vielzeug/ripple';

import { computed, signal } from '@vielzeug/ripple';

import type { Board, Task, TaskStatus } from './types';

import { router } from './router';
import { seedBoard } from './seed-data';

export { currentUser } from './auth';

export const boardSignal: Signal<Board> = signal(structuredClone(seedBoard));

export const selectedTaskId: Signal<string | null> = signal(null);

// Derive a signal from the router's subscribe API so activeRoute stays reactive.
// router.getSnapshot() returns RouteState; matches is root-to-leaf, last entry is the leaf.
const _activeRouteName = signal<string | null>(router.getSnapshot().matches.at(-1)?.name ?? null);

router.subscribe((state) => {
  _activeRouteName.value = state.matches.at(-1)?.name ?? null;
});

export const activeRoute: Computed<string | null> = computed(() => _activeRouteName.value);

export function filteredTasks(status: TaskStatus): Computed<Task[]> {
  return computed(() => boardSignal.value.tasks.filter((t) => t.status === status));
}

export function patchTask(taskId: string, patch: Partial<Task>): void {
  const board = boardSignal.value;
  const index = board.tasks.findIndex((t) => t.id === taskId);

  if (index === -1) return;

  const updatedTasks = board.tasks.slice();

  updatedTasks[index] = { ...updatedTasks[index], ...patch };
  boardSignal.value = { ...board, tasks: updatedTasks };
}
