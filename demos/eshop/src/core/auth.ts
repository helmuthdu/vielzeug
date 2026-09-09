import { signal } from '@vielzeug/ripple';
import type { Principal } from '@vielzeug/ward';
import { allow, createWard, predicate } from '@vielzeug/ward';
import { seedUsers } from './seed-data';
import type { User } from './types';

export type OrderAction = 'cancel' | 'create' | 'read' | 'updateStatus';

/**
 * Ward rules for the `order` resource. `allow(role, resource, actions)` builds one rule per
 * action with a built-in role check; `predicate.owns('userId')` is the ownership escape-hatch
 * for the customer's read/cancel rules — Ward passes the order's `userId` through `attributes`,
 * so ownership is `attributes?.userId === principal.id`.
 */
export const ward = createWard<OrderAction, 'order'>([
  // admin: full access to every order action.
  allow<OrderAction, 'order'>('admin', 'order', ['create', 'read', 'cancel', 'updateStatus']),

  // sales: read every order and progress its status, but never place or cancel one on a
  // customer's behalf — that stays a self-service (or admin override) action.
  allow<OrderAction, 'order'>('sales', 'order', ['read', 'updateStatus']),

  // customer: can always place a new order (there's no order to own yet at that point), but
  // may only read/cancel orders they themselves placed.
  allow<OrderAction, 'order'>('customer', 'order', ['create']),
  allow<OrderAction, 'order'>('customer', 'order', ['read', 'cancel'], { when: predicate.owns('userId') }),
]);

/** Starts as the seed customer — Settings lets you switch roles to see ward's effect live. */
export const currentUser = signal<User>(seedUsers[0]);

export function getPrincipal(user: User): Principal {
  return { id: user.id, roles: [user.role] };
}

/**
 * General "can view the admin/all-orders area" gate, reused by the navbar's Admin link, the
 * command palette, and the `/admin` route guard. Reuses the same `order`/`read` ward rules
 * above with no `attributes` — admin/sales have no ownership guard so they're allowed
 * unconditionally; customer's ownership guard can't match without a concrete order's `userId`,
 * so it falls through to "no-matching-rule" and correctly resolves to `deny`.
 */
export function canAccessAdmin(): boolean {
  return (
    ward.decide({ action: 'read', principal: getPrincipal(currentUser.value), resource: 'order' }).effect === 'allow'
  );
}
