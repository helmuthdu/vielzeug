import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CodexError } from './errors.js';
import {
  type CemDeclaration,
  DOC_PAGES,
  type DocPage,
  type Example,
  type PackageContent,
  type PackageMeta,
  type SearchRecord,
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotCatalog,
  type SnapshotManifest,
  type SnapshotPointer,
} from './types.js';

const DEFAULT_SNAPSHOT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const DOC_PAGE_SET = new Set<string>(DOC_PAGES);
const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;
const POINTER_DIRECTORY_PATTERN = /^snapshots\/[a-z0-9-]+$/;

function fail(path: string, message: string): never {
  throw new CodexError(`Invalid snapshot at ${path}: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'must be an object.');

  return value as Record<string, unknown>;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'must be a string.');

  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'must be a boolean.');

  return value;
}

function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    fail(path, 'must be an array of strings.');

  return value;
}

function json(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);

    throw new CodexError(`Failed to read snapshot file ${path}: ${detail}`, { cause: error });
  }
}

function equalStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function pageMap(value: unknown, path: string): Partial<Record<DocPage, string>> {
  const input = record(value, path);
  const pages: Partial<Record<DocPage, string>> = {};

  for (const [page, content] of Object.entries(input)) {
    if (!DOC_PAGE_SET.has(page)) fail(`${path}.${page}`, `unknown page; expected one of ${DOC_PAGES.join(', ')}.`);

    pages[page as DocPage] = string(content, `${path}.${page}`);
  }

  return pages;
}

function examples(value: unknown, path: string): Example[] {
  if (!Array.isArray(value)) fail(path, 'must be an array.');

  const ids = new Set<string>();

  return value.map((item, index) => {
    const entry = record(item, `${path}[${index}]`);
    const id = string(entry.id, `${path}[${index}].id`);

    if (ids.has(id)) fail(`${path}[${index}].id`, `duplicates ${id}.`);

    ids.add(id);

    return {
      code: string(entry.code, `${path}[${index}].code`),
      id,
      name: string(entry.name, `${path}[${index}].name`),
    };
  });
}

export function parsePointer(value: unknown): SnapshotPointer {
  const pointer = record(value, 'current.json');
  const directory = string(pointer.directory, 'current.json.directory');

  if (!POINTER_DIRECTORY_PATTERN.test(directory))
    fail('current.json.directory', 'must reference one snapshot directory.');

  return { directory };
}

export function parseManifest(value: unknown): SnapshotManifest {
  const manifest = record(value, 'manifest.json');

  if (manifest.schemaVersion !== SNAPSHOT_SCHEMA_VERSION)
    fail('manifest.json.schemaVersion', `must equal ${SNAPSHOT_SCHEMA_VERSION}.`);

  if (
    manifest.catalog !== 'catalog.json' ||
    manifest.search !== 'search.json' ||
    manifest.contentDirectory !== 'packages'
  )
    fail('manifest.json', 'has unsupported file layout.');

  if (manifest.refine !== null && manifest.refine !== 'refine.json')
    fail('manifest.json.refine', 'must be null or "refine.json".');

  return {
    catalog: 'catalog.json',
    contentDirectory: 'packages',
    refine: manifest.refine as 'refine.json' | null,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    search: 'search.json',
    version: string(manifest.version, 'manifest.json.version'),
  };
}

export function parseCatalog(value: unknown): SnapshotCatalog {
  const input = record(value, 'catalog.json');

  if (!Array.isArray(input.packages)) fail('catalog.json.packages', 'must be an array.');

  const slugs = new Set<string>();
  const packages = input.packages.map((item, index) => {
    const path = `catalog.json.packages[${index}]`;
    const entry = record(item, path);
    const slug = string(entry.slug, `${path}.slug`);

    if (!SLUG_PATTERN.test(slug)) fail(`${path}.slug`, 'must be a lowercase package slug.');

    if (slugs.has(slug)) fail(`${path}.slug`, `duplicates ${slug}.`);

    slugs.add(slug);

    const pages = strings(entry.availableDocPages, `${path}.availableDocPages`);

    if (pages.some((page) => !DOC_PAGE_SET.has(page))) fail(`${path}.availableDocPages`, 'contains unknown page.');

    return {
      availableDocPages: pages as DocPage[],
      category: string(entry.category, `${path}.category`),
      description: string(entry.description, `${path}.description`),
      exampleIds: strings(entry.exampleIds, `${path}.exampleIds`),
      exports: strings(entry.exports, `${path}.exports`),
      hasSource: boolean(entry.hasSource, `${path}.hasSource`),
      keywords: strings(entry.keywords, `${path}.keywords`),
      name: string(entry.name, `${path}.name`),
      related: strings(entry.related, `${path}.related`),
      slug,
      version: string(entry.version, `${path}.version`),
    } satisfies PackageMeta;
  });

  return { packages, version: string(input.version, 'catalog.json.version') };
}

export function parseContent(value: unknown, slug: string): PackageContent {
  const path = `packages/${slug}.json`;
  const input = record(value, path);

  if (input.apiSource !== null && typeof input.apiSource !== 'string')
    fail(`${path}.apiSource`, 'must be a string or null.');

  const signatures = record(input.typeSignatures, `${path}.typeSignatures`);

  for (const [name, text] of Object.entries(signatures)) string(text, `${path}.typeSignatures.${name}`);

  return {
    apiSource: input.apiSource as string | null,
    docs: pageMap(input.docs, `${path}.docs`),
    examples: examples(input.examples, `${path}.examples`),
    typeSignatures: signatures as Record<string, string>,
  };
}

export function parseSearch(value: unknown, catalog: SnapshotCatalog): SearchRecord[] {
  if (!Array.isArray(value)) fail('search.json', 'must be an array.');

  const catalogSlugs = new Set(catalog.packages.map((pkg) => pkg.slug));
  const seen = new Set<string>();
  const records = value.map((item, index) => {
    const path = `search.json[${index}]`;
    const entry = record(item, path);
    const slug = string(entry.slug, `${path}.slug`);

    if (!catalogSlugs.has(slug)) fail(`${path}.slug`, 'does not exist in catalog.');

    if (seen.has(slug)) fail(`${path}.slug`, `duplicates ${slug}.`);

    seen.add(slug);

    if (!Array.isArray(entry.examples)) fail(`${path}.examples`, 'must be an array.');

    return {
      category: string(entry.category, `${path}.category`),
      description: string(entry.description, `${path}.description`),
      docs: pageMap(entry.docs, `${path}.docs`),
      examples: entry.examples.map((example, exampleIndex) => {
        const value = record(example, `${path}.examples[${exampleIndex}]`);

        return {
          id: string(value.id, `${path}.examples[${exampleIndex}].id`),
          text: string(value.text, `${path}.examples[${exampleIndex}].text`),
        };
      }),
      exports: string(entry.exports, `${path}.exports`),
      keywords: string(entry.keywords, `${path}.keywords`),
      name: string(entry.name, `${path}.name`),
      related: string(entry.related, `${path}.related`),
      slug,
      source: entry.source === null ? null : string(entry.source, `${path}.source`),
    } satisfies SearchRecord;
  });

  if (records.length !== catalog.packages.length) fail('search.json', 'must have one record per catalog package.');

  return records;
}

export function parseRefine(value: unknown): CemDeclaration[] {
  if (!Array.isArray(value)) fail('refine.json', 'must be an array.');

  return value.map((item, index) => {
    const declaration = record(item, `refine.json[${index}]`) as CemDeclaration;

    if (declaration.tagName !== undefined && typeof declaration.tagName !== 'string')
      fail(`refine.json[${index}].tagName`, 'must be a string.');

    return declaration;
  });
}

export interface LoadedSnapshot {
  catalog: SnapshotCatalog;
  contentDirectory: string;
  manifest: SnapshotManifest;
  refineComponents: CemDeclaration[];
  search: SearchRecord[];
}

function validateContent(meta: PackageMeta, content: PackageContent): void {
  const pages = Object.keys(content.docs).sort();
  const expectedPages = [...meta.availableDocPages].sort();

  if (!equalStrings(pages, expectedPages))
    fail(`packages/${meta.slug}.json.docs`, 'does not match catalog availableDocPages.');

  const exampleIds = content.examples.map((example) => example.id).sort();
  const expectedExampleIds = [...meta.exampleIds].sort();

  if (!equalStrings(exampleIds, expectedExampleIds))
    fail(`packages/${meta.slug}.json.examples`, 'does not match catalog exampleIds.');

  if ((content.apiSource !== null) !== meta.hasSource)
    fail(`packages/${meta.slug}.json.apiSource`, 'does not match catalog hasSource.');
}

export function loadSnapshotDirectory(directory: string, options: { validateContents?: boolean } = {}): LoadedSnapshot {
  const manifest = parseManifest(json(resolve(directory, 'manifest.json')));
  const catalog = parseCatalog(json(resolve(directory, manifest.catalog)));

  if (catalog.version !== manifest.version) fail('catalog.json.version', 'does not match manifest version.');

  const search = parseSearch(json(resolve(directory, manifest.search)), catalog);
  const refineComponents = manifest.refine ? parseRefine(json(resolve(directory, manifest.refine))) : [];
  const contentDirectory = resolve(directory, manifest.contentDirectory);

  if (options.validateContents ?? false) {
    for (const meta of catalog.packages)
      validateContent(meta, parseContent(json(resolve(contentDirectory, `${meta.slug}.json`)), meta.slug));
  }

  return { catalog, contentDirectory, manifest, refineComponents, search };
}

export function loadSnapshot(
  snapshotRoot = DEFAULT_SNAPSHOT_ROOT,
  options: { validateContents?: boolean } = {},
): LoadedSnapshot {
  if (!existsSync(snapshotRoot))
    throw new CodexError(
      `Snapshot root not found: ${snapshotRoot}. Reinstall @vielzeug/codex or build it from source.`,
    );

  const pointerFile = resolve(snapshotRoot, 'current.json');
  const directory = existsSync(pointerFile)
    ? resolve(snapshotRoot, parsePointer(json(pointerFile)).directory)
    : snapshotRoot;

  return loadSnapshotDirectory(directory, options);
}

export function validateSnapshot(snapshotRoot = DEFAULT_SNAPSHOT_ROOT): void {
  loadSnapshot(snapshotRoot, { validateContents: true });
}
