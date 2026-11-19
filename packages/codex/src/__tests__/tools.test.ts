import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { Catalog } from '../catalog.js';
import { packageTools } from '../tools/packages.js';
import { refineTools } from '../tools/refine.js';
import type { ToolDefinition } from '../tools/shared.js';
import { snapshotFixture } from './fixtures.js';

const catalog = new Catalog(snapshotFixture());

function tool(name: string): ToolDefinition {
  const result = [...packageTools, ...refineTools].find((item) => item.name === name);

  if (!result) throw new Error(`Missing tool: ${name}`);

  return result;
}

describe('MCP tool surface', () => {
  it('offers exactly the ten consolidated tools with one slug parameter name', () => {
    expect([...packageTools, ...refineTools].map((item) => item.name)).toEqual([
      'list-packages',
      'get-package',
      'get-docs',
      'get-example',
      'get-type-signature',
      'search',
      'refine-list-components',
      'refine-get-component',
      'refine-get-tokens',
      'refine-validate-usage',
    ]);

    for (const item of [...packageTools, ...refineTools]) {
      expect(item.inputSchema.additionalProperties).toBe(false);
      expect(Object.keys(item.inputSchema.properties)).not.toContain('packageSlug');
    }
  });

  it('keeps the tool tables in docs/codex/tools.md in sync with the registries', () => {
    const markdown = readFileSync(new URL('../../../../docs/codex/tools.md', import.meta.url), 'utf8');

    for (const item of [...packageTools, ...refineTools]) {
      expect(markdown, `docs/codex/tools.md is missing \`${item.name}\`; run bun run gen:tool-docs`).toContain(
        `\`${item.name}\``,
      );
    }
    // Removed tools must not linger in the tables either.
    for (const gone of [
      'get-source',
      'list-examples',
      'check-install',
      'search-packages',
      'refine-generate-template',
    ]) {
      expect(
        markdown,
        `docs/codex/tools.md still lists removed tool \`${gone}\`; run bun run gen:tool-docs`,
      ).not.toContain(`\`${gone}\``);
    }
  });
});

describe('package tools', () => {
  it('lists packages compactly', () => {
    expect(tool('list-packages').execute({}, catalog)).toEqual([
      { description: 'Reactive core', name: '@vielzeug/demo', slug: 'demo' },
    ]);
  });

  it('summarises a package with pages, examples, and export names', () => {
    const summary = tool('get-package').execute({ slug: 'demo' }, catalog) as Record<string, unknown>;

    expect(summary.pages).toEqual([
      { page: 'api', title: 'Demo API' },
      { page: 'index', title: 'Demo package' },
    ]);
    expect(summary.examples).toEqual([{ id: 'basic', name: 'Basic' }]);
    expect(summary.exports).toEqual(['signal', 'spring']);
    expect((summary.meta as { slug: string }).slug).toBe('demo');
  });

  it('serves whole pages or one section', () => {
    expect(tool('get-docs').execute({ page: 'api', slug: 'demo' }, catalog)).toContain('# Demo');
    expect(tool('get-docs').execute({ page: 'api', section: 'Signals', slug: 'demo' }, catalog)).toContain('signal()');
  });

  it('serves example code and checker-resolved signatures', () => {
    expect(tool('get-example').execute({ exampleId: 'basic', slug: 'demo' }, catalog)).toBe('const s = signal(1)');
    expect(tool('get-type-signature').execute({ slug: 'demo', symbol: 'signal' }, catalog)).toEqual({
      doc: 'Create reactive state.',
      kind: 'function',
      name: 'signal',
      signature: 'export function signal<T>(value: T): Signal<T>',
    });
  });

  it('returns located, ranked search hits', () => {
    const hits = tool('search').execute({ query: 'signals' }, catalog) as Array<Record<string, unknown>>;

    expect(hits[0]).toMatchObject({ heading: 'Signals', page: 'api', section: 'signals', slug: 'demo' });
    expect(hits[0]).not.toHaveProperty('score');
  });

  it('rejects invalid and unknown arguments before catalog access', () => {
    expect(() => tool('get-docs').execute({ page: 'api', slug: 1 }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'slug: must be a string.' }),
    );
    expect(() => tool('search').execute({ query: '' }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'query: required non-empty string.' }),
    );
    expect(() => tool('get-docs').execute({ pgae: 'api', slug: 'demo' }, catalog)).toThrow(
      expect.objectContaining({ code: 'INVALID_ARG', message: 'pgae: unknown argument.' }),
    );
  });
});

describe('refine tools', () => {
  it('lists components as tags and descriptions only', () => {
    expect(tool('refine-list-components').execute({}, catalog)).toEqual([
      { description: 'A button.', tagName: 'ore-button' },
    ]);
  });

  it('serves theme tokens with a case-insensitive prefix filter', () => {
    expect(tool('refine-get-tokens').execute({ filter: '--SPACE' }, catalog)).toEqual([
      { comment: 'Base spacing unit', name: '--space-100', value: '0.25rem' },
    ]);
    expect(tool('refine-get-tokens').execute({}, catalog)).toHaveLength(2);
  });

  it('validates every ore-* tag in a fragment, flagging unknown tags, attributes, and enum values', () => {
    const issues = tool('refine-validate-usage').execute(
      {
        html: '<ore-button variant="nope" size="md" bogus="1"></ore-button><ore-missing></ore-missing><ore-button aria-label="go" class="x" disabled></ore-button>',
      },
      catalog,
    ) as Array<{ message: string; tag: string }>;

    expect(issues.map((issue) => issue.message)).toEqual([
      'Value "nope" is not valid for "variant" on <ore-button>. Allowed: primary, ghost.',
      'Unknown attribute "bogus" on <ore-button>.',
      'Unknown component <ore-missing>. Run refine-list-components for the tag list.',
    ]);
  });

  it('accepts empty and name-valued boolean attributes and enum defaults', () => {
    expect(
      tool('refine-validate-usage').execute({ html: '<ore-button disabled size=""></ore-button>' }, catalog),
    ).toEqual([]);
  });

  it('ignores non-refine tags', () => {
    expect(tool('refine-validate-usage').execute({ html: '<div class="a"><span>hi</span></div>' }, catalog)).toEqual(
      [],
    );
  });
});
