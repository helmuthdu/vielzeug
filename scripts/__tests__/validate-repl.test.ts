import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildExampleFiles, discoverPackages, resolveVitestBin, sanitize } from '../validate-repl';

describe('module has no import-time side effects', () => {
  it('only exports functions, does not touch the filesystem', () => {
    expect(typeof sanitize).toBe('function');
  });
});

describe('sanitize()', () => {
  it('leaves alphanumerics, underscores and hyphens untouched', () => {
    expect(sanitize('basic-usage_1')).toBe('basic-usage_1');
  });

  it('replaces everything else with an underscore', () => {
    expect(sanitize('with spaces & symbols!')).toBe('with_spaces___symbols_');
  });
});

describe('buildExampleFiles()', () => {
  it('builds a snippet file verbatim and a test file importing it', () => {
    const { id, snippet, test } = buildExampleFiles('ripple', 'basic usage', {
      code: 'const x = 1;\nconsole.log(x);',
      name: 'Basic Usage',
    });

    expect(id).toBe('ripple__basic_usage');
    expect(snippet).toBe('const x = 1;\nconsole.log(x);\n');
    expect(test).toContain("import { test } from 'vitest';");
    expect(test).toContain("await import('./ripple__basic_usage.snippet.ts');");
    expect(test).toContain('ripple / basic usage — Basic Usage');
    expect(test).not.toContain('fake-indexeddb');
  });

  it('imports fake-indexeddb/auto only for the vault package', () => {
    const { test } = buildExampleFiles('vault', 'ttl', { code: 'x', name: 'TTL' });
    expect(test).toContain("import 'fake-indexeddb/auto';");
  });

  it('always includes the jsdom environment pragma as the first line', () => {
    const { test } = buildExampleFiles('ripple', 'x', { code: 'x', name: 'X' });
    expect(test.split('\n')[0]).toBe('// @vitest-environment jsdom');
  });
});

describe('discoverPackages()', () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('lists every package directory, ignoring files (which contain a dot)', () => {
    root = mkdtempSync(path.join(tmpdir(), 'validate-repl-test-'));
    mkdirSync(path.join(root, 'ripple'));
    mkdirSync(path.join(root, 'orbit'));
    mkdirSync(path.join(root, '.DS_Store')); // dir, but has a dot — treated like the real file case

    expect(discoverPackages(root, null).sort()).toEqual(['orbit', 'ripple']);
  });

  it('narrows to a single package when filterPackage matches', () => {
    root = mkdtempSync(path.join(tmpdir(), 'validate-repl-test-'));
    mkdirSync(path.join(root, 'ripple'));
    mkdirSync(path.join(root, 'orbit'));

    expect(discoverPackages(root, 'orbit')).toEqual(['orbit']);
  });

  it('throws a clear error when filterPackage matches nothing', () => {
    root = mkdtempSync(path.join(tmpdir(), 'validate-repl-test-'));
    mkdirSync(path.join(root, 'ripple'));

    expect(() => discoverPackages(root, 'does-not-exist')).toThrow(/No examples folder for package: does-not-exist/);
  });
});

describe('resolveVitestBin()', () => {
  it('resolves a real, executable path to the vitest binary', () => {
    const binPath = resolveVitestBin();
    expect(binPath).toMatch(/vitest[\\/]vitest\.mjs$/);
  });
});
