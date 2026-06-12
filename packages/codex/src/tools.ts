import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';

import { packageMeta } from './data.js';
import { scorePackage } from './search.js';
import { type BundledData, type BundledPackage, type CemDeclaration, DOC_PAGES } from './types.js';

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function text(value: string): CallToolResult {
  return { content: [{ text: value, type: 'text' }] };
}

function error(message: string): CallToolResult {
  return { content: [{ text: message, type: 'text' }], isError: true };
}

const MAX_ARG_LENGTH = 500;

/** Extract a non-empty trimmed string arg (max 500 chars) or return null. */
function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];

  if (typeof value !== 'string') return null;

  const trimmed = value.trim().slice(0, MAX_ARG_LENGTH);

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
  inputSchema: Tool['inputSchema'];
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
    'List all vielzeug packages with metadata (version, description, category, keywords, exports, availableDocPages, hasSource). Returns a JSON array of PackageMeta objects sorted by slug. Pass packageSlug to filter to a single-item array. Use this tool first to discover available packages, then call get-docs or get-source for details.',
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
  description:
    'Read a documentation page for a vielzeug package. Returns Markdown text. page defaults to "index" (overview + quick start). Use "api" for full API reference, "usage" for how-to guide, "examples" for recipe index. Check availableDocPages from list-packages before requesting a specific page.',
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
  description:
    'Read the full src/index.ts source of a vielzeug package. Returns TypeScript text with all exported function signatures, types, and JSDoc. Use this when you need exact type signatures or implementation details not covered by docs. Check hasSource from list-packages first — returns isError if no source is bundled.',
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
    'Search vielzeug packages by keyword across name, description, category, keywords, exports, docs, and source. Supports multi-word queries (all words must match). Returns a JSON array of SearchHit objects sorted by score descending. score: 3=metadata, 2=keywords/exports, 1=docs/source. Returns empty array (not an error) when nothing matches. Prefer this over list-packages when you know what you are looking for.',
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
  description:
    'List all @vielzeug/sigil web component tags from bundled Custom Elements Manifest (CEM) metadata. Returns a JSON array with tagName, description, and attrs (name, type, default). Use this to discover available components before calling get-component for full details. Returns isError if sigil was not built before data generation.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-components',
  run(_args, context) {
    if (!context.components) return error(SIGIL_UNAVAILABLE);

    const tags = context.components
      .filter((d) => d.tagName)
      .map((d) => ({
        attrs: (d.attributes ?? []).map((a) => ({
          name: a.name,
          type: a.type?.text ?? 'string',
          ...(a.default !== undefined && { default: a.default }),
        })),
        description: d.description ?? '',
        tagName: d.tagName,
      }));

    return text(JSON.stringify(tags, null, 2));
  },
};

// --- get-component ---

const getComponentTool: ToolDefinition = {
  description:
    'Get the full Custom Elements Manifest (CEM) declaration for a single @vielzeug/sigil component by its HTML tag name (e.g. "sg-button"). Returns a JSON object with attributes, events, slots, CSS parts, CSS properties, and member methods. Call list-components first to get valid tag names.',
  inputSchema: {
    properties: {
      tagName: { description: 'HTML custom element tag, e.g. "sg-button"', minLength: 1, type: 'string' },
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

    return tool.run(request.params.arguments ?? {}, context);
  });
}
