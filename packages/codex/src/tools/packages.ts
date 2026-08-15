import { DOC_PAGES } from '../types.js';
import { EMPTY_SCHEMA, PACKAGE_SLUG_PROPERTY, parseArgs, type ToolSchema } from './schema.js';
import type { ToolDefinition } from './shared.js';

const slug = {
  properties: { packageSlug: PACKAGE_SLUG_PROPERTY },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;
const docs = {
  properties: {
    packageSlug: PACKAGE_SLUG_PROPERTY,
    page: { default: 'index', description: 'Documentation page', enum: DOC_PAGES, type: 'string' },
  },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;
const example = {
  properties: {
    exampleId: { description: 'Example identifier', maxLength: 100, minLength: 1, type: 'string' },
    packageSlug: PACKAGE_SLUG_PROPERTY,
  },
  required: ['packageSlug', 'exampleId'],
  type: 'object',
} satisfies ToolSchema;
const query = {
  properties: { query: { description: 'Non-empty search query', maxLength: 500, minLength: 1, type: 'string' } },
  required: ['query'],
  type: 'object',
} satisfies ToolSchema;
const signature = {
  properties: {
    slug: PACKAGE_SLUG_PROPERTY,
    symbol: { description: 'Exported symbol name', maxLength: 200, minLength: 1, type: 'string' },
  },
  required: ['slug', 'symbol'],
  type: 'object',
} satisfies ToolSchema;

export const packageTools: ToolDefinition[] = [
  {
    description: 'List every Vielzeug package. Start here for package discovery.',
    execute: (_args, catalog) => catalog.listPackages(),
    inputSchema: EMPTY_SCHEMA,
    name: 'list-packages',
  },
  {
    description: 'Read metadata for one package.',
    execute: (args, catalog) => catalog.getPackage(parseArgs(slug, args).packageSlug),
    inputSchema: slug,
    name: 'get-package',
  },
  {
    description: 'Read one documentation page as Markdown.',
    execute: (args, catalog) => {
      const input = parseArgs(docs, args);

      return catalog.getDocs(input.packageSlug, input.page);
    },
    inputSchema: docs,
    name: 'get-docs',
  },
  {
    description: 'Read bundled public source for one package.',
    execute: (args, catalog) => catalog.getSource(parseArgs(slug, args).packageSlug),
    inputSchema: slug,
    name: 'get-source',
  },
  {
    description: 'List runnable REPL examples for one package.',
    execute: (args, catalog) => catalog.listExamples(parseArgs(slug, args).packageSlug),
    inputSchema: slug,
    name: 'list-examples',
  },
  {
    description: 'Read one runnable REPL example.',
    execute: (args, catalog) => {
      const input = parseArgs(example, args);

      return catalog.getExample(input.packageSlug, input.exampleId).code;
    },
    inputSchema: example,
    name: 'get-example',
  },
  {
    description: 'Search package metadata, docs, examples, and source. Results use deterministic slug order.',
    execute: (args, catalog) => catalog.search(parseArgs(query, args).query),
    inputSchema: query,
    name: 'search-packages',
  },
  {
    description: 'Read one exported TypeScript declaration.',
    execute: (args, catalog) => {
      const input = parseArgs(signature, args);

      return catalog.getTypeSignature(input.slug, input.symbol);
    },
    inputSchema: signature,
    name: 'get-type-signature',
  },
];
