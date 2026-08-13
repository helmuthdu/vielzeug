import { createCourier } from '@vielzeug/courier';
import { models as catalogModels, seedOrders } from './seed-data';
import type { Order, OrderStatus } from './types';

// ---------------------------------------------------------------------------
// In-memory "server" state — the mock endpoints below read/write these arrays,
// exactly like demos/kanban/src/core/api.ts's `users` array models a read-only
// directory. Orders are the one genuinely mutable resource here (placed via
// checkout, cancelled from Order History, status-progressed from Admin).
// ---------------------------------------------------------------------------

const orders: Order[] = [...seedOrders];

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url;
  const [rawPath, search] = rawUrl.split('?');
  const params = new URLSearchParams(search);

  // Courier's `buildUrl()` strips leading slashes off the path before joining it with
  // `baseUrl` (see packages/courier/src/url.ts) — with no `baseUrl` configured here, that
  // leaves the final request URL as e.g. `api/orders`, not `/api/orders`. Normalizing back to
  // a leading slash keeps the route table below readable and conventional, and matches
  // reliably regardless of whether a caller passed a leading slash to a Courier HTTP method.
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
      status,
    });
  }

  if (path === '/api/models') return json(catalogModels);

  if (path === '/api/orders') {
    if (init?.method === 'POST') {
      const order = JSON.parse(String(init.body)) as Order;

      orders.unshift(order);

      return json(order, 201);
    }

    const userId = params.get('userId');
    const visible = userId ? orders.filter((o) => o.userId === userId) : orders;

    return json(visible);
  }

  const statusMatch = /^\/api\/orders\/([^/]+)\/status$/.exec(path);

  if (statusMatch && init?.method === 'PATCH') {
    const [, orderId] = statusMatch;
    const { status } = JSON.parse(String(init.body)) as { status: OrderStatus };
    const order = orders.find((o) => o.id === orderId);

    if (!order) return json({ error: 'Not found' }, 404);

    order.status = status;

    return json(order);
  }

  return json({ error: 'Not found' }, 404);
}

// ---------------------------------------------------------------------------
// Courier instance — single shared transport for every REST call this app makes.
// ---------------------------------------------------------------------------

export const courier = createCourier({ fetch: mockFetch });

// ---------------------------------------------------------------------------
// Convenience request helpers
// ---------------------------------------------------------------------------

export function fetchModelsRequest(): Promise<typeof catalogModels> {
  return courier.get('/api/models');
}

export function fetchOrdersRequest(userId?: string): Promise<Order[]> {
  return courier.get<Order[]>('/api/orders', userId ? { query: { userId } } : undefined);
}

export function placeOrderRequest(order: Order): Promise<Order> {
  return courier.post<Order>('/api/orders', { body: order });
}

export function updateOrderStatusRequest(orderId: string, status: OrderStatus): Promise<Order> {
  return courier.patch<Order>(`/api/orders/${orderId}/status`, { body: { status } });
}
