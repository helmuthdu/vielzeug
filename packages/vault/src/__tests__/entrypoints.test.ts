import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import * as core from '../index';
import { createIndexedDB, defineMigration } from '../indexeddb';
import { createLocalStorage } from '../local-storage';
import { createMemory } from '../memory';
import { createSessionStorage } from '../session-storage';
import { createSQLite } from '../sqlite';

type PackageManifest = {
  exports: Record<string, unknown>;
  typesVersions: Record<string, Record<string, readonly string[]>>;
};

describe('adapter entry points', () => {
  test('keeps adapter factories and capability types out of the core entry point', () => {
    expect('createIndexedDB' in core).toBe(false);
    expect('createLocalStorage' in core).toBe(false);
    expect('createMemory' in core).toBe(false);
    expect('createSessionStorage' in core).toBe(false);
    expect('createSQLite' in core).toBe(false);
    expect('TransactionContext' in core).toBe(false);
    expect('MigrationFn' in core).toBe(false);
    expect('MigrationContext' in core).toBe(false);
  });

  test('exports every adapter from its dedicated entry point', () => {
    expect(createIndexedDB).toBeTypeOf('function');
    expect(createLocalStorage).toBeTypeOf('function');
    expect(createMemory).toBeTypeOf('function');
    expect(createSessionStorage).toBeTypeOf('function');
    expect(createSQLite).toBeTypeOf('function');
    expect(defineMigration).toBeTypeOf('function');
  });

  test('declares only focused adapter subpaths in the package export map', async () => {
    const packagePath = process.cwd().endsWith(join('packages', 'vault'))
      ? 'package.json'
      : join('packages', 'vault', 'package.json');
    const manifest = JSON.parse(await readFile(packagePath, 'utf8')) as PackageManifest;

    expect(Object.keys(manifest.exports).sort()).toEqual([
      '.',
      './indexeddb',
      './local-storage',
      './memory',
      './session-storage',
      './sqlite',
    ]);
    expect(Object.keys(manifest.typesVersions['*'] ?? {}).sort()).toEqual([
      'indexeddb',
      'local-storage',
      'memory',
      'session-storage',
      'sqlite',
    ]);
  });
});
