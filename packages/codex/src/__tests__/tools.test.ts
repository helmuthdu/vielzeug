/**
 * Unit tests for tool helpers and ToolContext construction.
 * Covers: optionalEnum (via get-docs), componentTags pre-computation, buildToolContext,
 * generate-template, get-tokens, validate-component-usage.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';

import type { BundledData, CemDeclaration } from '../types.js';

import { createServer } from '../server.js';
import { buildToolContext } from '../tools.js';
import { makePkg, SYNTHETIC_DATA } from './_fixtures.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const activeClients: Client[] = [];

afterEach(async () => {
  const clients = activeClients.splice(0);

  for (const client of clients) {
    await client.close();
  }
});

async function createTestPair(data: BundledData) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer(data);

  await server.connect(serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });

  await client.connect(clientTransport);
  activeClients.push(client);

  return { client };
}

function text(result: ToolCallResult): string {
  return result.content[0]?.text ?? '';
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
  return (await client.callTool({ arguments: args, name })) as ToolCallResult;
}

// ---------------------------------------------------------------------------
// optionalEnum — tested via get-docs tool
// ---------------------------------------------------------------------------

describe('optionalEnum (via get-docs)', () => {
  it('defaults to "index" when page is omitted', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const withDefault = await call(client, 'get-docs', { packageSlug: 'synthetic' });
    const explicit = await call(client, 'get-docs', { packageSlug: 'synthetic', page: 'index' });

    expect(withDefault.isError).not.toBe(true);
    expect(text(withDefault)).toBe(text(explicit));
  });

  it('returns isError when page is an invalid enum value', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: 'invalid-page' });

    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/must be one of/);
  });

  it('returns isError when page is an empty string', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: '' });

    expect(result.isError).not.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildToolContext — componentTags pre-computation
// ---------------------------------------------------------------------------

describe('buildToolContext — componentTags', () => {
  const mockComponents: CemDeclaration[] = [
    { description: 'A button', name: 'Button', tagName: 'ore-button' },
    { description: 'An input', name: 'Input', tagName: 'ore-input' },
    { description: 'No tag — declaration without tagName', name: 'Mixin' },
  ];

  it('componentTags is null when refine package has no components', () => {
    const ctx = buildToolContext(SYNTHETIC_DATA);

    expect(ctx.componentTags).toBeNull();
    expect(ctx.components).toBeNull();
  });

  it('componentTags contains only entries with a tagName', () => {
    const data: BundledData = {
      packages: [makePkg({ components: mockComponents, slug: 'refine' })],
      schemaVersion: SYNTHETIC_DATA.schemaVersion,
      version: '0.0.0',
    };
    const ctx = buildToolContext(data);

    expect(ctx.componentTags).toEqual(['ore-button', 'ore-input']);
  });

  it('get-component error message uses pre-computed componentTags', async () => {
    const data: BundledData = {
      packages: [makePkg({ components: mockComponents, slug: 'refine' })],
      schemaVersion: SYNTHETIC_DATA.schemaVersion,
      version: '0.0.0',
    };
    const { client } = await createTestPair(data);
    const result = await call(client, 'get-component', { tagName: 'ore-nonexistent' });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('ore-button');
    expect(text(result)).toContain('ore-input');
    expect(text(result)).not.toContain('Mixin');
  });
});

// ---------------------------------------------------------------------------
// generate-template
// ---------------------------------------------------------------------------

const REFINE_COMPONENTS: CemDeclaration[] = [
  {
    attributes: [
      { name: 'variant', type: { text: "'primary' | 'secondary'" } },
      { default: 'false', name: 'disabled', type: { text: 'boolean' } },
    ],
    description: 'A button',
    events: [{ name: 'ore-click' }],
    name: 'Button',
    slots: [{ description: 'Button label', name: '' }],
    tagName: 'ore-button',
  },
  {
    attributes: [{ name: 'label' }],
    cssProperties: [
      { default: '#fff', description: 'Background colour', name: '--ore-card-bg' },
      { name: '--ore-card-radius' },
    ],
    description: 'A card',
    name: 'Card',
    slots: [
      { description: 'Main content', name: 'body' },
      { description: 'Footer actions', name: 'footer' },
    ],
    tagName: 'ore-card',
  },
];

function refineData(): BundledData {
  return {
    packages: [makePkg({ components: REFINE_COMPONENTS, slug: 'refine' })],
    schemaVersion: SYNTHETIC_DATA.schemaVersion,
    version: '0.0.0',
  };
}

describe('generate-template', () => {
  it('returns an HTML snippet containing the tag name', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-button' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('<ore-button');
    expect(text(result)).toContain('</ore-button>');
  });

  it('uses the first literal from a union type for required attributes', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('variant="primary"');
  });

  it('puts attributes with defaults in a comment block', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('<!-- Optional attributes:');
    expect(text(result)).toContain('disabled');
  });

  it('scaffolds named slots', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-card' });

    expect(text(result)).toContain('slot="body"');
    expect(text(result)).toContain('slot="footer"');
  });

  it('includes event names in a comment', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('ore-click');
  });

  it('prepends the scenario as a comment when provided', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { scenario: 'submit action', tagName: 'ore-button' });

    expect(text(result)).toContain('<!-- submit action -->');
  });

  it('returns isError for an unknown tag', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'generate-template', { tagName: 'ore-nonexistent' });

    expect(result.isError).toBe(true);
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-template', { tagName: 'ore-button' });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get-tokens
// ---------------------------------------------------------------------------

describe('get-tokens', () => {
  it('returns a sorted JSON array of CSS custom properties', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'get-tokens', {});

    expect(result.isError).not.toBe(true);

    const tokens = JSON.parse(text(result)) as { name: string }[];

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.name).toBe('--ore-card-bg');
    expect(tokens[1]!.name).toBe('--ore-card-radius');
  });

  it('includes description and default when present', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'get-tokens', {});
    const tokens = JSON.parse(text(result)) as { default?: string; description?: string; name: string }[];
    const bg = tokens.find((t) => t.name === '--ore-card-bg');

    expect(bg?.default).toBe('#fff');
    expect(bg?.description).toBe('Background colour');
  });

  it('filters by prefix (case-insensitive)', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'get-tokens', { filter: '--ore-card-b' });
    const tokens = JSON.parse(text(result)) as { name: string }[];

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.name).toBe('--ore-card-bg');
  });

  it('returns empty array when filter matches nothing', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'get-tokens', { filter: '--no-match' });
    const tokens = JSON.parse(text(result)) as unknown[];

    expect(tokens).toHaveLength(0);
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-tokens', {});

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate-component-usage
// ---------------------------------------------------------------------------

describe('validate-component-usage', () => {
  it('returns empty array for valid usage', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button variant="primary">Click</ore-button>`;
    const result = await call(client, 'validate-component-usage', { html, tagName: 'ore-button' });

    expect(result.isError).not.toBe(true);

    const issues = JSON.parse(text(result)) as unknown[];

    expect(issues).toHaveLength(0);
  });

  it('reports unknown attributes', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button variant="primary" unknownprop="bad">Click</ore-button>`;
    const result = await call(client, 'validate-component-usage', { html, tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as { message: string; type: string }[];

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.type).toBe('error');
    expect(issues[0]!.message).toContain('unknownprop');
  });

  it('does not flag safe HTML attributes (class, id, aria-*, data-*, on*)', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button class="x" id="y" aria-label="z" data-track="1" onclick="fn()">OK</ore-button>`;
    const result = await call(client, 'validate-component-usage', { html, tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as unknown[];

    expect(issues).toHaveLength(0);
  });

  it('reports unknown slot names when component defines named slots', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-card label="x"><span slot="ghost">oops</span></ore-card>`;
    const result = await call(client, 'validate-component-usage', { html, tagName: 'ore-card' });
    const issues = JSON.parse(text(result)) as { message: string }[];

    expect(issues.some((i) => i.message.includes('ghost'))).toBe(true);
  });

  it('returns error when tag is not found in HTML', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'validate-component-usage', { html: '<div>oops</div>', tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as { type: string }[];

    expect(issues[0]!.type).toBe('error');
  });

  it('returns isError when html exceeds 5000 chars', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'validate-component-usage', { html: 'x'.repeat(5001), tagName: 'ore-button' });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('5000');
  });

  it('returns isError for an unknown tag name', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'validate-component-usage', {
      html: '<ore-nope></ore-nope>',
      tagName: 'ore-nope',
    });

    expect(result.isError).toBe(true);
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'validate-component-usage', {
      html: '<ore-button></ore-button>',
      tagName: 'ore-button',
    });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get-sandbox-context
// ---------------------------------------------------------------------------

describe('get-sandbox-context', () => {
  it('returns a JSON object with iframeAttributes', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-sandbox-context', {});

    expect(result.isError).not.toBe(true);

    const ctx = JSON.parse(text(result)) as { iframeAttributes: Record<string, string> };

    expect(ctx.iframeAttributes['sandbox']).toBe('allow-scripts');
    expect(ctx.iframeAttributes['referrerpolicy']).toBe('no-referrer');
  });

  it('returns cspPolicy with all required directives', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-sandbox-context', {});
    const ctx = JSON.parse(text(result)) as { cspPolicy: Record<string, string> };

    expect(ctx.cspPolicy['default-src']).toBe("'none'");
    expect(ctx.cspPolicy['connect-src']).toBe("'none'");
    expect(ctx.cspPolicy['script-src']).toBe("'unsafe-inline'");
  });

  it('returns windowGlobals and notAvailable arrays', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-sandbox-context', {});
    const ctx = JSON.parse(text(result)) as { notAvailable: string[]; windowGlobals: string[] };

    expect(ctx.windowGlobals).toContain('window');
    expect(ctx.windowGlobals).toContain('document');
    expect(ctx.notAvailable.some((s) => s.includes('fetch'))).toBe(true);
  });

  it('works with or without Refine CEM data', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'get-sandbox-context', {});

    expect(result.isError).not.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get-state-bridge-spec
// ---------------------------------------------------------------------------

describe('get-state-bridge-spec', () => {
  it('returns TypeScript type definitions for HostMessage', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-state-bridge-spec', {});

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('HostMessage');
    expect(text(result)).toContain("type: 'render'");
    expect(text(result)).toContain("type: 'state-update'");
  });

  it('returns TypeScript type definitions for SandboxMessage', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-state-bridge-spec', {});

    expect(text(result)).toContain('SandboxMessage');
    expect(text(result)).toContain("type: 'ready'");
    expect(text(result)).toContain("type: 'event'");
    expect(text(result)).toContain("type: 'error'");
  });

  it('includes usage comments about parent.postMessage', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-state-bridge-spec', {});

    expect(text(result)).toContain('parent.postMessage');
  });
});

// ---------------------------------------------------------------------------
// generate-sandbox-document
// ---------------------------------------------------------------------------

describe('generate-sandbox-document', () => {
  it('wraps HTML in a complete DOCTYPE document', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', { html: '<p>Hello</p>' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('<!doctype html>');
    expect(text(result)).toContain('<p>Hello</p>');
    expect(text(result)).toContain('</html>');
  });

  it('injects a Content-Security-Policy meta tag', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', { html: '<p>x</p>' });

    expect(text(result)).toContain('Content-Security-Policy');
    expect(text(result)).toContain("connect-src 'none'");
  });

  it('injects a <style> block when styles are provided', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', {
      html: '<p>x</p>',
      styles: 'body { color: red; }',
    });

    expect(text(result)).toContain('<style>body { color: red; }</style>');
  });

  it('injects the bridge bootstrap script', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', { html: '<p>x</p>' });

    expect(text(result)).toContain('parent.postMessage');
    expect(text(result)).toContain("type: 'ready'");
  });

  it('returns isError when html exceeds 20 000 chars', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', { html: 'x'.repeat(20_001) });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('20000');
  });

  it('returns isError when html is empty', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'generate-sandbox-document', { html: '   ' });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// list-directives
// ---------------------------------------------------------------------------

describe('list-directives', () => {
  it('returns a JSON array of ore directive descriptors', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'list-directives', {});

    expect(result.isError).not.toBe(true);

    const directives = JSON.parse(text(result)) as { name: string }[];

    expect(Array.isArray(directives)).toBe(true);
    expect(directives.length).toBeGreaterThan(0);
  });

  it('includes each, when, model, classMap, styleMap, live, raw', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'list-directives', {});
    const names = (JSON.parse(text(result)) as { name: string }[]).map((d) => d.name);

    expect(names).toContain('each');
    expect(names).toContain('when');
    expect(names).toContain('model');
    expect(names).toContain('classMap');
    expect(names).toContain('styleMap');
    expect(names).toContain('live');
    expect(names).toContain('raw');
  });

  it('each entry has name, signature, description, and import', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'list-directives', {});
    const directives = JSON.parse(text(result)) as {
      description: string;
      import: string;
      name: string;
      signature: string;
    }[];

    for (const d of directives) {
      expect(typeof d.name).toBe('string');
      expect(typeof d.signature).toBe('string');
      expect(typeof d.description).toBe('string');
      expect(d.import).toBe('@vielzeug/ore/directives');
    }
  });

  it('results are sorted alphabetically by name', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'list-directives', {});
    const names = (JSON.parse(text(result)) as { name: string }[]).map((d) => d.name);
    const sorted = [...names].sort();

    expect(names).toEqual(sorted);
  });
});

// ---------------------------------------------------------------------------
// list-validators
// ---------------------------------------------------------------------------

describe('list-validators', () => {
  const spellData = (): BundledData => ({
    packages: [makePkg({ slug: 'spell' })],
    schemaVersion: SYNTHETIC_DATA.schemaVersion,
    version: '0.0.0',
  });

  it('returns a JSON array of spell validator descriptors', async () => {
    const { client } = await createTestPair(spellData());
    const result = await call(client, 'list-validators', {});

    expect(result.isError).not.toBe(true);

    const validators = JSON.parse(text(result)) as { name: string }[];

    expect(Array.isArray(validators)).toBe(true);
    expect(validators.length).toBeGreaterThan(0);
  });

  it('includes both pure and string-format validators', async () => {
    const { client } = await createTestPair(spellData());
    const result = await call(client, 'list-validators', {});
    const names = (JSON.parse(text(result)) as { name: string }[]).map((v) => v.name);

    expect(names).toContain('isString');
    expect(names).toContain('isEmail');
    expect(names).toContain('isUuid');
    expect(names).toContain('hasMinLength');
  });

  it('each entry has name, signature, description, and category', async () => {
    const { client } = await createTestPair(spellData());
    const result = await call(client, 'list-validators', {});
    const validators = JSON.parse(text(result)) as {
      category: string;
      description: string;
      name: string;
      signature: string;
    }[];

    for (const v of validators) {
      expect(typeof v.name).toBe('string');
      expect(typeof v.signature).toBe('string');
      expect(typeof v.description).toBe('string');
      expect(typeof v.category).toBe('string');
    }
  });

  it('accepts explicit slug "spell"', async () => {
    const { client } = await createTestPair(spellData());
    const result = await call(client, 'list-validators', { slug: 'spell' });

    expect(result.isError).not.toBe(true);
  });

  it('returns isError when spell package is absent from bundled data', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'list-validators', {});

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('spell');
  });
});

// ---------------------------------------------------------------------------
// get-type-signature
// ---------------------------------------------------------------------------

describe('get-type-signature', () => {
  const withSource = (): BundledData => ({
    packages: [
      makePkg({
        apiSource: [
          'export const debounce = (fn: () => void, ms: number) => fn;',
          'export type SearchOptions = { limit?: number; normalize?: boolean };',
          'export interface MemoOptions {',
          '  ttl?: number;',
          '  maxSize?: number;',
          '}',
          'export { throttle } from "./throttle.js";',
        ].join('\n'),
        slug: 'arsenal',
      }),
    ],
    schemaVersion: SYNTHETIC_DATA.schemaVersion,
    version: '0.0.0',
  });

  it('returns the declaration for a single-line const export', async () => {
    const { client } = await createTestPair(withSource());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'debounce' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('export const debounce');
  });

  it('returns the declaration for a type alias', async () => {
    const { client } = await createTestPair(withSource());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'SearchOptions' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('SearchOptions');
    expect(text(result)).toContain('limit');
  });

  it('returns the full multi-line block for an interface', async () => {
    const { client } = await createTestPair(withSource());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'MemoOptions' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('MemoOptions');
    expect(text(result)).toContain('ttl');
    expect(text(result)).toContain('maxSize');
  });

  it('returns the re-export line', async () => {
    const { client } = await createTestPair(withSource());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'throttle' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('throttle');
  });

  it('returns isError when symbol is not found', async () => {
    const { client } = await createTestPair(withSource());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'nonexistent' });

    expect(result.isError).toBe(true);
  });

  it('returns isError when package has no bundled source', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-type-signature', { slug: 'synthetic', symbol: 'syntheticFn' });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain('no bundled source');
  });

  it('returns isError for an unknown slug', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-type-signature', { slug: 'no-such', symbol: 'foo' });

    expect(result.isError).toBe(true);
  });
});
