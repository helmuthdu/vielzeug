import { placeOrderRequest, updateOrderStatusRequest } from './api';
import { currentUser, getPrincipal, ward } from './auth';
import { bus } from './events';
import { formatOrderStatus } from './format';
import { t } from './i18n';
import { logger } from './logger';
import { refreshOrders } from './orders';
import type { Order, OrderStatus } from './types';

type OrderAction = 'cancel' | 'create' | 'read' | 'updateStatus';

function notify(message: string, variant: 'error' | 'info' | 'success' = 'error'): void {
  bus.emit('toast:show', { message, variant });

  if (variant === 'error') logger.warn(message);
  else logger.info(message);
}

function decideOrderAction(action: OrderAction, order?: Order): boolean {
  return (
    ward.decide({
      action,
      attributes: order ? { userId: order.userId } : undefined,
      principal: getPrincipal(currentUser.value),
      resource: 'order',
    }).effect === 'allow'
  );
}

/** The `ward` policy alone only checks ownership (see `core/auth.ts`) — it has no notion of an
 * order's current lifecycle state, so a cancelled order still "passes" a bare permission check.
 * Guarding the terminal state here (rather than teaching `ward` about it) keeps the RBAC policy
 * about *who* can act, and this domain rule about *when* the action still makes sense. */
export function canCancelOrder(order: Order): boolean {
  return order.status !== 'cancelled' && decideOrderAction('cancel', order);
}

export function canUpdateOrderStatus(order: Order): boolean {
  return decideOrderAction('updateStatus', order);
}

/**
 * Places an order via a direct `@vielzeug/courier` request after a `@vielzeug/ward` permission
 * check. The order's user id is read fresh at request
 * time (not captured once at module scope) so refreshes include the currently selected user's
 * order list even if Settings' user-switcher changed it mid-session.
 */
export async function attemptPlaceOrder(order: Order): Promise<Order | null> {
  if (!decideOrderAction('create')) {
    notify(t('orders.notify.noPermissionPlace'));

    return null;
  }

  try {
    const placed = await placeOrderRequest(order);

    bus.emit('order:placed', { orderId: placed.id });
    refreshOrders();
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
    refreshOrders();
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
    refreshOrders();
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

  // `allSettled` so a single failed patch can't skip `refreshOrders()` and leave the
  // UI stale for the patches that did land — the mock server has already mutated for
  // those, so we always revalidate and report how many actually succeeded.
  const results = await Promise.allSettled(updatable.map((order) => updateOrderStatusRequest(order.id, status)));

  refreshOrders();

  let succeeded = 0;
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    succeeded++;
    bus.emit('order:status-changed', { orderId: updatable[index].id, status });
  });

  if (succeeded === 0) {
    notify(t('orders.notify.updateError'));
  } else {
    notify(t('admin.bulkUpdated', { count: succeeded }), 'success');
  }

  return succeeded;
}
