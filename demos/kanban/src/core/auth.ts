import type { Principal } from '@vielzeug/ward';

import { signal } from '@vielzeug/ripple';
import { allow, createWard, owns, predicate } from '@vielzeug/ward';

import type { Task } from './types';
import type { User } from './types';

import { seedUsers } from './seed-data';

type TaskAction = 'create' | 'delete' | 'move' | 'read' | 'update';

// Owner (created it) or assignee (doing the work) — either can edit. Seed data's `ownerId` is
// mostly Alice regardless of who a task is actually assigned to (see seed-data.ts), so an
// owner-only rule here left every other member unable to edit tasks assigned to them — the
// board's whole point (assign someone, they work on it) didn't hold up past "read-only".
const isOwnerOrAssignee = predicate.or<Task>(owns('ownerId'), owns('assigneeId'));

export const ward = createWard<TaskAction, Task>([
  // admin: full access to all task actions
  ...allow('admin', 'task', ['create', 'delete', 'move', 'read', 'update']),

  // member: create, read, move freely
  ...allow('member', 'task', ['create', 'move', 'read']),

  // member: update tasks they own or are assigned to; delete only tasks they own — deletion is
  // destructive and irreversible (task-dialog.ts's `attemptDeleteTask` comment), so it stays
  // scoped to whoever created the task, not whoever's merely working on it.
  ...allow<TaskAction, Task>('member', 'task', ['update'], { when: isOwnerOrAssignee }),
  ...allow<TaskAction, Task>('member', 'task', ['delete'], { when: owns('ownerId') }),

  // viewer: read only
  ...allow('viewer', 'task', ['read']),
]);

export const currentUser = signal<User>(seedUsers[0]);

export function getPrincipal(user: User): Principal {
  return { id: user.id, roles: [user.role] };
}
