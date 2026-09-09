import { computed, resource } from '@vielzeug/ripple';
import { fetchOrdersRequest } from './api';
import { currentUser } from './auth';
import type { Order } from './types';

// The current user's order list, driven by a `resource()` whose source reads
// `currentUser.value.id`. When the user switches, the previous in-flight load is
// aborted (its `AbortSignal` is cancelled) and a fresh one starts — so a slow
// response for the old user can never overwrite the new user's list. While a refetch
// is pending we surface the `previous` snapshot so the UI never flashes empty.
const ordersResource = resource(
  () => currentUser.value.id,
  (userId, context) => fetchOrdersRequest(userId, context.signal),
  { name: 'orders' },
);

export const ordersSignal = computed<Order[]>(() => {
  const state = ordersResource.value;

  return state.status === 'success' ? state.value : (state.previous ?? []);
});

export const ordersLoading = computed<boolean>(() => ordersResource.value.status === 'pending');

// Every order across every customer (admin view). Not keyed by user, so the source is
// a constant — it loads once and is refreshed explicitly via `reload()` after writes.
const allOrdersResource = resource(
  () => null,
  (_source, context) => fetchOrdersRequest(undefined, context.signal),
  { name: 'all-orders' },
);

export const allOrdersSignal = computed<Order[]>(() => {
  const state = allOrdersResource.value;

  return state.status === 'success' ? state.value : (state.previous ?? []);
});

/**
 * Revalidates both the current user's order list and the all-orders list after the mock
 * API changes. The mutating request helpers (`placeOrderRequest` / `updateOrderStatusRequest`)
 * already invalidate the `['orders']` cache prefix, so each `reload()` here is a guaranteed
 * cache miss and re-fetches from the in-memory server rather than returning stale cached data.
 */
export function refreshOrders(): void {
  ordersResource.reload();
  allOrdersResource.reload();
}
