import { stream } from '@vielzeug/flux';
import { toSignal } from '@vielzeug/flux/ripple';
import type { Readable, Signal } from '@vielzeug/ripple';
import { computed, signal } from '@vielzeug/ripple';
import { router } from './router';
import { seedBoard } from './seed-data';
import type { Board, Task, TaskStatus } from './types';

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
  stream<string | null>((observer) => {
    observer.next(currentRouteName());

    return router.subscribe((state) => observer.next(state.matches.at(-1)?.name ?? null));
  }),
  { initial: currentRouteName() },
);

export const activeRoute: Readable<string | null> = computed(() => routeBinding.value);

export function filteredTasks(status: TaskStatus): Readable<Task[]> {
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
