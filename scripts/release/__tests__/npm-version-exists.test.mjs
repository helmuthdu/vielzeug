import { describe, expect, it } from 'vitest';

import { versionExists } from '../npm-version-exists.mjs';

describe('versionExists()', () => {
  it('returns true for a 200 response', async () => {
    const fetchImpl = async () => ({ status: 200 });
    expect(await versionExists('@vielzeug/ore', '1.0.4', { fetchImpl })).toBe(true);
  });

  it('returns false for a 404 response', async () => {
    const fetchImpl = async () => ({ status: 404 });
    expect(await versionExists('@vielzeug/ore', '99.99.99', { fetchImpl })).toBe(false);
  });

  it('throws on an unexpected status so callers do not silently treat it as "not published"', async () => {
    const fetchImpl = async () => ({ status: 500 });
    await expect(versionExists('@vielzeug/ore', '1.0.4', { fetchImpl })).rejects.toThrow('500');
  });

  it('requests the registry with an encoded path and bounded timeout signal', async () => {
    let request;
    const fetchImpl = async (url, options) => {
      request = { options, url };
      return { status: 404 };
    };

    await versionExists('@vielzeug/ore', '1.0.4', { fetchImpl, timeout: 1_000 });
    expect(request.url).toBe('https://registry.npmjs.org/%40vielzeug%2Fore/1.0.4');
    expect(request.options.method).toBe('GET');
    expect(request.options.signal).toBeInstanceOf(AbortSignal);
  });
});
