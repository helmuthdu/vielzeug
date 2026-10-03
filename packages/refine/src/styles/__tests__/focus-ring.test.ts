// Guards the `--focus-ring` token that :focus-visible rules across navbar,
// sidebar, list-item, drawer, and navigation-menu consume as
// `outline: var(--focus-ring)`. The token was referenced by eight component
// stylesheets but defined nowhere, so those focus outlines silently resolved
// to `none` (verified live: `outline: none` while `:focus-visible` matched).
// A sibling token, `--color-focus`, had the same problem in dialog and
// chat-message and was consolidated onto `--focus-ring` instead of being
// defined separately. This test keeps either regression from coming back.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = join(import.meta.dirname, '..');
const srcDir = join(stylesDir, '..');

function cssFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      found.push(...cssFilesUnder(full));
    } else if (entry.name.endsWith('.css')) {
      found.push(full);
    }
  }
  return found;
}

const themeCss = readFileSync(join(stylesDir, 'theme.css'), 'utf-8');
const componentCss = cssFilesUnder(srcDir).filter((f) => f !== join(stylesDir, 'theme.css'));

describe('--focus-ring', () => {
  it('is defined in theme.css as an outline shorthand', () => {
    const definition = themeCss.match(/^\s*--focus-ring:\s*([^;]+);/m);
    expect(definition, 'theme.css must define --focus-ring').toBeDefined();
    // Consumers write `outline: var(--focus-ring)` with their own
    // outline-offset, so the value must be a full outline shorthand
    // (<width> solid <color>), not a bare color.
    expect(definition?.[1].trim()).toMatch(/^var\(--border-2\)\s+solid\s+var\(--color-primary\)$/);
  });

  it('has at least one component consumer (guards the test itself)', () => {
    const consumers = componentCss.filter((f) => readFileSync(f, 'utf-8').includes('var(--focus-ring)'));
    expect(consumers.length).toBeGreaterThan(0);
  });

  it('is the only focus-outline token: no undefined --color-focus remains', () => {
    const offenders = componentCss
      .filter((f) => readFileSync(f, 'utf-8').includes('var(--color-focus)'))
      .map((f) => relative(srcDir, f));
    expect(offenders).toEqual([]);
  });
});
