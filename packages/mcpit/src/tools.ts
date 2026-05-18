import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import { packageMeta } from './data.js';
import { DOC_PAGES, type BundledData, type BundledPackage, type CemDeclaration } from './types.js';

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function text(value: string): CallToolResult {
  return { content: [{ text: value, type: 'text' }] };
}

function error(message: string): CallToolResult {
  return { content: [{ text: message, type: 'text' }], isError: true };
}

const BUILDIT_UNAVAILABLE =
  'Buildit component metadata is unavailable in this snapshot. Build @vielzeug/buildit before generating MCP bundled data.';

/** Extract a non-empty trimmed string arg or return null. */
function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Tool schemas (JSON Schema, no Zod)
// ---------------------------------------------------------------------------

const EMPTY_INPUT = { properties: {}, type: 'object' } as const;
const SLUG_INPUT = {
  properties: { packageSlug: { description: 'Package folder name, e.g. "stateit"', minLength: 1, type: 'string' } },
  required: ['packageSlug'],
  type: 'object',
} as const;

interface ToolSchema {
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>, context: ToolContext) => CallToolResult;
}

interface ToolContext {
  bySlug: Map<string, BundledPackage>;
  knownSlugs: string;
  packages: BundledPackage[];
}

type PackageLookup = { ok: true; pkg: BundledPackage } | { ok: false; result: CallToolResult };

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function listPackages(_args: Record<string, unknown>, context: ToolContext): CallToolResult {
  return text(JSON.stringify(context.packages.map(packageMeta), null, 2));
}

function lookupPackage(args: Record<string, unknown>, context: ToolContext): PackageLookup {
  const slug = str(args, 'packageSlug');

  if (!slug) {
    return { ok: false, result: error('packageSlug: required non-empty string.') };
  }

  const pkg = context.bySlug.get(slug);

  if (!pkg) {
    return {
      ok: false,
      result: error(`Package "${slug}" not found. Available slugs: ${context.knownSlugs}`),
    };
  }

  return { ok: true, pkg };
}

function getPackage(args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const lookup = lookupPackage(args, context);

  if (!lookup.ok) {
    return lookup.result;
  }

  return text(JSON.stringify(packageMeta(lookup.pkg), null, 2));
}

function getDocs(args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const lookup = lookupPackage(args, context);

  if (!lookup.ok) {
    return lookup.result;
  }

  const page = (str(args, 'page') ?? 'index') as (typeof DOC_PAGES)[number];

  if (!DOC_PAGES.includes(page)) return error(`page: must be one of ${DOC_PAGES.join(', ')}.`);

  const content = lookup.pkg.docs[page];

  if (!content) {
    return error(`No docs found for "${lookup.pkg.slug}" page "${page}".`);
  }

  return text(content);
}

function getSource(args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const lookup = lookupPackage(args, context);

  if (!lookup.ok) {
    return lookup.result;
  }

  if (!lookup.pkg.apiSource) {
    return error(`Package "${lookup.pkg.slug}" has no src/index.ts source in bundled data.`);
  }

  return text(lookup.pkg.apiSource);
}

interface SearchHit {
  matchedIn: 'docs' | 'keywords' | 'metadata';
  matchedPage?: string;
  name: string;
  slug: string;
}

interface ScoredHit {
  hit: SearchHit;
  score: number;
}

function scorePackage(pkg: BundledPackage, term: string): ScoredHit | null {
  const has = (s: string) => s.toLowerCase().includes(term);

  if ([pkg.name, pkg.description, pkg.category].some(has)) {
    return {
      hit: { matchedIn: 'metadata', name: pkg.name, slug: pkg.slug },
      score: 3,
    };
  }

  if (pkg.keywords.some(has)) {
    return {
      hit: { matchedIn: 'keywords', name: pkg.name, slug: pkg.slug },
      score: 2,
    };
  }

  for (const page of pkg.availableDocPages) {
    const content = pkg.docs[page];

    if (typeof content === 'string' && has(content)) {
      return {
        hit: { matchedIn: 'docs', matchedPage: page, name: pkg.name, slug: pkg.slug },
        score: 1,
      };
    }
  }

  if (pkg.apiSource && has(pkg.apiSource)) {
    return {
      hit: { matchedIn: 'docs', matchedPage: 'source', name: pkg.name, slug: pkg.slug },
      score: 1,
    };
  }

  return null;
}

function searchPackages(args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const query = str(args, 'query');

  if (!query) return error('query: required non-empty string.');

  const term = query.toLowerCase();

  const results = context.packages
    .map((pkg) => scorePackage(pkg, term))
    .filter((entry): entry is ScoredHit => entry !== null)
    .sort((a, b) => b.score - a.score || a.hit.slug.localeCompare(b.hit.slug))
    .map((entry) => entry.hit);

  return text(JSON.stringify(results, null, 2));
}

function getBuilditComponents(context: ToolContext): CemDeclaration[] | null {
  const buildit = context.bySlug.get('buildit');

  if (!buildit || buildit.components.length === 0) {
    return null;
  }

  return buildit.components;
}

function listComponents(_args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const components = getBuilditComponents(context);

  if (!components) {
    return error(BUILDIT_UNAVAILABLE);
  }

  const tags = components.filter((d) => d.tagName).map((d) => ({ name: d.name, tagName: d.tagName }));

  return text(JSON.stringify(tags, null, 2));
}

function getComponent(args: Record<string, unknown>, context: ToolContext): CallToolResult {
  const tagName = str(args, 'tagName');

  if (!tagName) return error('tagName: required non-empty string.');

  const components = getBuilditComponents(context);

  if (!components) {
    return error(BUILDIT_UNAVAILABLE);
  }

  const declaration = components.find((d) => d.tagName === tagName);

  if (!declaration) {
    const available = components
      .filter((d) => d.tagName)
      .map((d) => d.tagName)
      .join(', ');

    return error(`Component "${tagName}" not found. Available tags: ${available}`);
  }

  return text(JSON.stringify(declaration, null, 2));
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const TOOLS = {
  'get-component': {
    description: 'Get a full buildit component declaration by HTML tag name.',
    inputSchema: {
      properties: {
        tagName: { description: 'HTML custom element tag, e.g. "bit-button"', minLength: 1, type: 'string' },
      },
      required: ['tagName'],
      type: 'object',
    },
    run: getComponent,
  },
  'get-docs': {
    description: 'Read package docs by slug. Pages: index (default), api, usage, examples.',
    inputSchema: {
      properties: {
        packageSlug: { description: 'Package folder name, e.g. "stateit"', minLength: 1, type: 'string' },
        page: { description: 'Doc page to read (defaults to "index")', enum: [...DOC_PAGES], type: 'string' },
      },
      required: ['packageSlug'],
      type: 'object',
    },
    run: getDocs,
  },
  'get-package': {
    description: 'Get structured metadata for one vielzeug package by slug.',
    inputSchema: SLUG_INPUT,
    run: getPackage,
  },
  'get-source': {
    description: 'Read the public API source (src/index.ts) for a vielzeug package.',
    inputSchema: SLUG_INPUT,
    run: getSource,
  },
  'list-components': {
    description: 'List all @vielzeug/buildit web component tags from bundled component metadata.',
    inputSchema: EMPTY_INPUT,
    run: listComponents,
  },
  'list-packages': {
    description:
      'List all vielzeug packages with versions, descriptions, categories, keywords, exports, and available doc pages.',
    inputSchema: EMPTY_INPUT,
    run: listPackages,
  },
  'search-packages': {
    description:
      'Search packages by keyword across name, description, category, keywords, and docs. Returns ranked matches.',
    inputSchema: {
      properties: { query: { description: 'Non-empty search term', minLength: 1, type: 'string' } },
      required: ['query'],
      type: 'object',
    },
    run: searchPackages,
  },
} as const satisfies Record<string, ToolSchema>;

type ToolName = keyof typeof TOOLS;

function isToolName(name: string): name is ToolName {
  return Object.hasOwn(TOOLS, name);
}

export function registerTools(server: Server, data: BundledData): void {
  const context: ToolContext = {
    bySlug: new Map(data.packages.map((pkg) => [pkg.slug, pkg])),
    knownSlugs: data.packages.map((pkg) => pkg.slug).join(', '),
    packages: data.packages,
  };

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: Object.entries(TOOLS).map(([name, tool]) => ({
      description: tool.description,
      inputSchema: tool.inputSchema,
      name,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const toolName = request.params.name;

    if (!isToolName(toolName)) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    return TOOLS[toolName].run(args, context);
  });
}
