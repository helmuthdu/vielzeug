import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import { packageMeta } from './data.js';
import { scorePackage } from './search.js';
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

/** Extract a non-empty trimmed string arg or return null. */
function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToolContext {
  bySlug: Map<string, BundledPackage>;
  /** Null when /sigil was not built before data generation. */
  components: CemDeclaration[] | null;
  knownSlugs: string;
  packages: BundledPackage[];
}

// ---------------------------------------------------------------------------
// Tool definition shape
// ---------------------------------------------------------------------------

interface ToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
  run: (args: Record<string, unknown>, context: ToolContext) => CallToolResult;
}

// ---------------------------------------------------------------------------
// Tools — schema and handler collocated
// ---------------------------------------------------------------------------

// --- list-packages ---
// Replaces the old get-package tool: pass packageSlug to filter to a single result.

const listPackagesTool: ToolDefinition = {
  description:
    'List all vielzeug packages with metadata (version, description, category, keywords, exports, available doc pages). Pass packageSlug to filter to a single-item result array.',
  inputSchema: {
    properties: {
      packageSlug: {
        description: 'Optional: filter to one package by slug, e.g. "ripple"',
        minLength: 1,
        type: 'string',
      },
    },
    type: 'object',
  },
  name: 'list-packages',
  run(args, context) {
    const slug = str(args, 'packageSlug');

    if (slug !== null) {
      const pkg = context.bySlug.get(slug);

      if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${context.knownSlugs}`);

      return text(JSON.stringify([packageMeta(pkg)], null, 2));
    }

    return text(JSON.stringify(context.packages.map(packageMeta), null, 2));
  },
};

// --- get-docs ---

const getDocsTool: ToolDefinition = {
  description: 'Read package documentation by slug. Pages: index (default), api, usage, examples.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
      page: { description: 'Doc page to read (defaults to "index")', enum: [...DOC_PAGES], type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-docs',
  run(args, context) {
    const slug = str(args, 'packageSlug');

    if (!slug) return error('packageSlug: required non-empty string.');

    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${context.knownSlugs}`);

    const page = (str(args, 'page') ?? 'index') as (typeof DOC_PAGES)[number];

    if (!DOC_PAGES.includes(page)) return error(`page: must be one of ${DOC_PAGES.join(', ')}.`);

    const content = pkg.docs[page];

    if (!content) {
      return error(`No "${page}" page for "${slug}". Available: ${pkg.availableDocPages.join(', ') || 'none'}.`);
    }

    return text(content);
  },
};

// --- get-source ---

const getSourceTool: ToolDefinition = {
  description: 'Read the public API source (src/index.ts) for a vielzeug package.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-source',
  run(args, context) {
    const slug = str(args, 'packageSlug');

    if (!slug) return error('packageSlug: required non-empty string.');

    const pkg = context.bySlug.get(slug);

    if (!pkg) return error(`Package "${slug}" not found. Available slugs: ${context.knownSlugs}`);

    if (!pkg.apiSource) return error(`Package "${slug}" has no src/index.ts source in bundled data.`);

    return text(pkg.apiSource);
  },
};

// --- search-packages ---

const searchPackagesTool: ToolDefinition = {
  description:
    'Search packages by keyword across name, description, category, keywords, and docs. Returns ranked matches with all matched categories and pages.',
  inputSchema: {
    properties: { query: { description: 'Non-empty search term', minLength: 1, type: 'string' } },
    required: ['query'],
    type: 'object',
  },
  name: 'search-packages',
  run(args, context) {
    const query = str(args, 'query');

    if (!query) return error('query: required non-empty string.');

    const results = context.packages
      .map((pkg) => scorePackage(pkg, query))
      .filter((hit) => hit !== null)
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

    return text(JSON.stringify(results, null, 2));
  },
};

// --- list-components ---

const SIGIL_UNAVAILABLE =
  'Sigil component metadata is unavailable in this snapshot. If using the monorepo, build /sigil first then run prepare:data. Published releases include this data automatically.';

const listComponentsTool: ToolDefinition = {
  description: 'List all /sigil web component tags from bundled CEM metadata.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-components',
  run(_args, context) {
    if (!context.components) return error(SIGIL_UNAVAILABLE);

    const tags = context.components.filter((d) => d.tagName).map((d) => ({ name: d.name, tagName: d.tagName }));

    return text(JSON.stringify(tags, null, 2));
  },
};

// --- get-component ---

const getComponentTool: ToolDefinition = {
  description: 'Get a full /sigil component CEM declaration by HTML tag name.',
  inputSchema: {
    properties: {
      tagName: { description: 'HTML custom element tag, e.g. "bit-button"', minLength: 1, type: 'string' },
    },
    required: ['tagName'],
    type: 'object',
  },
  name: 'get-component',
  run(args, context) {
    const tagName = str(args, 'tagName');

    if (!tagName) return error('tagName: required non-empty string.');

    if (!context.components) return error(SIGIL_UNAVAILABLE);

    const declaration = context.components.find((d) => d.tagName === tagName);

    if (!declaration) {
      const available = context.components
        .filter((d) => d.tagName)
        .map((d) => d.tagName)
        .join(', ');

      return error(`Component "${tagName}" not found. Available tags: ${available}`);
    }

    return text(JSON.stringify(declaration, null, 2));
  },
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const TOOLS: ToolDefinition[] = [
  listPackagesTool,
  getDocsTool,
  getSourceTool,
  searchPackagesTool,
  listComponentsTool,
  getComponentTool,
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

export function registerTools(server: Server, data: BundledData): void {
  const sigilPkg = data.packages.find((p) => p.slug === 'sigil');

  const context: ToolContext = {
    bySlug: new Map(data.packages.map((pkg) => [pkg.slug, pkg])),
    components: sigilPkg && sigilPkg.components.length > 0 ? sigilPkg.components : null,
    knownSlugs: data.packages.map((pkg) => pkg.slug).join(', '),
    packages: data.packages,
  };

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: TOOLS.map((tool) => ({ description: tool.description, inputSchema: tool.inputSchema, name: tool.name })),
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = TOOL_MAP.get(request.params.name);

    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    return tool.run((request.params.arguments ?? {}) as Record<string, unknown>, context);
  });
}
