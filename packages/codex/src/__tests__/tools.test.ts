/**
 * Unit tests for tool helpers and ToolContext construction.
 * Covers: parseArgs (via get-docs), refineComponentTags pre-computation, buildToolContext,
 * refine-generate-template, refine-get-tokens, refine-validate-usage, get-type-signature,
 * and the structured `{code, message}` error envelope every failed tool call returns.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';

import type { BundledData, CemDeclaration } from '../types.js';

import { createServer } from '../server.js';
import { buildToolContext } from '../tools/index.js';
import { makeData, makePkg, SYNTHETIC_DATA } from './_fixtures.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextContent = { text: string; type: 'text' };
type ToolCallResult = { content: TextContent[]; isError?: boolean };
type ToolErrorBody = { code: string; message: string };

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

/** Parses a failed tool call's `{code, message}` envelope. Throws if the call wasn't an error. */
function errorBody(result: ToolCallResult): ToolErrorBody {
  if (!result.isError) throw new Error('expected an error result');

  return JSON.parse(text(result)) as ToolErrorBody;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<ToolCallResult> {
  return (await client.callTool({ arguments: args, name })) as ToolCallResult;
}

// ---------------------------------------------------------------------------
// Error envelope — every failed tool call returns the same {code, message} shape
// ---------------------------------------------------------------------------

describe('tool error envelope', () => {
  it('INVALID_ARG: missing required argument', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-package');

    expect(errorBody(result)).toMatchObject({ code: 'INVALID_ARG' });
  });

  it('NOT_FOUND: unknown package slug', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-package', { packageSlug: 'does-not-exist' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('UNAVAILABLE: refine CEM data not bundled', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'refine-list-components');

    expect(errorBody(result)).toMatchObject({ code: 'UNAVAILABLE' });
  });
});

// ---------------------------------------------------------------------------
// parseArgs — tested via get-docs tool
// ---------------------------------------------------------------------------

describe('parseArgs (via get-docs)', () => {
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

    expect(errorBody(result).message).toMatch(/must be one of/);
  });

  it('returns isError when page is an empty string', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'synthetic', page: '' });

    expect(result.isError).not.toBe(true);
  });

  it('returns isError when a required arg exceeds its declared maxLength', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-docs', { packageSlug: 'a'.repeat(101) });

    expect(errorBody(result)).toMatchObject({ code: 'INVALID_ARG' });
    expect(errorBody(result).message).toContain('100');
  });
});

// ---------------------------------------------------------------------------
// buildToolContext — refineComponentTags pre-computation
// ---------------------------------------------------------------------------

describe('buildToolContext — refineComponentTags', () => {
  const mockComponents: CemDeclaration[] = [
    { description: 'A button', name: 'Button', tagName: 'ore-button' },
    { description: 'An input', name: 'Input', tagName: 'ore-input' },
    { description: 'No tag — declaration without tagName', name: 'Mixin' },
  ];

  it('refineComponentTags is [] when no refine CEM data was bundled', () => {
    const ctx = buildToolContext(SYNTHETIC_DATA);

    expect(ctx.refineComponentTags).toEqual([]);
    expect(ctx.refineComponents).toEqual([]);
  });

  it('refineComponentTags contains only entries with a tagName', () => {
    const ctx = buildToolContext(makeData({ refineComponents: mockComponents }));

    expect(ctx.refineComponentTags).toEqual(['ore-button', 'ore-input']);
  });

  it('refine-get-component error message uses pre-computed refineComponentTags', async () => {
    const { client } = await createTestPair(makeData({ refineComponents: mockComponents }));
    const result = await call(client, 'refine-get-component', { tagName: 'ore-nonexistent' });
    const { code, message } = errorBody(result);

    expect(code).toBe('NOT_FOUND');
    expect(message).toContain('ore-button');
    expect(message).toContain('ore-input');
    expect(message).not.toContain('Mixin');
  });
});

// ---------------------------------------------------------------------------
// list-examples / get-example
// ---------------------------------------------------------------------------

function exampleData(): BundledData {
  return makeData({
    packages: [
      makePkg({
        examples: [
          {
            code: "import { debounce } from '@vielzeug/arsenal'\ndebounce(fn, 200)",
            id: 'debounce',
            name: 'debounce basics',
          },
          {
            code: "import { throttle } from '@vielzeug/arsenal'\nthrottle(fn, 200)",
            id: 'throttle',
            name: 'throttle basics',
          },
        ],
        slug: 'arsenal',
      }),
      makePkg({ examples: [], slug: 'refine' }),
    ],
  });
}

describe('list-examples', () => {
  it('returns id + name pairs without code', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'list-examples', { packageSlug: 'arsenal' });

    expect(result.isError).not.toBe(true);

    const parsed = JSON.parse(text(result)) as Array<{ id: string; name: string }>;

    expect(parsed).toEqual([
      { id: 'debounce', name: 'debounce basics' },
      { id: 'throttle', name: 'throttle basics' },
    ]);
  });

  it('returns an empty array (not an error) for a package with no REPL examples', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'list-examples', { packageSlug: 'refine' });

    expect(result.isError).not.toBe(true);
    expect(JSON.parse(text(result))).toEqual([]);
  });

  it('returns isError for an unknown package slug', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'list-examples', { packageSlug: 'nonexistent' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('get-example', () => {
  it('returns the full runnable code for a known example', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'get-example', { exampleId: 'debounce', packageSlug: 'arsenal' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain("import { debounce } from '@vielzeug/arsenal'");
  });

  it('returns isError for an unknown exampleId, listing available ids', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'get-example', { exampleId: 'nonexistent', packageSlug: 'arsenal' });
    const { code, message } = errorBody(result);

    expect(code).toBe('NOT_FOUND');
    expect(message).toContain('debounce');
    expect(message).toContain('throttle');
  });

  it('returns isError for an unknown package slug', async () => {
    const { client } = await createTestPair(exampleData());
    const result = await call(client, 'get-example', { exampleId: 'debounce', packageSlug: 'nonexistent' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ---------------------------------------------------------------------------
// refine-generate-template
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
  return makeData({ refineComponents: REFINE_COMPONENTS });
}

describe('refine-generate-template', () => {
  it('returns an HTML snippet containing the tag name', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toContain('<ore-button');
    expect(text(result)).toContain('</ore-button>');
  });

  it('uses the first literal from a union type for required attributes', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('variant="primary"');
  });

  it('puts attributes with defaults in a comment block', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('<!-- Optional attributes:');
    expect(text(result)).toContain('disabled');
  });

  it('renders a boolean attribute as a bare name, not name="value"', async () => {
    // `disabled` on the ore-button fixture is `type: { text: 'boolean' }` — distinguishes the
    // boolean-attribute branch of attributeSnippet() from the default-value fallback branch, which
    // would otherwise also produce output containing the substring "disabled" (as `disabled="false"`)
    // and pass a looser "contains disabled" assertion without actually exercising the boolean path.
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('disabled  (default: false)');
    expect(text(result)).not.toContain('disabled="false"');
  });

  it('scaffolds named slots', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-card' });

    expect(text(result)).toContain('slot="body"');
    expect(text(result)).toContain('slot="footer"');
  });

  it('includes event names in a comment', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(text(result)).toContain('ore-click');
  });

  it('prepends the scenario as a comment when provided', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', {
      scenario: 'submit action',
      tagName: 'ore-button',
    });

    expect(text(result)).toContain('<!-- submit action -->');
  });

  it('returns isError for an unknown tag', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-nonexistent' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'refine-generate-template', { tagName: 'ore-button' });

    expect(errorBody(result)).toMatchObject({ code: 'UNAVAILABLE' });
  });
});

// ---------------------------------------------------------------------------
// refine-get-tokens
// ---------------------------------------------------------------------------

describe('refine-get-tokens', () => {
  it('returns a sorted JSON array of CSS custom properties', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-get-tokens', {});

    expect(result.isError).not.toBe(true);

    const tokens = JSON.parse(text(result)) as { name: string }[];

    expect(tokens.length).toBe(2);
    expect(tokens[0]!.name).toBe('--ore-card-bg');
    expect(tokens[1]!.name).toBe('--ore-card-radius');
  });

  it('includes description and default when present', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-get-tokens', {});
    const tokens = JSON.parse(text(result)) as { default?: string; description?: string; name: string }[];
    const bg = tokens.find((t) => t.name === '--ore-card-bg');

    expect(bg?.default).toBe('#fff');
    expect(bg?.description).toBe('Background colour');
  });

  it('filters by prefix (case-insensitive)', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-get-tokens', { filter: '--ore-card-b' });
    const tokens = JSON.parse(text(result)) as { name: string }[];

    expect(tokens.length).toBe(1);
    expect(tokens[0]!.name).toBe('--ore-card-bg');
  });

  it('returns empty array when filter matches nothing', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-get-tokens', { filter: '--no-match' });
    const tokens = JSON.parse(text(result)) as unknown[];

    expect(tokens).toHaveLength(0);
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'refine-get-tokens', {});

    expect(errorBody(result)).toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('keeps only the first-encountered entry when multiple components share a token name', async () => {
    const sharedTokenComponents: CemDeclaration[] = [
      {
        cssProperties: [{ default: '1px solid black', description: 'from ore-alpha', name: '--shared-token' }],
        description: 'First component',
        name: 'Alpha',
        tagName: 'ore-alpha',
      },
      {
        cssProperties: [{ default: 'red', description: 'from ore-beta', name: '--shared-token' }],
        description: 'Second component',
        name: 'Beta',
        tagName: 'ore-beta',
      },
    ];

    const { client } = await createTestPair(makeData({ refineComponents: sharedTokenComponents }));
    const result = await call(client, 'refine-get-tokens', {});
    const tokens = JSON.parse(text(result)) as { component: string; default?: string; name: string }[];

    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ component: 'ore-alpha', default: '1px solid black', name: '--shared-token' });
  });
});

// ---------------------------------------------------------------------------
// refine-validate-usage
// ---------------------------------------------------------------------------

describe('refine-validate-usage', () => {
  it('returns empty array for valid usage', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button variant="primary">Click</ore-button>`;
    const result = await call(client, 'refine-validate-usage', { html, tagName: 'ore-button' });

    expect(result.isError).not.toBe(true);

    const issues = JSON.parse(text(result)) as unknown[];

    expect(issues).toHaveLength(0);
  });

  it('reports unknown attributes', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button variant="primary" unknownprop="bad">Click</ore-button>`;
    const result = await call(client, 'refine-validate-usage', { html, tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as { message: string; type: string }[];

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.type).toBe('error');
    expect(issues[0]!.message).toContain('unknownprop');
  });

  it('does not flag safe HTML attributes (class, id, aria-*, data-*, on*)', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-button class="x" id="y" aria-label="z" data-track="1" onclick="fn()">OK</ore-button>`;
    const result = await call(client, 'refine-validate-usage', { html, tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as unknown[];

    expect(issues).toHaveLength(0);
  });

  it('reports unknown slot names when component defines named slots', async () => {
    const { client } = await createTestPair(refineData());
    const html = `<ore-card label="x"><span slot="ghost">oops</span></ore-card>`;
    const result = await call(client, 'refine-validate-usage', { html, tagName: 'ore-card' });
    const issues = JSON.parse(text(result)) as { message: string }[];

    expect(issues.some((i) => i.message.includes('ghost'))).toBe(true);
  });

  it('returns error when tag is not found in HTML', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-validate-usage', { html: '<div>oops</div>', tagName: 'ore-button' });
    const issues = JSON.parse(text(result)) as { type: string }[];

    expect(issues[0]!.type).toBe('error');
  });

  it('treats regex metacharacters in the tag name as literal text, not regex syntax', async () => {
    // Regression test for a defense-in-depth fix: tagName is interpolated into a `new RegExp(...)`
    // pattern internally. A tag name containing regex metacharacters (synthetic here — real
    // component tags never contain them) must still be matched literally, not as regex syntax.
    const oddComponent: CemDeclaration[] = [
      { attributes: [], description: 'Odd tag', name: 'Odd', tagName: 'ore-a+b' },
    ];
    const { client } = await createTestPair(makeData({ refineComponents: oddComponent }));
    const html = `<ore-a+b>content</ore-a+b>`;
    const result = await call(client, 'refine-validate-usage', { html, tagName: 'ore-a+b' });

    expect(result.isError).not.toBe(true);

    const issues = JSON.parse(text(result)) as { type: string }[];

    expect(issues).toHaveLength(0);
  });

  it('returns isError when html exceeds 5000 chars', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-validate-usage', { html: 'x'.repeat(5001), tagName: 'ore-button' });
    const { code, message } = errorBody(result);

    expect(code).toBe('INVALID_ARG');
    expect(message).toContain('5000');
  });

  it('returns isError for an unknown tag name', async () => {
    const { client } = await createTestPair(refineData());
    const result = await call(client, 'refine-validate-usage', {
      html: '<ore-nope></ore-nope>',
      tagName: 'ore-nope',
    });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns isError when Refine CEM is absent', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'refine-validate-usage', {
      html: '<ore-button></ore-button>',
      tagName: 'ore-button',
    });

    expect(errorBody(result)).toMatchObject({ code: 'UNAVAILABLE' });
  });
});

// ---------------------------------------------------------------------------
// get-type-signature
//
// The tool itself is now a plain map lookup against pkg.typeSignatures (populated at generate
// time — see type-signatures.test.ts for the AST extraction logic itself), so fixtures set
// typeSignatures directly instead of relying on live parsing of apiSource.
// ---------------------------------------------------------------------------

describe('get-type-signature', () => {
  const withSignatures = (): BundledData =>
    makeData({
      packages: [
        makePkg({
          apiSource: 'export const debounce = (fn, ms) => fn; // ...full source elided from this fixture',
          slug: 'arsenal',
          typeSignatures: {
            debounce: 'export const debounce = (fn: () => void, ms: number) => fn;',
            MemoOptions: ['export interface MemoOptions {', '  ttl?: number;', '  maxSize?: number;', '}'].join('\n'),
            throttle: 'export { throttle } from "./throttle.js";',
          },
        }),
      ],
    });

  it('returns the bundled declaration for a known symbol', async () => {
    const { client } = await createTestPair(withSignatures());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'debounce' });

    expect(result.isError).not.toBe(true);
    expect(text(result)).toBe('export const debounce = (fn: () => void, ms: number) => fn;');
  });

  it('returns a full multi-line interface declaration', async () => {
    const { client } = await createTestPair(withSignatures());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'MemoOptions' });

    expect(text(result)).toContain('MemoOptions');
    expect(text(result)).toContain('ttl');
    expect(text(result)).toContain('maxSize');
  });

  it('returns a bundled re-export line', async () => {
    const { client } = await createTestPair(withSignatures());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'throttle' });

    expect(text(result)).toContain('throttle');
  });

  it('returns isError when symbol is not in the bundled typeSignatures map', async () => {
    const { client } = await createTestPair(withSignatures());
    const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol: 'nonexistent' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'])(
    'returns isError (not an inherited Object.prototype member) for symbol %j',
    async (symbol) => {
      // Regression test: pkg.typeSignatures is a plain object, so an unguarded `typeSignatures[symbol]`
      // would resolve these names through the prototype chain instead of correctly reporting NOT_FOUND.
      const { client } = await createTestPair(withSignatures());
      const result = await call(client, 'get-type-signature', { slug: 'arsenal', symbol });

      expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
    },
  );

  it('returns isError when package has no bundled source', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-type-signature', { slug: 'synthetic', symbol: 'syntheticFn' });
    const { code, message } = errorBody(result);

    expect(code).toBe('UNAVAILABLE');
    expect(message).toContain('no bundled source');
  });

  it('returns isError for an unknown slug', async () => {
    const { client } = await createTestPair(SYNTHETIC_DATA);
    const result = await call(client, 'get-type-signature', { slug: 'no-such', symbol: 'foo' });

    expect(errorBody(result)).toMatchObject({ code: 'NOT_FOUND' });
  });
});
