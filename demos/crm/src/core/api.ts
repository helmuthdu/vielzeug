import { createCourier } from '@vielzeug/courier';
import { crmData, networkStatus } from './store';
import type { CrmData, Opportunity } from './types';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await wait(100 + Math.round(Math.random() * 300));
  const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  if (networkStatus.value === 'offline') throw new TypeError('Simulated network offline');
  if (path === '/api/crm' && (!init?.method || init.method === 'GET')) return Response.json(crmData.value);
  const opportunityMatch = /^\/api\/opportunities\/([^/]+)$/.exec(path);
  if (opportunityMatch && init?.method === 'PATCH') {
    const patch = JSON.parse(String(init.body)) as Partial<Opportunity>;
    const opportunity = crmData.value.opportunities.find((item) => item.id === opportunityMatch[1]);
    if (!opportunity) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ ...opportunity, ...patch });
  }
  return Response.json({ error: 'Not found' }, { status: 404 });
}

export const courier = createCourier({ fetch: mockFetch });
export function fetchCrm(): Promise<CrmData> {
  return courier.get('/api/crm');
}
export function syncOpportunity(id: string, patch: Partial<Opportunity>): Promise<Opportunity> {
  return courier.patch(`/api/opportunities/${id}`, { body: patch });
}
