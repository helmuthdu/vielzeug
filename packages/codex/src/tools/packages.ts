import { packageMeta } from '../data.js';
import { ToolError } from '../errors.js';
import { describeScoreTiers, scorePackage } from '../search.js';
import { DOC_PAGES } from '../types.js';
import { PACKAGE_SLUG_PROPERTY, parseArgs, type ToolSchema } from './schema.js';
import { requirePackage, text, type ToolDefinition } from './shared.js';

// ---------------------------------------------------------------------------
// list-packages
// ---------------------------------------------------------------------------

const listPackagesSchema = { properties: {}, type: 'object' } satisfies ToolSchema;

export const listPackagesTool: ToolDefinition = {
  description:
    'List all vielzeug packages with metadata (version, description, category, keywords, exports, availableDocPages, exampleIds, hasSource). Returns a JSON array of PackageMeta objects sorted by slug. Use this tool first to discover available packages, then call get-package for a single package, get-docs for docs, get-source for source, or get-example for a REPL example.',
  inputSchema: listPackagesSchema,
  name: 'list-packages',
  run(_args, context) {
    return text(JSON.stringify([...context.bySlug.values()].map(packageMeta), null, 2));
  },
};

// ---------------------------------------------------------------------------
// get-package
// ---------------------------------------------------------------------------

const getPackageSchema = {
  properties: { packageSlug: PACKAGE_SLUG_PROPERTY },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;

export const getPackageTool: ToolDefinition = {
  description:
    'Get metadata for a single vielzeug package by slug. Returns a PackageMeta object with version, description, category, keywords, exports, availableDocPages, exampleIds, and hasSource. Use list-packages first to discover available slugs.',
  inputSchema: getPackageSchema,
  name: 'get-package',
  run(args, context) {
    const { packageSlug } = parseArgs(getPackageSchema, args);
    const pkg = requirePackage(context, packageSlug);

    return text(JSON.stringify(packageMeta(pkg), null, 2));
  },
};

// ---------------------------------------------------------------------------
// get-docs
// ---------------------------------------------------------------------------

const getDocsSchema = {
  properties: {
    packageSlug: PACKAGE_SLUG_PROPERTY,
    page: { default: 'index', description: 'Doc page to read (defaults to "index")', enum: DOC_PAGES, type: 'string' },
  },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;

export const getDocsTool: ToolDefinition = {
  description:
    'Read a documentation page for a vielzeug package. Returns Markdown text. page defaults to "index" (overview + quick start). Use "api" for full API reference, "usage" for how-to guide, "examples" for recipe index. Check availableDocPages from list-packages before requesting a specific page.',
  inputSchema: getDocsSchema,
  name: 'get-docs',
  run(args, context) {
    const { packageSlug, page } = parseArgs(getDocsSchema, args);
    const pkg = requirePackage(context, packageSlug);
    const content = pkg.docs[page];

    if (!content) {
      throw new ToolError(
        'NOT_FOUND',
        `No "${page}" page for "${packageSlug}". Available: ${pkg.availableDocPages.join(', ') || 'none'}.`,
      );
    }

    return text(content);
  },
};

// ---------------------------------------------------------------------------
// get-source
// ---------------------------------------------------------------------------

const getSourceSchema = {
  properties: { packageSlug: PACKAGE_SLUG_PROPERTY },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;

export const getSourceTool: ToolDefinition = {
  description:
    'Read the full src/index.ts source of a vielzeug package. Returns TypeScript text with all exported function signatures, types, and JSDoc. Use this when you need exact type signatures or implementation details not covered by docs. Check hasSource from list-packages first — returns isError if no source is bundled.',
  inputSchema: getSourceSchema,
  name: 'get-source',
  run(args, context) {
    const { packageSlug } = parseArgs(getSourceSchema, args);
    const pkg = requirePackage(context, packageSlug);

    if (!pkg.apiSource)
      throw new ToolError('UNAVAILABLE', `Package "${packageSlug}" has no src/index.ts source in bundled data.`);

    return text(pkg.apiSource);
  },
};

// ---------------------------------------------------------------------------
// list-examples
// ---------------------------------------------------------------------------

const listExamplesSchema = {
  properties: { packageSlug: PACKAGE_SLUG_PROPERTY },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;

export const listExamplesTool: ToolDefinition = {
  description:
    'List runnable REPL code examples for a vielzeug package. Returns a JSON array of { id, name } (no code — use get-example for that). These are the same examples users can run interactively at vielzeug.dev/repl. Returns an empty array (not an error) for packages with no REPL examples (e.g. DOM-output packages like refine, prism, ore).',
  inputSchema: listExamplesSchema,
  name: 'list-examples',
  run(args, context) {
    const { packageSlug } = parseArgs(listExamplesSchema, args);
    const pkg = requirePackage(context, packageSlug);

    return text(
      JSON.stringify(
        pkg.examples.map(({ id, name }) => ({ id, name })),
        null,
        2,
      ),
    );
  },
};

// ---------------------------------------------------------------------------
// get-example
// ---------------------------------------------------------------------------

const getExampleSchema = {
  properties: {
    exampleId: { description: 'Example id, e.g. "function-debounce"', maxLength: 100, minLength: 1, type: 'string' },
    packageSlug: PACKAGE_SLUG_PROPERTY,
  },
  required: ['packageSlug', 'exampleId'],
  type: 'object',
} satisfies ToolSchema;

export const getExampleTool: ToolDefinition = {
  description:
    'Read the full runnable source code of a single REPL example for a vielzeug package. Returns TypeScript text. Use list-examples first to discover valid exampleId values for a package.',
  inputSchema: getExampleSchema,
  name: 'get-example',
  run(args, context) {
    const { exampleId, packageSlug } = parseArgs(getExampleSchema, args);
    const pkg = requirePackage(context, packageSlug);
    const example = pkg.examples.find((e) => e.id === exampleId);

    if (!example) {
      const available = pkg.examples.map((e) => e.id).join(', ') || 'none';

      throw new ToolError('NOT_FOUND', `No example "${exampleId}" for "${packageSlug}". Available: ${available}.`);
    }

    return text(example.code);
  },
};

// ---------------------------------------------------------------------------
// search-packages
// ---------------------------------------------------------------------------

const searchPackagesSchema = {
  properties: { query: { description: 'Non-empty search term', maxLength: 500, minLength: 1, type: 'string' } },
  required: ['query'],
  type: 'object',
} satisfies ToolSchema;

export const searchPackagesTool: ToolDefinition = {
  description: `Search vielzeug packages by keyword across name, description, category, keywords, exports, related, docs, REPL examples, and source. Supports multi-word queries (all words must match). Returns a JSON array of SearchHit objects sorted by score descending. score: ${describeScoreTiers()}. Returns empty array (not an error) when nothing matches. Prefer this over list-packages when you know what you are looking for.`,
  inputSchema: searchPackagesSchema,
  name: 'search-packages',
  run(args, context) {
    const { query } = parseArgs(searchPackagesSchema, args);
    const results = context.normalisedPackages
      .map((pkg) => scorePackage(pkg, query))
      .filter((hit) => hit !== null)
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

    return text(JSON.stringify(results, null, 2));
  },
};

// ---------------------------------------------------------------------------
// get-type-signature
// ---------------------------------------------------------------------------

const getTypeSignatureSchema = {
  properties: {
    slug: PACKAGE_SLUG_PROPERTY,
    symbol: {
      description: 'Exported name to look up, e.g. "debounce" or "SearchOptions"',
      maxLength: 200,
      minLength: 1,
      type: 'string',
    },
  },
  required: ['slug', 'symbol'],
  type: 'object',
} satisfies ToolSchema;

export const getTypeSignatureTool: ToolDefinition = {
  description:
    "Look up the exported TypeScript declaration for a named symbol from a @vielzeug package's bundled src/index.ts (extracted and indexed at build time, not parsed per-request). Returns the raw declaration text — useful for verifying the exact signature of a function, type alias, interface, or constant without loading the full source. Returns isError when the package has no bundled source or the symbol is not found.",
  inputSchema: getTypeSignatureSchema,
  name: 'get-type-signature',
  run(args, context) {
    const { slug, symbol } = parseArgs(getTypeSignatureSchema, args);
    const pkg = requirePackage(context, slug);

    if (!pkg.apiSource) throw new ToolError('UNAVAILABLE', `Package "${slug}" has no bundled source.`);

    // `Object.hasOwn` guard (not just `pkg.typeSignatures[symbol]` + truthiness): `symbol` is
    // arbitrary user input with no charset/enum restriction. Without this check, a symbol like
    // "__proto__", "constructor", or "toString" would resolve through the prototype chain to a
    // real (but never bundled) `Object.prototype` member — a truthy non-string value — bypassing
    // the not-found check below and returning a malformed result instead of a clean NOT_FOUND.
    if (!Object.hasOwn(pkg.typeSignatures, symbol)) {
      throw new ToolError('NOT_FOUND', `"${symbol}" not found in ${slug}/src/index.ts.`);
    }

    const declaration = pkg.typeSignatures[symbol];

    if (!declaration) throw new ToolError('NOT_FOUND', `"${symbol}" not found in ${slug}/src/index.ts.`);

    return text(declaration);
  },
};

export const packageTools: ToolDefinition[] = [
  listPackagesTool,
  getPackageTool,
  getDocsTool,
  getSourceTool,
  listExamplesTool,
  getExampleTool,
  searchPackagesTool,
  getTypeSignatureTool,
];
