import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import type { Catalog } from '../catalog.js';
import { detectConsumer } from '../consumer.js';
import { packageTools } from '../tools/packages.js';

const root = mkdtempSync(join(tmpdir(), 'codex-consumer-'));

afterAll(() => {
  rmSync(root, { force: true, recursive: true });
});

function project(name: string, manifest: unknown, lock?: { file: string; text: string }): string {
  const dir = join(root, name);

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest));

  if (lock) writeFileSync(join(dir, lock.file), lock.text);

  return dir;
}

describe('detectConsumer', () => {
  it('reads declared ranges and bun.lock resolutions, walking up to the manifest', () => {
    const dir = project(
      'bun',
      { dependencies: { '@vielzeug/lingua': '0.6.0', '@vielzeug/tavern': 'link:../tavern' }, name: 'demo' },
      {
        file: 'bun.lock',
        text: JSON.stringify({
          packages: {
            '@vielzeug/lingua': ['@vielzeug/lingua@0.6.0', {}],
            '@vielzeug/tavern': ['@vielzeug/tavern@link:../tavern', {}],
          },
        }),
      },
    );

    const consumer = detectConsumer(join(dir, 'src', 'app'));

    expect(consumer?.projectDir).toBe(dir);
    expect(consumer?.packages).toEqual([
      { declared: '0.6.0', installed: '0.6.0', name: '@vielzeug/lingua' },
      { declared: 'link:../tavern', installed: undefined, name: '@vielzeug/tavern' },
    ]);
  });

  it('falls back to package-lock.json resolutions', () => {
    const dir = project(
      'npm',
      { dependencies: { '@vielzeug/scout': '^0.4.1' }, name: 'demo' },
      {
        file: 'package-lock.json',
        text: JSON.stringify({ packages: { 'node_modules/@vielzeug/scout': { version: '0.4.3' } } }),
      },
    );

    expect(detectConsumer(dir)?.packages).toEqual([
      { declared: '^0.4.1', installed: '0.4.3', name: '@vielzeug/scout' },
    ]);
  });

  it('returns undefined outside a Vielzeug consumer', () => {
    const dir = project('plain', { dependencies: { leftpad: '1.0.0' }, name: 'plain' });

    expect(detectConsumer(join(dir, 'deep'))).toBeUndefined();
  });
});

describe('check-install tool', () => {
  const catalog = {
    listPackages: () => [
      { name: '@vielzeug/lingua', slug: 'lingua', version: '0.6.0' },
      { name: '@vielzeug/ledger', slug: 'ledger', version: '0.1.0' },
    ],
  } as unknown as Catalog;

  const tool = packageTools.find((entry) => entry.name === 'check-install');

  it('reports match, drift, linked, and not-in-snapshot statuses', () => {
    const dir = project(
      'drift',
      {
        dependencies: {
          '@vielzeug/language-placeholder': '0.1.0',
          '@vielzeug/ledger': '^0.2.0',
          '@vielzeug/lingua': '0.6.0',
          '@vielzeug/tavern': 'link:../tavern',
        },
        name: 'demo',
      },
      {
        file: 'bun.lock',
        text: JSON.stringify({
          packages: {
            '@vielzeug/ledger': ['@vielzeug/ledger@0.2.0', {}],
            '@vielzeug/lingua': ['@vielzeug/lingua@0.6.0', {}],
          },
        }),
      },
    );

    const result = tool?.execute({ projectDir: join(dir, 'sub') }, catalog);

    expect(result).toMatchObject({
      packages: [
        { name: '@vielzeug/language-placeholder', status: 'not-in-snapshot' },
        { declared: '^0.2.0', installed: '0.2.0', name: '@vielzeug/ledger', snapshotVersion: '0.1.0', status: 'drift' },
        { declared: '0.6.0', installed: '0.6.0', name: '@vielzeug/lingua', snapshotVersion: '0.6.0', status: 'match' },
        { declared: 'link:../tavern', name: '@vielzeug/tavern', status: 'linked' },
      ],
      projectDir: dir,
    });
  });

  it('reports honestly when no consumer project is found', () => {
    const dir = project('nocustom', { name: 'plain' });

    expect(tool?.execute({ projectDir: dir }, catalog)).toMatchObject({
      note: expect.any(String),
      packages: [],
      projectDir: null,
    });
  });
});
