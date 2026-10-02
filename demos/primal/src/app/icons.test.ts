// @vitest-environment jsdom
// (icons.ts imports @vielzeug/refine/icon, which defines a custom element :
// the rest of this suite runs in node where HTMLElement does not exist.)
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as lucide from 'lucide';
import { describe, expect, it } from 'vitest';

import { APP_ICON_NAMES } from './icons';

/**
 * The icon coverage contract: every icon name a template renders must be
 * registered in icons.ts, and every registered name must exist in the installed
 * Lucide (catches renames on upgrades). Keeps the registered set honest without
 * shipping the whole library.
 */

/** Literals that look like icon names but are comparisons on other data. */
const FALSE_POSITIVES = new Set(['campaign']);

const extract = (): Set<string> => {
  const srcRoot = path.resolve(import.meta.dirname, '..');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|vue)$/.test(entry.name) && !/\.(test|e2e)\.ts$/.test(entry.name)) files.push(full);
    }
  };
  walk(srcRoot);

  const names = new Set<string>();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const tag of content.matchAll(/<ore-icon\b[^>]*>/gs)) {
      const el = tag[0];
      // The class includes '_' so a mistyped name (e.g. "shopping_cart") is
      // collected and fails against the kebab-case registry instead of
      // bypassing the scan entirely.
      for (const m of el.matchAll(/(?:^|\s)name="([a-z0-9_-]+)"/g)) names.add(m[1]);
      for (const m of el.matchAll(/:name="([^"]*)"/g)) {
        for (const lit of m[1].matchAll(/'([a-z0-9_-]+)'/g)) names.add(lit[1]);
      }
    }
    for (const m of content.matchAll(/icon:\s*['"]([a-z0-9_-]+)['"]/g)) names.add(m[1]);
    // Icon names passed as attributes to other components (menu-icon, confirm-icon, …)
    // and as string literals inside bound icon props (:confirm-icon="'download'").
    // Game-art paths (trophyIcon, weaponIcon) contain '/' or '.' and cannot match.
    for (const m of content.matchAll(/\s[a-z-]*icon="([a-z0-9_-]+)"/g)) names.add(m[1]);
    for (const m of content.matchAll(/:[a-z-]*icon="([^"]*)"/g)) {
      for (const lit of m[1].matchAll(/'([a-z0-9_-]+)'/g)) names.add(lit[1]);
    }
  }
  return names;
};

describe('icon registration coverage', () => {
  it('registers every icon name the templates render', () => {
    const registered = new Set(APP_ICON_NAMES);
    const missing = [...extract()].filter((name) => !FALSE_POSITIVES.has(name) && !registered.has(name));

    expect(missing, `Icons rendered but not registered in app/icons.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('keeps only names that exist in the installed lucide', () => {
    const toPascalCase = (value: string): string =>
      value
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('');

    const missing = APP_ICON_NAMES.filter((name) => !(toPascalCase(name) in lucide.icons));

    expect(missing, `Registered names missing from lucide (renamed upstream?): ${missing.join(', ')}`).toEqual([]);
  });
});
