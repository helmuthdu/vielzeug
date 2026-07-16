import type { Computed, Signal } from '@vielzeug/ripple';

import { flux, toSignal } from '@vielzeug/flux';
import { computed, signal } from '@vielzeug/ripple';

import type { Board, Task, TaskStatus } from './types';

import { router } from './router';
import { seedBoard } from './seed-data';

export { currentUser } from './auth';

export const boardSignal: Signal<Board> = signal(structuredClone(seedBoard));

export const selectedTaskId: Signal<string | null> = signal(null);

function currentRouteName(): string | null {
  return router.getSnapshot().matches.at(-1)?.name ?? null;
}

// Bridges router.subscribe() into a ripple signal via flux — the same fromSubscribe-style
// producer pattern used for i18n.ts's currentLocale and realtime.ts's presenceSignal, so all
// three "external subscribe API → reactive value" cases in this app go through one mechanism.
const routeBinding = toSignal(
  flux<string | null>((observer) => {
    observer.next(currentRouteName());

    return router.subscribe((state) => observer.next(state.matches.at(-1)?.name ?? null));
  }),
  { initial: currentRouteName() },
);

export const activeRoute: Computed<string | null> = computed(() => routeBinding.value);

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
