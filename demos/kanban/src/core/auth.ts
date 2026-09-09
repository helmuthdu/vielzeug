import { signal } from '@vielzeug/ripple';
import type { Principal } from '@vielzeug/ward';
import { allow, createWard, predicate } from '@vielzeug/ward';
import { seedUsers } from './seed-data';
import type { User } from './types';

type TaskAction = 'create' | 'delete' | 'move' | 'read' | 'update';

/**
 * Ward rules for the `task` resource. `allow(role, resource, actions)` builds one rule per
 * action with a built-in role check; `predicate.owns('ownerId')` / `predicate.owns('assigneeId')`
 * are the ownership escape-hatches — Ward passes the task's `ownerId`/`assigneeId` through
 * `attributes`, so ownership is `attributes?.<id> === principal.id`.
 *
 * Owner (created it) or assignee (doing the work) — either can edit. Seed data's `ownerId` is
 * mostly Alice regardless of who a task is actually assigned to (see seed-data.ts), so an
 * owner-only rule here left every other member unable to edit tasks assigned to them — the
 * board's whole point (assign someone, they work on it) didn't hold up past "read-only".
 */
export const ward = createWard<TaskAction, 'task'>([
  // admin: full access to all task actions.
  allow<TaskAction, 'task'>('admin', 'task', ['create', 'delete', 'move', 'read', 'update']),

  // member: create, read, move freely.
  allow<TaskAction, 'task'>('member', 'task', ['create', 'read', 'move']),

  // member: update tasks they own or are assigned to; delete only tasks they own — deletion is
  // destructive and irreversible (task-dialog.ts's `attemptDeleteTask` comment), so it stays
  // scoped to whoever created the task, not whoever's merely working on it.
  allow<TaskAction, 'task'>('member', 'task', ['update'], {
    when: predicate.or(predicate.owns('ownerId'), predicate.owns('assigneeId')),
  }),
  allow<TaskAction, 'task'>('member', 'task', ['delete'], { when: predicate.owns('ownerId') }),

  // viewer: read only.
  allow<TaskAction, 'task'>('viewer', 'task', ['read']),
]);

export const currentUser = signal<User>(seedUsers[0]);

export function getPrincipal(user: User): Principal {
  return { id: user.id, roles: [user.role] };
}
