import { CourierNetworkError, createCourier } from '@vielzeug/courier';
import { createPostmaster, defineJobs } from '../index.ts';
import { createMemoryPostmasterStore } from '../testing.ts';

const objectValidator = (value: unknown) => {
  if (typeof value !== 'object' || value === null || !('id' in value) || !('title' in value)) {
    throw new Error('invalid payload');
  }
  return value as { id: string; title: string };
};

describe('Postmaster ecosystem integration', () => {
  it('delivers a Courier request and surfaces the remote call', async () => {
    const fetchMock = vi.fn(
      async (_input: unknown, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' }, status: 200 }),
    );
    const courier = createCourier({ baseUrl: 'https://api.example.com', fetch: fetchMock as unknown as typeof fetch });

    const jobs = defineJobs({
      createTodo: {
        execute: async (payload, { key, signal }) => {
          await courier.request('/todos', {
            body: payload,
            headers: { 'Idempotency-Key': key },
            method: 'POST',
            signal,
          });
        },
        key: (payload: unknown) => (payload as { id: string }).id,
        retry: { maxAttempts: 3, shouldRetry: (error) => error instanceof CourierNetworkError },
        validate: objectValidator,
        version: 1,
      },
    });

    const store = createMemoryPostmasterStore();
    const postmaster = createPostmaster({ jobs, store });

    await postmaster.enqueue('createTodo', { id: 'todo-1', title: 'Buy milk' });
    await expect(postmaster.flush()).resolves.toMatchObject({ completed: 1, processed: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ 'idempotency-key': 'todo-1' });

    await courier.dispose();
    await postmaster.dispose();
  });

  it('retries CourierNetworkError and succeeds on the second attempt', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network down');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    });
    const courier = createCourier({ baseUrl: 'https://api.example.com', fetch: fetchMock as unknown as typeof fetch });

    const jobs = defineJobs({
      createTodo: {
        execute: async (payload, { key, signal }) => {
          await courier.request('/todos', {
            body: payload,
            headers: { 'Idempotency-Key': key },
            method: 'POST',
            signal,
          });
        },
        key: (payload: unknown) => (payload as { id: string }).id,
        retry: { delay: () => 1000, maxAttempts: 3, shouldRetry: (error) => error instanceof CourierNetworkError },
        validate: objectValidator,
        version: 1,
      },
    });

    let now = 0;
    const store = createMemoryPostmasterStore();
    const postmaster = createPostmaster({ clock: () => now, jobs, store });

    await postmaster.enqueue('createTodo', { id: 'todo-1', title: 'Buy milk' });
    await expect(postmaster.flush()).resolves.toMatchObject({ retryScheduled: 1 });
    now = 1000;
    await expect(postmaster.flush()).resolves.toMatchObject({ completed: 1 });
    expect(calls).toBe(2);

    await courier.dispose();
    await postmaster.dispose();
  });
});
