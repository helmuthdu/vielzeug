import { effect, signal } from '@vielzeug/ripple';

import type { Order } from './types';

import { courier, fetchOrdersRequest } from './api';
import { currentUser } from './auth';

/**
 * Reactive "my orders" list. Unlike `core/catalog.ts`'s static model directory, the query key
 * here is per-user (`['orders', userId]`) and must be re-observed whenever Settings' user
 * switcher changes `currentUser` — so this reads the query cache's `SyncStore` directly
 * (`store.peek()` / `store.subscribe()`) inside an `effect()` that tears down the previous
 * subscription before creating the next one, rather than a single fixed `fromQuery` binding.
 */
export const ordersSignal = signal<Order[]>([]);

export const ordersLoading = signal<boolean>(true);

effect(() => {
  const userId = currentUser.value.id;

  const store = courier.query.observe<Order[]>({
    fn: () => fetchOrdersRequest(userId),
    key: ['orders', userId],
    staleTime: 15_000,
  });

  const sync = (): void => {
    const state = store.peek();

    ordersSignal.value = state.data ?? [];
    ordersLoading.value = state.isLoading;
  };

  sync();

  const unsubscribe = store.subscribe(sync);

  return unsubscribe;
});

/** Invalidates the current user's order query so the next read refetches from the mock API. */
export function invalidateMyOrders(): void {
  courier.query.invalidate(['orders', currentUser.value.id]);
}

// ---------------------------------------------------------------------------
// Admin/sales — every order across every customer. A fixed, global query key (no per-user
// re-observe dance needed like `ordersSignal` above), used by the Admin dashboard's
// `@vielzeug/sourcerer` + `@vielzeug/prism` reporting.
// ---------------------------------------------------------------------------

const allOrdersStore = courier.query.observe<Order[]>({
  fn: () => fetchOrdersRequest(),
  key: ['orders', 'all'],
  staleTime: 15_000,
});

export const allOrdersSignal = signal<Order[]>(allOrdersStore.peek().data ?? []);

allOrdersStore.subscribe(() => {
  allOrdersSignal.value = allOrdersStore.peek().data ?? [];
});
