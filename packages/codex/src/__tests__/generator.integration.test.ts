import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { generateSnapshot } from '../../scripts/generator.ts';
import { validateSnapshot, writeSnapshot } from '../../scripts/write-bundled-data.ts';
import { loadSnapshot } from '../snapshot.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('snapshot generation', () => {
  it('builds a complete snapshot from real monorepo inputs', () => {
    const snapshot = generateSnapshot({ repoRoot });

    expect(snapshot.packages.length).toBeGreaterThan(0);
    expect(snapshot.version).toMatch(/^\d+\.\d+\.\d+$/);

    const ripple = snapshot.packages.find((pkg) => pkg.meta.slug === 'ripple');

    expect(ripple, 'ripple package missing').toBeDefined();
    // Every docs page under docs/ripple ships, keyed by its relative path.
    expect(Object.keys(ripple?.pages ?? {}).length).toBeGreaterThan(1);
    expect(ripple?.pages.api).toContain('# ');
    // Checker-resolved exports carry real declaration text, not re-export lines.
    const watch = ripple?.exports.find((entry) => entry.name === 'watch');

    expect(watch?.signature).toMatch(/export (function|const) watch/);
    expect(watch?.signature).not.toMatch(/^export \{ watch \} from/m);
    // Package metadata comes from the raw index frontmatter, not the stripped page.
    expect(ripple?.meta.category).toBe('state');
    expect(ripple?.meta.keywords).toContain('signals');
    expect(ripple?.meta.related).toContain('ore');
    // Sections cover the pages they reference.
    for (const section of ripple?.sections ?? []) {
      const page = ripple?.pages[section.page] ?? '';

      expect(section.end).toBeLessThanOrEqual(page.length + 1);
      expect(page.slice(section.start, section.end)).toContain(section.heading);
    }
  });

  it('projects refine elements and theme tokens', () => {
    const snapshot = generateSnapshot({ repoRoot });

    expect(snapshot.components.length).toBeGreaterThan(50);
    expect(snapshot.components.every((component) => component.tag.startsWith('ore-'))).toBe(true);
    expect(snapshot.components.find((component) => component.tag === 'ore-button')?.docPage).toBe('components/button');
    expect(snapshot.tokens.some((token) => token.name.startsWith('--'))).toBe(true);
  });

  it('defines shared generator watch roots', () => {
    expect(generateSnapshot({ repoRoot, slugs: ['codex'] }).packages[0].meta.slug).toBe('codex');
  });

  it('publishes one snapshot file, validates it, and reloads it', () => {
    const snapshot = generateSnapshot({ repoRoot, slugs: ['codex'] });
    const target = resolve(repoRoot, 'packages/codex/data-test');

    try {
      writeSnapshot(target, snapshot);

      expect(existsSync(resolve(target, 'snapshot.json'))).toBe(true);
      expect(existsSync(resolve(target, 'catalog.json'))).toBe(false);
      validateSnapshot(snapshot);
      expect(loadSnapshot(target).packages.map((pkg) => pkg.meta.slug)).toEqual(['codex']);
    } finally {
      rmSync(target, { force: true, recursive: true });
    }
  });

  it('refuses to publish a snapshot whose section offsets exceed their page', () => {
    const snapshot = generateSnapshot({ repoRoot, slugs: ['codex'] });
    const broken = {
      ...snapshot,
      packages: snapshot.packages.map((pkg) => ({
        ...pkg,
        sections: pkg.sections.length > 0 ? [{ ...pkg.sections[0], end: 10_000_000 }] : pkg.sections,
      })),
    };
    const target = resolve(repoRoot, 'packages/codex/data-test-invalid');

    try {
      expect(() => writeSnapshot(target, broken)).toThrow('offsets');
      expect(existsSync(resolve(target, 'snapshot.json'))).toBe(false);
    } finally {
      rmSync(target, { force: true, recursive: true });
    }
  });
});
