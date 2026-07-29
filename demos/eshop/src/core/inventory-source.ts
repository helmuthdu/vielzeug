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
    limit: pageSize,
    searchFn: (items, query) => {
      const q = query.trim().toLowerCase();

      if (!q) return items;

      return items.filter(
        (order) =>
          order.id.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q) ||
          order.items.some((i) => i.modelName.toLowerCase().includes(q)),
      );
    },
  });
}
