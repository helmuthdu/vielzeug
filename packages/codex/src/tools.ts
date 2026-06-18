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

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const MAX_ARG_LENGTH = 500;

type ArgResult = { ok: true; value: string } | { ok: false; reason: 'empty' | 'missing' | 'too-long' };

/** Reads a string arg: trims, validates presence and max length. Returns a tagged result. */
function readStr(args: Record<string, unknown>, key: string): ArgResult {
  const value = args[key];

  if (typeof value !== 'string') return { ok: false, reason: 'missing' };

  const trimmed = value.trim();

  if (trimmed.length === 0) return { ok: false, reason: 'empty' };

  if (trimmed.length > MAX_ARG_LENGTH) return { ok: false, reason: 'too-long' };

  return { ok: true, value: trimmed };
}

function argError(param: string, reason: 'empty' | 'missing' | 'too-long'): string {
  if (reason === 'too-long') return `${param}: exceeds ${MAX_ARG_LENGTH} character limit. Shorten the value.`;

  return `${param}: required non-empty string.`;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToolContext {
  bySlug: Map<string, BundledPackage>;
  /** Null when /sigil was not built before data generation. */
  components: CemDeclaration[] | null;
  packages: BundledPackage[];
}

function knownSlugs(context: ToolContext): string {
  return context.packages.map((p) => p.slug).join(', ');
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

const listPackagesTool: ToolDefinition = {
  description:
    'List all vielzeug packages with metadata (version, description, category, keywords, exports, availableDocPages, hasSource). Returns a JSON array of PackageMeta objects sorted by slug. Use this tool first to discover available packages, then call get-package for a single package, get-docs for docs, or get-source for source.',
  inputSchema: { properties: {}, type: 'object' },
  name: 'list-packages',
  run(_args, context) {
    return text(JSON.stringify(context.packages.map(packageMeta), null, 2));
  },
};

// --- get-package ---

const getPackageTool: ToolDefinition = {
  description:
    'Get metadata for a single vielzeug package by slug. Returns a PackageMeta object with version, description, category, keywords, exports, availableDocPages, and hasSource. Use list-packages first to discover available slugs.',
  inputSchema: {
    properties: {
      packageSlug: { description: 'Package folder name, e.g. "ripple"', minLength: 1, type: 'string' },
    },
    required: ['packageSlug'],
    type: 'object',
  },
  name: 'get-package',
  run(args, context) {
    const result = readStr(args, 'packageSlug');

    if (!result.ok) return error(argError('packageSlug', result.reason));

    const pkg = context.bySlug.get(result.value);

    if (!pkg) return error(`Package "${result.value}" not found. Available slugs: ${knownSlugs(context)}`);

    return text(JSON.stringify(packageMeta(pkg), null, 2));
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
    const slugResult = readStr(args, 'packageSlug');

    if (!slugResult.ok) return error(argError('packageSlug', slugResult.reason));

    const pkg = context.bySlug.get(slugResult.value);

    if (!pkg) return error(`Package "${slugResult.value}" not found. Available slugs: ${knownSlugs(context)}`);

    const pageResult = readStr(args, 'page');
    const page = (pageResult.ok ? pageResult.value : 'index') as (typeof DOC_PAGES)[number];

    if (!DOC_PAGES.includes(page)) return error(`page: must be one of ${DOC_PAGES.join(', ')}.`);

    const content = pkg.docs[page];

    if (!content) {
      return error(
        `No "${page}" page for "${slugResult.value}". Available: ${pkg.availableDocPages.join(', ') || 'none'}.`,
      );
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
    const result = readStr(args, 'packageSlug');

    if (!result.ok) return error(argError('packageSlug', result.reason));

    const pkg = context.bySlug.get(result.value);

    if (!pkg) return error(`Package "${result.value}" not found. Available slugs: ${knownSlugs(context)}`);

    if (!pkg.apiSource) return error(`Package "${result.value}" has no src/index.ts source in bundled data.`);

    return text(pkg.apiSource);
  },
};

// --- search-packages ---

const searchPackagesTool: ToolDefinition = {
  description:
    'Search vielzeug packages by keyword across name, description, category, keywords, exports, related, docs, and source. Supports multi-word queries (all words must match). Returns a JSON array of SearchHit objects sorted by score descending. score: 3=metadata, 2=keywords/exports/related, 1=docs/source. Returns empty array (not an error) when nothing matches. Prefer this over list-packages when you know what you are looking for.',
  inputSchema: {
    properties: { query: { description: 'Non-empty search term', minLength: 1, type: 'string' } },
    required: ['query'],
    type: 'object',
  },
  name: 'search-packages',
  run(args, context) {
    const result = readStr(args, 'query');

    if (!result.ok) return error(argError('query', result.reason));

    const results = context.packages
      .map((pkg) => scorePackage(pkg, result.value))
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
    const result = readStr(args, 'tagName');

    if (!result.ok) return error(argError('tagName', result.reason));

    if (!context.components) return error(SIGIL_UNAVAILABLE);

    const declaration = context.components.find((d) => d.tagName === result.value);

    if (!declaration) {
      const available = context.components
        .filter((d) => d.tagName)
        .map((d) => d.tagName)
        .join(', ');

      return error(`Component "${result.value}" not found. Available tags: ${available}`);
    }

    return text(JSON.stringify(declaration, null, 2));
  },
};

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const TOOLS: ToolDefinition[] = [
  listPackagesTool,
  getPackageTool,
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
