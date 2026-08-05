import { describe, expect, it, vi } from 'vitest';

import { createCourier } from '../courier';
import { CourierAbortError, CourierDisposedError, CourierNetworkError } from '../errors';

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  );
}

describe('Courier streams', () => {
  it('parses SSE event fields across chunks', async () => {
    const courier = createCourier({
      fetch: vi.fn(async () => streamResponse(['event: update\nid: 1\ndata: {"count":', '2}\n\n'])),
    });

    const events = [];

    for await (const event of courier.events<{ count: number }>('/events')) events.push(event);

    expect(events).toEqual([{ data: { count: 2 }, event: 'update' }]);
  });

  it('sends SSE accept headers while allowing caller overrides', async () => {
    const fetch = vi.fn(async () => streamResponse(['data: hello\n\n']));
    const courier = createCourier({ fetch });

    await courier.events('/events', { headers: { accept: 'application/custom' } }).next();

    expect(fetch).toHaveBeenCalledWith(
      'events',
      expect.objectContaining({
        headers: expect.objectContaining({ accept: 'application/custom', 'cache-control': 'no-cache' }),
      }),
    );
  });

  it('parses NDJSON records and preserves a final unterminated record', async () => {
    const courier = createCourier({
      fetch: vi.fn(async () => streamResponse(['{"id":1}\n{"id":', '2}'])),
    });

    const records = [];

    for await (const record of courier.read<{ id: number }>('/events', { parse: 'ndjson' })) records.push(record);

    expect(records).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('aborts the request when an iterator is returned while blocked on a read', async () => {
    let requestSignal: AbortSignal | undefined;
    const courier = createCourier({
      fetch: vi.fn<typeof globalThis.fetch>(
        (_, init) =>
          new Promise<Response>((_, reject) => {
            requestSignal = init?.signal ?? undefined;
            requestSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    });
    const iterator = courier.events('/events');
    const pending = iterator.next();

    await vi.waitFor(() => expect(requestSignal).toBeDefined());
    void iterator.return?.();

    expect(requestSignal!.aborted).toBe(true);
    await expect(pending).rejects.toBeInstanceOf(CourierAbortError);
  });

  it('rejects streams created after client disposal', async () => {
    const courier = createCourier();

    courier.dispose();

    await expect(courier.events('/events').next()).rejects.toBeInstanceOf(CourierDisposedError);
  });

  it('normalizes stream network failures', async () => {
    const courier = createCourier({ fetch: vi.fn(async () => Promise.reject(new Error('offline'))) });

    await expect(courier.read('/events').next()).rejects.toBeInstanceOf(CourierNetworkError);
  });
});
