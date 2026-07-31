import { effect, signal } from '@vielzeug/ripple';

import type { Order } from './types';

import { courier, fetchOrdersRequest } from './api';
import { currentUser } from './auth';

/**
 * Reactive "my orders" list. Unlike `core/catalog.ts`'s static model directory, the query key
 * here is per-user (`['orders', userId]`) and must be re-observed whenever Settings' user
 * switcher changes `currentUser` — so this creates a new query handle inside an `effect()` and
 * tears down its subscription before creating the next one, rather than a single fixed binding.
 */
export const ordersSignal = signal<Order[]>([]);

export const ordersLoading = signal<boolean>(true);

effect(() => {
  const userId = currentUser.value.id;

  const query = courier.queries.create<Order[]>({
    fetch: () => fetchOrdersRequest(userId),
    key: ['orders', userId],
    staleTime: 15_000,
  });

  const sync = (): void => {
    const state = query.getSnapshot();

    ordersSignal.value = state.data ?? [];
    ordersLoading.value = state.isFetching;
  };

  sync();

  query.subscribe(sync);
  void query.fetch();

  return () => query.dispose();
});

/** Revalidates every cached order list after the mock API changes. */
export function refreshOrders(): void {
  courier.queries.invalidate(['orders']);
  courier.queries.refetchStale();
}

// ---------------------------------------------------------------------------
// Admin/sales — every order across every customer. A fixed, global query key (no per-user
// re-observe dance needed like `ordersSignal` above), used by the Admin dashboard's
// `@vielzeug/sourcerer` + `@vielzeug/prism` reporting.
// ---------------------------------------------------------------------------

const allOrdersQuery = courier.queries.create<Order[]>({
  fetch: () => fetchOrdersRequest(),
  key: ['orders', 'all'],
  staleTime: 15_000,
});

export const allOrdersSignal = signal<Order[]>(allOrdersQuery.getSnapshot().data ?? []);

allOrdersQuery.subscribe(() => {
  allOrdersSignal.value = allOrdersQuery.getSnapshot().data ?? [];
});
void allOrdersQuery.fetch();
