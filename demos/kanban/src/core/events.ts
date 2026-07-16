import { createBus } from '@vielzeug/herald';

import type { TaskStatus } from './types';

// A `type` alias (not `interface`) — herald's `createBus<T extends EventMap>()` constrains T to
// `Record<string, unknown>`, which only type literals satisfy structurally; interfaces are
// nominally open/extendable and never get an implicit index signature.
export type AppEvents = {
  'board:task-created': { taskId: string };
  'board:task-deleted': { taskId: string };
  'board:task-moved': { from: TaskStatus; taskId: string; to: TaskStatus };
  'board:task-updated': { taskId: string };
  'toast:show': { message: string; variant: 'success' | 'error' | 'info' };
};

export const bus = createBus<AppEvents>();
