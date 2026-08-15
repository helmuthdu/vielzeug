import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { packPublishedPackage } from '../pack-published.mjs';

const fixtures = [];

afterEach(() => {
  for (const directory of fixtures.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe('packPublishedPackage()', () => {
  it('packs an isolated normalized manifest without mutating source package metadata', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'vielzeug-pack-test-'));
    const original = { exports: { '.': { import: './dist/index.js', source: './src/index.ts', types: './dist/index.d.ts' } } };
    const run = vi.fn((command, args, { cwd }) => {
      expect(command).toBe('npm');
      expect(args).toEqual(['pack', '--ignore-scripts', '--json']);
      expect(JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8')).exports['.'].source).toBeUndefined();

      return JSON.stringify([{ filename: 'example-1.0.0.tgz', files: [{ path: 'dist/index.js' }] }]);
    });
    writeFileSync(path.join(folder, 'package.json'), JSON.stringify(original, null, 2));
    writeFileSync(path.join(folder, 'README.md'), 'example');
    fixtures.push(folder);

    const packed = packPublishedPackage(folder, { run });

    expect(JSON.parse(readFileSync(path.join(folder, 'package.json'), 'utf8'))).toEqual(original);
    expect(existsSync(packed.tarballPath)).toBe(false);
    packed.cleanup();
  });

  it('accepts npm pack output returned as an object map', () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'vielzeug-pack-test-'));
    const run = vi.fn(() =>
      JSON.stringify({
        example: { filename: 'example-1.0.0.tgz', files: [{ path: 'dist/index.js' }] },
      }),
    );
    writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ name: 'example', version: '1.0.0' }));
    fixtures.push(folder);

    const packed = packPublishedPackage(folder, { run });

    expect(packed.files).toEqual([{ path: 'dist/index.js' }]);
    expect(packed.tarballPath).toMatch(/example-1\.0\.0\.tgz$/);
    packed.cleanup();
  });
});
