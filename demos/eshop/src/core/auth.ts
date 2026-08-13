import { signal } from '@vielzeug/ripple';
import type { Principal } from '@vielzeug/ward';
import { allow, createWard, owns } from '@vielzeug/ward';
import { seedUsers } from './seed-data';
import type { Order, User } from './types';

export type OrderAction = 'cancel' | 'create' | 'read' | 'updateStatus';

export const ward = createWard<OrderAction, Order>([
  // admin: full access to every order action.
  ...allow('admin', 'order', ['create', 'read', 'cancel', 'updateStatus']),

  // sales: read every order and progress its status, but never place or cancel one on a
  // customer's behalf — that stays a self-service (or admin override) action.
  ...allow('sales', 'order', ['read', 'updateStatus']),

  // customer: can always place a new order (there's no `data` to own yet at that point), but
  // may only read/cancel orders they themselves placed.
  ...allow('customer', 'order', ['create']),
  ...allow<OrderAction, Order>('customer', 'order', ['read', 'cancel'], { when: owns('userId') }),
]);

/** Starts as the seed customer — Settings lets you switch roles to see ward's effect live. */
export const currentUser = signal<User>(seedUsers[0]);

export function getPrincipal(user: User): Principal {
  return { id: user.id, roles: [user.role] };
}

/**
 * General "can view the admin/all-orders area" gate, reused by the navbar's Admin link, the
 * command palette, and the `/admin` route guard. Reuses the same `order`/`read` ward rules
 * above with no `data` — admin/sales have no `when` guard so they're allowed unconditionally;
 * customer's `owns('userId')` guard can't match without a concrete order, so it falls through
 * to "no-matching-rule" and correctly resolves to `false`.
 */
export function canAccessAdmin(): boolean {
  return ward.explain({ action: 'read', principal: getPrincipal(currentUser.value), resource: 'order' }).allowed;
}
