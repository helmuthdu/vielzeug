import { format as formatDate, parsePlainDate, Temporal } from '@vielzeug/tempo';

import type { OrderStatus, PaymentMethod } from './types';

import { t } from './i18n';

const ORDER_STATUS_KEYS: Record<OrderStatus, string> = {
  cancelled: 'orders.status.cancelled',
  delivered: 'orders.status.delivered',
  'in-transit': 'orders.status.inTransit',
  placed: 'orders.status.placed',
  processing: 'orders.status.processing',
};

const PAYMENT_METHOD_KEYS: Record<PaymentMethod, string> = {
  cash: 'checkout.payment.methodCash',
  financing: 'checkout.payment.methodFinancing',
  lease: 'checkout.payment.methodLease',
};

/** Translates an `OrderStatus` enum value for display — never render the raw kebab-case value. */
export function formatOrderStatus(status: OrderStatus): string {
  return t(ORDER_STATUS_KEYS[status]);
}

/** Translates a `PaymentMethod` enum value for display — mirrors the payment step's own radio labels. */
export function formatPaymentMethod(method: PaymentMethod): string {
  return t(PAYMENT_METHOD_KEYS[method]);
}

/** Business-day-ish delivery estimate: today + `leadDays` calendar days, as an ISO date string. */
export function estimateDeliveryDate(leadDays = 21): string {
  return Temporal.Now.plainDateISO().add({ days: leadDays }).toString();
}

/** Renders an ISO (`yyyy-MM-dd`) date as e.g. `Aug 11, 2026`. */
export function formatLongDate(iso: string): string {
  return formatDate(parsePlainDate(iso.slice(0, 10)), {
    intl: { day: 'numeric', month: 'long', year: 'numeric' },
    tz: 'UTC',
  });
}

/** Renders an ISO date/date-time string as e.g. `Jul 20`. */
export function formatShortDate(iso: string): string {
  return formatDate(parsePlainDate(iso.slice(0, 10)), { intl: { day: 'numeric', month: 'short' }, tz: 'UTC' });
}
