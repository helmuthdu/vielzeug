import type { Order } from './types';

/**
 * Search predicate for the admin orders table — matches order ID, status, or item model names
 * against the given query string.
 */
export function matchOrder(order: Order, search: string): boolean {
  const query = search.trim().toLowerCase();

  return (
    order.id.toLowerCase().includes(query) ||
    order.status.toLowerCase().includes(query) ||
    order.items.some((item) => item.modelName.toLowerCase().includes(query))
  );
}
