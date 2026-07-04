import { afterEach, describe, expect, it, vi } from 'vitest';

import { debugCourier } from '../devtools';

describe('debugCourier', () => {
  const jsonResponse = (data: unknown, status = 200) => ({
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a working Courier instance', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

    const client = debugCourier({ baseUrl: 'https://api.example.com', fetch: fetchMock as typeof fetch });

    const result = await client.api.get('/users');

    expect(result).toEqual({ ok: true });

    client.dispose();
  });

  it('logs request/response lines to console.debug via withLogging()', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));

    const client = debugCourier({ baseUrl: 'https://api.example.com', fetch: fetchMock as typeof fetch });

    await client.api.get('/users');

    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET https://api.example.com/users 200'),
      expect.objectContaining({ method: 'GET', status: 200 }),
    );

    client.dispose();
  });
});
