import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from '../../../scripts/lib/markdown.ts';
import { listPackageDirs } from '../../../scripts/vielzeug-packages.ts';
import {
  DOC_PAGES,
  type CemDeclaration,
  type DocPage,
  type PackageContent,
  type PackageMeta,
  type SearchRecord,
  SNAPSHOT_SCHEMA_VERSION,
  type SnapshotArtifacts,
  type SnapshotCatalog,
  type SnapshotManifest,
} from '../src/types.ts';
import { readReplExamples } from './repl-examples.ts';
import { extractExportedSignatures } from './type-signatures.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function text(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : [];
}

function docsFile(repoRoot: string, slug: string, page: DocPage): string | null {
  const candidates = [resolve(repoRoot, 'docs', slug, `${page}.md`), ...(page === 'index' ? [resolve(repoRoot, 'packages', slug, 'README.md')] : [])];
  return candidates.find(existsSync) ?? null;
}

function normalise(value: string): string {
  return value.toLowerCase().replaceAll('-', ' ');
}

function readRefineComponents(repoRoot: string): CemDeclaration[] {
  const file = resolve(repoRoot, 'packages/refine/dist/custom-elements.json');
  if (!existsSync(file)) return [];
  const manifest = readJson(file);
  const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
  return modules.flatMap((module) => {
    if (typeof module !== 'object' || module === null) return [];
    const declarations = (module as Record<string, unknown>).declarations;
    return Array.isArray(declarations) ? (declarations as CemDeclaration[]) : [];
  });
}

function buildPackage(repoRoot: string, project: string): { content: PackageContent; meta: PackageMeta; search: SearchRecord } {
  const slug = project.replace('packages/', '');
  const manifest = readJson(resolve(repoRoot, project, 'package.json'));
  const source = text(resolve(repoRoot, project, 'src/index.ts'));
  const index = text(docsFile(repoRoot, slug, 'index') ?? '') ?? '';
  const frontmatter = parseFrontmatter(index);
  const docs: Partial<Record<DocPage, string>> = {};
  for (const page of DOC_PAGES) {
    const content = text(docsFile(repoRoot, slug, page) ?? '');
    if (content) docs[page] = content;
  }
  const examples = readReplExamples(repoRoot, slug);
  const category = typeof frontmatter.category === 'string' ? frontmatter.category : '';
  const meta: PackageMeta = {
    availableDocPages: DOC_PAGES.filter((page) => docs[page] !== undefined),
    category,
    description: typeof frontmatter.description === 'string' ? frontmatter.description : String(manifest.description ?? ''),
    exampleIds: examples.map((example) => example.id),
    exports: stringArray(frontmatter.exports),
    hasSource: source !== null,
    keywords: stringArray(frontmatter.keywords),
    name: String(manifest.name),
    related: stringArray(frontmatter.related),
    slug,
    version: typeof manifest.version === 'string' ? manifest.version : '0.0.0',
  };
  const content: PackageContent = {
    apiSource: source,
    docs,
    examples,
    typeSignatures: source ? extractExportedSignatures(resolve(repoRoot, project, 'src/index.ts')) : {},
  };
  return {
    content,
    meta,
    search: {
      category: normalise(meta.category),
      description: normalise(meta.description),
      docs: Object.fromEntries(Object.entries(docs).map(([page, value]) => [page, normalise(value)])),
      examples: examples.map((example) => ({ id: example.id, text: normalise(`${example.name} ${example.code}`) })),
      exports: meta.exports.map(normalise).join(' '),
      keywords: meta.keywords.map(normalise).join(' '),
      name: meta.name,
      related: meta.related.map(normalise).join(' '),
      slug,
      source: source ? normalise(source) : null,
    },
  };
}

export interface GeneratorOptions {
  projects?: string[];
  repoRoot?: string;
}

export function generatorWatchRoots(repoRoot: string): string[] {
  return [resolve(repoRoot, 'docs'), resolve(repoRoot, 'packages')];
}

export function generateSnapshot(options: GeneratorOptions = {}): SnapshotArtifacts {
  const packageRoot = resolve(__dirname, '..');
  const repoRoot = options.repoRoot ?? resolve(packageRoot, '../..');
  const projects = options.projects ?? listPackageDirs(resolve(repoRoot, 'packages')).map((name) => `packages/${name}`);
  const built = projects.map((project) => buildPackage(repoRoot, project)).sort((left, right) => left.meta.slug.localeCompare(right.meta.slug));
  const packageManifest = readJson(resolve(packageRoot, 'package.json'));
  const version = typeof packageManifest.version === 'string' ? packageManifest.version : '0.0.0';
  const manifest: SnapshotManifest = {
    catalog: 'catalog.json',
    contentDirectory: 'packages',
    refine: 'refine.json',
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    search: 'search.json',
    version,
  };
  const catalog: SnapshotCatalog = { packages: built.map((entry) => entry.meta), version };
  return {
    catalog,
    contents: new Map(built.map((entry) => [entry.meta.slug, entry.content])),
    manifest,
    refineComponents: readRefineComponents(repoRoot),
    search: built.map((entry) => entry.search),
  };
}
