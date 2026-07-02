/**
 * CLI entry point tests. `main()` is exported from cli.ts specifically so these can call it
 * directly with a synthetic argv instead of spawning a subprocess. `process.exit` is mocked
 * throughout — it is a `never`-returning stub so control flow after it in the tested code path
 * never actually continues.
 */
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { main } from '../cli.js';

const packageVersion = (
  JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8')) as {
    version: string;
  }
).version;

/** Binds an ephemeral port, immediately releases it, and returns the port number for reuse. */
async function getFreePort(): Promise<number> {
  const probe = createHttpServer();

  return new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, () => {
      const addr = probe.address();

      probe.close(() => {
        if (addr && typeof addr === 'object') resolve(addr.port);
        else reject(new Error('could not get a free port'));
      });
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('main — --help', () => {
  it.each(['--help', '-h'])('%s prints usage and does not exit', async (flag) => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main([flag]);

    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Usage: codex'));
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('main — --version', () => {
  it.each(['--version', '-v'])('%s prints the package version to stdout', async (flag) => {
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await main([flag]);

    expect(stdout).toHaveBeenCalledWith(`${packageVersion}\n`);
  });
});

describe('main — argument errors', () => {
  it('exits 1 with a usage message for an unrecognised flag', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main(['--bogus']);

    expect(stderr.mock.calls.some(([msg]) => String(msg).startsWith('error:'))).toBe(true);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits 1 with a descriptive message for an out-of-range --port', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main(['--port', 'not-a-number']);

    expect(stderr.mock.calls.some(([msg]) => String(msg).includes('Invalid --port'))).toBe(true);
    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe('main — HTTP mode', () => {
  it('starts an HTTP server on --port and serves /health, then shuts down on SIGTERM', async () => {
    const port = await getFreePort();
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await main(['--port', String(port)]);

    try {
      const res = await fetch(`http://localhost:${port}/health`);

      expect(res.status).toBe(200);
    } finally {
      process.emit('SIGTERM');
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    }

    await expect(fetch(`http://localhost:${port}/health`)).rejects.toThrow();
  });

  it('exits 1 with EADDRINUSE detail when the port is already bound', async () => {
    const port = await getFreePort();
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await main(['--port', String(port)]);

    try {
      await main(['--port', String(port)]);

      expect(stderr.mock.calls.some(([msg]) => String(msg).includes('already in use'))).toBe(true);
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      process.emit('SIGTERM');
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    }
  });
});
