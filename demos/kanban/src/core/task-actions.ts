/**
 * Ward permission checks + FSM-guarded status transitions, shared between the board's
 * drag-and-drop handler and the task dialog's manual edit form — one place decides whether
 * a move/create/update/delete is allowed, instead of duplicating the same `ward.explain` +
 * `createTaskMachine` checks at every call site.
 */
import type { Task, TaskStatus } from './types';

import { currentUser, getPrincipal, ward } from './auth';
import { boardSignal } from './board-store';
import { bus } from './events';
import { createTask, deleteTask, editTask, moveTask, type NewTask } from './history';
import { logger } from './logger';
import { createTaskMachine } from './task-machine';

type FsmEventType = 'APPROVE' | 'REJECT' | 'REOPEN' | 'RESET' | 'START' | 'SUBMIT';

const TRANSITION_EVENT: Partial<Record<`${TaskStatus}->${TaskStatus}`, FsmEventType>> = {
  'done->in-progress': 'REOPEN',
  'in-progress->review': 'SUBMIT',
  'in-progress->todo': 'RESET',
  'review->done': 'APPROVE',
  'review->in-progress': 'REJECT',
  'todo->in-progress': 'START',
};

function notify(message: string, variant: 'success' | 'error' | 'info' = 'error'): void {
  bus.emit('toast:show', { message, variant });

  if (variant === 'error') logger.warn(message);
  else logger.info(message);
}

export function canCreateTask(): boolean {
  return ward.explain(getPrincipal(currentUser.value), 'task', 'create').allowed;
}

export function canUpdateTask(task: Task): boolean {
  return ward.explain(getPrincipal(currentUser.value), 'task', 'update', task).allowed;
}

export function canDeleteTask(task: Task): boolean {
  return ward.explain(getPrincipal(currentUser.value), 'task', 'delete', task).allowed;
}

/** Validates ward permission + the task FSM, then performs the move. Toasts on rejection. */
export async function attemptMoveTask(task: Task, to: TaskStatus): Promise<boolean> {
  const decision = ward.explain(getPrincipal(currentUser.value), 'task', 'move', task);

  if (!decision.allowed) {
    notify('You do not have permission to move this task.');

    return false;
  }

  const eventType = TRANSITION_EVENT[`${task.status}->${to}`];

  if (!eventType) {
    notify(`Invalid transition from "${task.status}" to "${to}".`);

    return false;
  }

  const machine = createTaskMachine(task.id, task.status, task.assigneeId);

  if (!machine.can({ type: eventType })) {
    notify(`Cannot move task from "${task.status}" to "${to}" at this time.`);

    return false;
  }

  try {
    await moveTask(boardSignal, task.id, task.status, to);
    notify(`Task moved to "${to}".`, 'success');

    return true;
  } catch {
    notify('Failed to move task. Please try again.');

    return false;
  }
}

export async function attemptCreateTask(input: NewTask): Promise<string | null> {
  if (!canCreateTask()) {
    notify('You do not have permission to create tasks.');

    return null;
  }

  const id = await createTask(boardSignal, input);

  notify('Task created.', 'success');

  return id;
}

/**
 * Edits a task's non-status fields, then moves it through the FSM if `patch.status` differs
 * from the task's current status. Returns `false` if either step was rejected.
 */
export async function attemptEditTask(task: Task, patch: Partial<Task>): Promise<boolean> {
  if (!canUpdateTask(task)) {
    notify('You do not have permission to edit this task.');

    return false;
  }

  const { status: nextStatus, ...rest } = patch;
  const statusChanged = nextStatus !== undefined && nextStatus !== task.status;

  if (Object.keys(rest).length > 0) {
    await editTask(boardSignal, task.id, rest);
  }

  // A status change already toasts via attemptMoveTask — only toast here otherwise,
  // so a single save never produces two success notifications.
  if (statusChanged) return attemptMoveTask({ ...task, ...rest }, nextStatus);

  notify('Task updated.', 'success');

  return true;
}

export async function attemptDeleteTask(task: Task): Promise<boolean> {
  if (!canDeleteTask(task)) {
    notify('You do not have permission to delete this task.');

    return false;
  }

  await deleteTask(boardSignal, task.id);
  notify('Task deleted.', 'success');

  return true;
}
