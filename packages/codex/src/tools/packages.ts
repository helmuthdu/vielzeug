import { detectConsumer } from '../consumer.js';
import { DOC_PAGES } from '../types.js';
import { EMPTY_SCHEMA, PACKAGE_SLUG_PROPERTY, parseArgs, type ToolSchema } from './schema.js';
import type { ToolDefinition } from './shared.js';

const slug = {
  additionalProperties: false,
  properties: { packageSlug: PACKAGE_SLUG_PROPERTY },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;
const docs = {
  additionalProperties: false,
  properties: {
    packageSlug: PACKAGE_SLUG_PROPERTY,
    page: { default: 'index', description: 'Documentation page', enum: DOC_PAGES, type: 'string' },
  },
  required: ['packageSlug'],
  type: 'object',
} satisfies ToolSchema;
const example = {
  additionalProperties: false,
  properties: {
    exampleId: { description: 'Example identifier', maxLength: 100, minLength: 1, type: 'string' },
    packageSlug: PACKAGE_SLUG_PROPERTY,
  },
  required: ['packageSlug', 'exampleId'],
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
    slug: PACKAGE_SLUG_PROPERTY,
    symbol: { description: 'Exported symbol name', maxLength: 200, minLength: 1, type: 'string' },
  },
  required: ['slug', 'symbol'],
  type: 'object',
} satisfies ToolSchema;
const drift = {
  additionalProperties: false,
  properties: {
    projectDir: {
      description: 'Project directory to inspect; defaults to the server working directory',
      maxLength: 500,
      minLength: 1,
      type: 'string',
    },
  },
  type: 'object',
} satisfies ToolSchema;

export const packageTools: readonly ToolDefinition[] = [
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
    description:
      'Search package metadata, docs, examples, and source. Results are relevance-tiered, then ordered by slug.',
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
  {
    description:
      'Compare the snapshot versions with the @vielzeug/* versions installed in a consumer project. Snapshot docs may lag the install.',
    execute: (args, catalog) => {
      const input = parseArgs(drift, args);
      const consumer = detectConsumer(input.projectDir);

      if (!consumer) {
        return { note: 'No package.json with @vielzeug/* dependencies was found.', packages: [], projectDir: null };
      }

      const snapshot = new Map(catalog.listPackages().map((meta) => [meta.name, meta.version]));

      return {
        packages: consumer.packages.map((entry) => {
          const snapshotVersion = snapshot.get(entry.name);
          // Link/workspace specifiers track a checkout; the snapshot cannot match them.
          const linked = !/^[~^0-9*]/.test(entry.declared);

          let status: string;

          if (linked) status = 'linked';
          else if (!snapshotVersion) status = 'not-in-snapshot';
          else if (entry.installed) status = entry.installed === snapshotVersion ? 'match' : 'drift';
          else status = entry.declared === snapshotVersion ? 'match' : 'unresolved';

          return {
            declared: entry.declared,
            installed: entry.installed ?? null,
            name: entry.name,
            snapshotVersion: snapshotVersion ?? null,
            status,
          };
        }),
        projectDir: consumer.projectDir,
      };
    },
    inputSchema: drift,
    name: 'check-install',
  },
];
