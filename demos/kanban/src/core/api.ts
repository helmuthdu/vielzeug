import { createCourier } from '@vielzeug/courier';

import type { User } from './types';

import { seedUsers } from './seed-data';

// ---------------------------------------------------------------------------
// In-memory "server" state
// ---------------------------------------------------------------------------

const users: User[] = [...seedUsers];

// ---------------------------------------------------------------------------
// Mock fetch — simulates a read-only user directory endpoint. The board itself is
// edited entirely client-side through history.ts's ledger (instant, undoable) and
// persisted locally via vault (persistence.ts); only the user directory is modeled
// as network-fetched reference data, since that's the realistic shape of "user list"
// in a real app and gives `@vielzeug/courier`'s query cache something genuine to cache.
// ---------------------------------------------------------------------------

async function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url;

  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
      status,
    });
  }

  if (url === '/api/users') return json(users);

  return json({ error: 'Not found' }, 404);
}

// ---------------------------------------------------------------------------
// Courier instance
// ---------------------------------------------------------------------------

export const courier = createCourier({ fetch: mockFetch });

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function getUsers(): Promise<User[]> {
  return courier.api.get<User[]>('/api/users');
}
