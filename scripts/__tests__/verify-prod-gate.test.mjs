import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findProdGateViolations } from '../verify-prod-gate.mjs';

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function packageWithGate(packagesDir, slug, { dev = true, distFiles = {} } = {}) {
  const pkgDir = join(packagesDir, slug);
  if (dev) {
    mkdirSync(join(pkgDir, 'src'), { recursive: true });
    writeFileSync(join(pkgDir, 'src/_dev.ts'), `const gate = typeof __${slug.toUpperCase()}_PROD__ !== "undefined";\nexport { gate };\n`);
  }
  for (const [name, contents] of Object.entries(distFiles)) {
    mkdirSync(join(pkgDir, 'dist', name.includes('/') ? name.split('/')[0] : ''), { recursive: true });
    writeFileSync(join(pkgDir, 'dist', name), contents);
  }
  return pkgDir;
}

describe('findProdGateViolations()', () => {
  it('has no violations when dist carries no raw gate reference', () => {
    const packagesDir = mkdtempSync(join(tmpdir(), 'prod-gate-'));
    roots.push(packagesDir);
    packageWithGate(packagesDir, 'ripple', { distFiles: { 'index.js': 'const gate = true;\n' } });

    expect(findProdGateViolations({ packagesDir })).toEqual([]);
  });

  it('flags a raw gate reference surviving into a dist artifact', () => {
    const packagesDir = mkdtempSync(join(tmpdir(), 'prod-gate-'));
    roots.push(packagesDir);
    packageWithGate(packagesDir, 'ripple', { distFiles: { 'nested/index.cjs': 'if (!__RIPPLE_PROD__) console.warn("dev");\n' } });

    const failures = findProdGateViolations({ packagesDir });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('ripple');
    expect(failures[0]).toContain('__RIPPLE_PROD__');
  });

  it('skips packages without src/_dev.ts or without a built dist', () => {
    const packagesDir = mkdtempSync(join(tmpdir(), 'prod-gate-'));
    roots.push(packagesDir);
    packageWithGate(packagesDir, 'nogate', { dev: false, distFiles: { 'index.js': '__NOGATE_PROD__' } });
    packageWithGate(packagesDir, 'unbuilt', { distFiles: {} });

    expect(findProdGateViolations({ packagesDir })).toEqual([]);
  });

  it('ignores non-js artifacts', () => {
    const packagesDir = mkdtempSync(join(tmpdir(), 'prod-gate-'));
    roots.push(packagesDir);
    packageWithGate(packagesDir, 'ripple', { distFiles: { 'types.d.ts': '__RIPPLE_PROD__' } });

    expect(findProdGateViolations({ packagesDir })).toEqual([]);
  });
});
