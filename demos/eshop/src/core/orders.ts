import { effect, signal } from '@vielzeug/ripple';
import { courier, fetchOrdersRequest } from './api';
import { currentUser } from './auth';
import type { Order } from './types';

export const ordersSignal = signal<Order[]>([]);
export const ordersLoading = signal<boolean>(true);

effect(() => {
  const userId = currentUser.value.id;
  const key = ['orders', userId] as const;
  const definition = {
    fetch: () => fetchOrdersRequest(userId),
    key,
    staleTime: 15_000,
  };
  const sync = (): void => {
    const state = courier.queries.getSnapshot<Order[]>(key);

    ordersSignal.value = state?.data ?? [];
    ordersLoading.value = state?.isFetching ?? true;
  };
  const unsubscribe = courier.queries.subscribe(key, sync);

  sync();
  void courier.queries.fetch(definition);

  return unsubscribe;
});

/** Revalidates every cached order list after the mock API changes. */
export function refreshOrders(): void {
  courier.queries.invalidate(['orders'], { refetch: true });
}

const allOrdersKey = ['orders', 'all'] as const;
const allOrdersDefinition = {
  fetch: () => fetchOrdersRequest(),
  key: allOrdersKey,
  staleTime: 15_000,
};

export const allOrdersSignal = signal<Order[]>([]);

courier.queries.subscribe(allOrdersKey, () => {
  allOrdersSignal.value = courier.queries.getSnapshot<Order[]>(allOrdersKey)?.data ?? [];
});
void courier.queries.fetch(allOrdersDefinition);
