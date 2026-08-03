import { createLocalSource } from '@vielzeug/sourcerer';

import type { Order } from './types';

/**
 * Paginated + searchable admin order source — every order across every customer, which is the
 * one list in this app realistically large enough to justify `@vielzeug/sourcerer` +
 * `@vielzeug/scroll` virtualization (a single customer's own order history is small; see
 * `ui/views/orders.ts`, which renders that list plainly instead).
 */
export function createOrdersSource(orders: Order[], pageSize = 25): ReturnType<typeof createLocalSource<Order>> {
  return createLocalSource<Order>(orders, {
    initialQuery: { pageSize },
    match: (order, search) => {
      const query = search.trim().toLowerCase();

      return (
        order.id.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query) ||
        order.items.some((item) => item.modelName.toLowerCase().includes(query))
      );
    },
  });
}
