import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SnapshotCatalog } from '../catalog.js';
import { startHttpHost } from '../http.js';
import { loadSnapshot } from '../snapshot.js';

const roots: string[] = [];

function catalog(): SnapshotCatalog {
  const root = mkdtempSync(join(tmpdir(), 'codex-http-'));
  const directory = join(root, 'snapshots', 'test');

  roots.push(root);
  mkdirSync(join(directory, 'packages'), { recursive: true });
  writeFileSync(join(root, 'current.json'), JSON.stringify({ directory: 'snapshots/test' }));
  writeFileSync(
    join(directory, 'manifest.json'),
    JSON.stringify({
      catalog: 'catalog.json',
      contentDirectory: 'packages',
      refine: null,
      schemaVersion: 1,
      search: 'search.json',
      version: '1.0.0',
    }),
  );
  writeFileSync(join(directory, 'catalog.json'), JSON.stringify({ packages: [], version: '1.0.0' }));
  writeFileSync(join(directory, 'search.json'), '[]');

  return new SnapshotCatalog(loadSnapshot(root));
}

afterEach(async () => {
  const { rmSync } = await import('node:fs');

  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('HTTP host', () => {
  it('binds loopback and exposes health only as host-owned infrastructure', async () => {
    const host = await startHttpHost({ catalog: catalog(), port: 0, version: '1.0.0' });

    try {
      const response = await fetch(`http://${host.host}:${host.port}/health`);

      await expect(response.json()).resolves.toEqual({ status: 'ok', version: '1.0.0' });
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      await host.dispose();
      await expect(host.dispose()).resolves.toBeUndefined();
    }
  });
});
