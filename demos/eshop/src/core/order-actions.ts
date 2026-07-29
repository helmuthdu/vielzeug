import type { Order, OrderStatus } from './types';

import { courier, placeOrderRequest, updateOrderStatusRequest } from './api';
import { currentUser, getPrincipal, ward } from './auth';
import { bus } from './events';
import { formatOrderStatus } from './format';
import { t } from './i18n';
import { logger } from './logger';
import { invalidateMyOrders } from './orders';

type OrderAction = 'cancel' | 'create' | 'read' | 'updateStatus';

function notify(message: string, variant: 'error' | 'info' | 'success' = 'error'): void {
  bus.emit('toast:show', { message, variant });

  if (variant === 'error') logger.warn(message);
  else logger.info(message);
}

function explainOrderAction(action: OrderAction, order?: Order): ReturnType<typeof ward.explain> {
  return ward.explain({ action, data: order, principal: getPrincipal(currentUser.value), resource: 'order' });
}

/** The `ward` policy alone only checks ownership (see `core/auth.ts`) — it has no notion of an
 * order's current lifecycle state, so a cancelled order still "passes" a bare permission check.
 * Guarding the terminal state here (rather than teaching `ward` about it) keeps the RBAC policy
 * about *who* can act, and this domain rule about *when* the action still makes sense. */
export function canCancelOrder(order: Order): boolean {
  return order.status !== 'cancelled' && explainOrderAction('cancel', order).allowed;
}

export function canUpdateOrderStatus(order: Order): boolean {
  return explainOrderAction('updateStatus', order).allowed;
}

/**
 * Places an order via a `@vielzeug/courier` mutation (loading/error state tracking + retries for
 * free) after a `@vielzeug/ward` permission check. The order's user id is read fresh at mutate
 * time (not captured once at module scope) so `invalidateMyOrders()` always targets whoever is
 * `currentUser` right now, even if Settings' user-switcher changed it mid-session.
 */
const placeOrderMutation = courier.mutation((order: Order) => placeOrderRequest(order), {
  onSuccess: (order) => {
    invalidateMyOrders();
    bus.emit('order:placed', { orderId: order.id });
  },
});

export async function attemptPlaceOrder(order: Order): Promise<Order | null> {
  if (!explainOrderAction('create').allowed) {
    notify(t('orders.notify.noPermissionPlace'));

    return null;
  }

  try {
    const placed = await placeOrderMutation.mutate(order);

    notify(t('orders.notify.placeSuccess'), 'success');

    return placed;
  } catch {
    notify(t('orders.notify.placeError'));

    return null;
  }
}

export async function attemptCancelOrder(order: Order): Promise<boolean> {
  if (!canCancelOrder(order)) {
    notify(t('orders.notify.noPermissionCancel'));

    return false;
  }

  try {
    await updateOrderStatusRequest(order.id, 'cancelled');
    invalidateMyOrders();
    courier.query.invalidate(['orders']);
    bus.emit('order:status-changed', { orderId: order.id, status: 'cancelled' });
    notify(t('orders.notify.cancelSuccess'), 'success');

    return true;
  } catch {
    notify(t('orders.notify.cancelError'));

    return false;
  }
}

export async function attemptUpdateOrderStatus(order: Order, status: OrderStatus): Promise<boolean> {
  if (!canUpdateOrderStatus(order)) {
    notify(t('orders.notify.noPermissionUpdate'));

    return false;
  }

  try {
    await updateOrderStatusRequest(order.id, status);
    courier.query.invalidate(['orders']);
    bus.emit('order:status-changed', { orderId: order.id, status });
    notify(t('orders.notify.updateSuccess', { status: formatOrderStatus(status) }), 'success');

    return true;
  } catch {
    notify(t('orders.notify.updateError'));

    return false;
  }
}

/**
 * Applies one status to every order in `orders` the current principal is allowed to update, in
 * parallel, then emits a single aggregated toast instead of one per order — Admin's bulk-select
 * toolbar action (see `ui/views/admin.ts`). Silently skips orders the current principal can't
 * touch rather than failing the whole batch; returns how many actually updated.
 */
export async function attemptBulkUpdateOrderStatus(orders: Order[], status: OrderStatus): Promise<number> {
  const updatable = orders.filter((order) => canUpdateOrderStatus(order));

  if (updatable.length === 0) return 0;

  try {
    await Promise.all(updatable.map((order) => updateOrderStatusRequest(order.id, status)));

    courier.query.invalidate(['orders']);

    for (const order of updatable) bus.emit('order:status-changed', { orderId: order.id, status });

    notify(t('admin.bulkUpdated', { count: updatable.length }), 'success');

    return updatable.length;
  } catch {
    notify(t('orders.notify.updateError'));

    return 0;
  }
}
