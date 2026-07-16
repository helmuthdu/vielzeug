import type { MachineConfig, MachineInstance } from '@vielzeug/clockwork';

import { createMachine } from '@vielzeug/clockwork';

import type { TaskStatus } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskContext = {
  assigneeId: string | null;
  taskId: string;
};

type TaskEvent =
  | { type: 'APPROVE' }
  | { type: 'REJECT' }
  | { type: 'REOPEN' }
  | { type: 'RESET' }
  | { type: 'START' }
  | { type: 'SUBMIT' };

// ── Machine definition ────────────────────────────────────────────────────────

export const taskMachineDefinition: MachineConfig<TaskStatus, TaskContext, TaskEvent> = {
  context: { assigneeId: null, taskId: '' },
  initial: 'todo',
  states: {
    done: {
      on: {
        REOPEN: { target: 'in-progress' },
      },
    },
    'in-progress': {
      on: {
        RESET: { target: 'todo' },
        SUBMIT: { target: 'review' },
      },
    },
    review: {
      on: {
        APPROVE: { target: 'done' },
        REJECT: { target: 'in-progress' },
      },
    },
    todo: {
      on: {
        START: { target: 'in-progress' },
      },
    },
  },
};

// ── Factory ───────────────────────────────────────────────────────────────────

export function createTaskMachine(
  taskId: string,
  initialStatus: TaskStatus,
  assigneeId: string | null,
): MachineInstance<TaskStatus, TaskContext, TaskEvent> {
  return createMachine(taskMachineDefinition).start({
    snapshot: { context: { assigneeId, taskId }, state: initialStatus },
  });
}
