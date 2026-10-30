import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { REFINE_CATEGORIES, REFINE_CATEGORY_BY_COMPONENT } from '../refineCategories';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Up four levels from docs/.vitepress/theme/components/__tests__ is docs/.
const DOCS_DIR = resolve(__dirname, '../../../../');
const COMPONENTS_DOCS_DIR = resolve(DOCS_DIR, 'refine/components');
const REFINE_DOCS_DIR = resolve(DOCS_DIR, 'refine');

/** Every docs/refine/components/<slug>.md: the source of truth for what ships a page. */
function listComponentPageSlugs(): string[] {
  return readdirSync(COMPONENTS_DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name.slice(0, -'.md'.length))
    .sort();
}

describe('REFINE_CATEGORIES', () => {
  it('lists each component exactly once, covering every component page', () => {
    const slugs = REFINE_CATEGORIES.flatMap((category) => category.components);
    const expected = listComponentPageSlugs();

    // No duplicates across categories.
    expect(new Set(slugs)).toHaveLength(slugs.length);

    // Every page appears in exactly one category, and no category lists a page that does not exist.
    expect([...slugs].sort()).toEqual(expected);
  });

  it('keeps every category a real population, not a single-family orphan', () => {
    // Disclosure was retired for holding one family; a category that thins out
    // again should be merged, not tolerated.
    for (const category of REFINE_CATEGORIES) {
      expect(category.components.length, `${category.name} has too few components`).toBeGreaterThanOrEqual(5);
    }
  });

  it('orders components alphabetically within each category', () => {
    for (const category of REFINE_CATEGORIES) {
      expect(category.components, category.name).toEqual([...category.components].sort());
    }
  });

  it('indexes every component to exactly one category name', () => {
    const slugs = REFINE_CATEGORIES.flatMap((category) => category.components);
    expect(REFINE_CATEGORY_BY_COMPONENT.size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(REFINE_CATEGORY_BY_COMPONENT.get(slug)).toBeDefined();
    }
  });
});

/**
 * The documentation tables that repeat the taxonomy. Before the category map
 * existed these were four hand-maintained copies and two of them had silently
 * lost components; these tests are what keeps them from drifting again.
 */
describe('documentation tables', () => {
  /** api.md "| Area | Components |" rows: page slugs in backticks. */
  function parseApiAreaTable(): Map<string, string[]> {
    const markdown = readFileSync(resolve(REFINE_DOCS_DIR, 'api.md'), 'utf8');
    const row = /^\| ([A-Z][A-Za-z ]+) \| (.+) \|$/gm;
    const categories = new Map<string, string[]>();

    for (const match of markdown.matchAll(row)) {
      const name = match[1];
      if (!REFINE_CATEGORY_BY_COMPONENT.has(name) && !REFINE_CATEGORIES.some((c) => c.name === name)) continue;
      categories.set(
        name,
        [...match[2].matchAll(/`([a-z0-9-]+)`/g)].map((cell) => cell[1]),
      );
    }

    return categories;
  }

  /** index.md "**Category:** `ore-slug`, ..." lines: element tags, stripped of the prefix. */
  function parseIndexElementList(): Map<string, string[]> {
    const markdown = readFileSync(resolve(REFINE_DOCS_DIR, 'index.md'), 'utf8');
    const line = /^\*\*([A-Z][A-Za-z ]+):\*\* (.+)$/gm;
    const categories = new Map<string, string[]>();

    for (const match of markdown.matchAll(line)) {
      const name = match[1];
      if (!REFINE_CATEGORIES.some((category) => category.name === name)) continue;
      categories.set(
        name,
        [...match[2].matchAll(/`ore-([a-z0-9-]+)`/g)].map((tag) => tag[1]),
      );
    }

    return categories;
  }

  /**
   * Both tables are keyed by page slug, so a category's row must equal the map's
   * list exactly. Sub-element entries live on their parent's page and are listed
   * there, which is what makes the comparison mechanical.
   */
  const assertions: ReadonlyArray<[string, () => Map<string, string[]>]> = [
    ['api.md Area table', parseApiAreaTable],
    ['index.md element list', parseIndexElementList],
  ];

  for (const [label, parse] of assertions) {
    it(`${label} matches the category map exactly`, () => {
      const parsed = parse();

      expect([...parsed.keys()].sort()).toEqual(REFINE_CATEGORIES.map((category) => category.name).sort());

      for (const category of REFINE_CATEGORIES) {
        expect(parsed.get(category.name), `${label}: ${category.name}`).toEqual([...category.components].sort());
      }
    });
  }
});
