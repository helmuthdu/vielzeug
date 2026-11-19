import type { SearchHit } from '../catalog.js';
import type { PackageEntry } from '../types.js';
import { EMPTY_SCHEMA, parseArgs, SLUG_PROPERTY, type ToolSchema } from './schema.js';
import type { ToolDefinition } from './shared.js';

const slug = {
  additionalProperties: false,
  properties: { slug: SLUG_PROPERTY },
  required: ['slug'],
  type: 'object',
} satisfies ToolSchema;
const docs = {
  additionalProperties: false,
  properties: {
    page: {
      description: 'Documentation page, e.g. "index", "api", "components/button"',
      maxLength: 200,
      minLength: 1,
      type: 'string',
    },
    section: {
      description: 'Optional heading (or its slug) to return one section instead of the whole page',
      maxLength: 200,
      type: 'string',
    },
    slug: SLUG_PROPERTY,
  },
  required: ['slug', 'page'],
  type: 'object',
} satisfies ToolSchema;
const example = {
  additionalProperties: false,
  properties: {
    exampleId: { description: 'Example identifier', maxLength: 100, minLength: 1, type: 'string' },
    slug: SLUG_PROPERTY,
  },
  required: ['slug', 'exampleId'],
  type: 'object',
} satisfies ToolSchema;
const query = {
  additionalProperties: false,
  properties: { query: { description: 'Non-empty search query', maxLength: 500, minLength: 1, type: 'string' } },
  required: ['query'],
  type: 'object',
} satisfies ToolSchema;
const signature = {
  additionalProperties: false,
  properties: {
    slug: SLUG_PROPERTY,
    symbol: { description: 'Exported symbol name', maxLength: 200, minLength: 1, type: 'string' },
  },
  required: ['slug', 'symbol'],
  type: 'object',
} satisfies ToolSchema;

/** `get-package` output: everything discoverable about one package, without page bodies. */
function packageSummary(pkg: PackageEntry) {
  return {
    examples: pkg.examples.map(({ id, name }) => ({ id, name })),
    exports: pkg.exports.map((entry) => entry.name),
    meta: pkg.meta,
    pages: Object.keys(pkg.pages)
      .sort()
      .map((page) => ({ page, title: pkg.titles[page] ?? page })),
  };
}

export const packageTools: readonly ToolDefinition[] = [
  {
    description: 'List every Vielzeug package. Start here for package discovery.',
    execute: (_args, catalog) =>
      catalog.packages.map(({ meta }) => ({ description: meta.description, name: meta.name, slug: meta.slug })),
    inputSchema: EMPTY_SCHEMA,
    name: 'list-packages',
  },
  {
    description: 'Read metadata for one package: docs pages, example ids, and export names.',
    execute: (args, catalog) => packageSummary(catalog.getPackage(parseArgs(slug, args).slug)),
    inputSchema: slug,
    name: 'get-package',
  },
  {
    description: 'Read one documentation page as Markdown, optionally just one section of it.',
    execute: (args, catalog) => {
      const input = parseArgs(docs, args);

      return catalog.getDocs(input.slug, input.page, input.section).markdown;
    },
    inputSchema: docs,
    name: 'get-docs',
  },
  {
    description: 'Read one runnable REPL example.',
    execute: (args, catalog) => {
      const input = parseArgs(example, args);

      return catalog.getExample(input.slug, input.exampleId).code;
    },
    inputSchema: example,
    name: 'get-example',
  },
  {
    description: 'Read one exported TypeScript declaration with its JSDoc.',
    execute: (args, catalog) => {
      const input = parseArgs(signature, args);

      return catalog.getExport(input.slug, input.symbol);
    },
    inputSchema: signature,
    name: 'get-type-signature',
  },
  {
    description:
      'Search all docs by section. Every term must match inside one section; results are ranked and located, so follow up with get-docs and the section.',
    execute: (args, catalog): readonly Omit<SearchHit, 'score'>[] => {
      const hits = catalog.search(parseArgs(query, args).query);

      return hits.map(({ heading, page, section, slug: hitSlug, snippet }) => ({
        heading,
        page,
        section,
        slug: hitSlug,
        snippet,
      }));
    },
    inputSchema: query,
    name: 'search',
  },
];
