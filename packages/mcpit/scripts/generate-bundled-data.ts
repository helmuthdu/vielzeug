#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOC_PAGES, type BundledData, type BundledPackage, type CemDeclaration, type DocPage } from '../src/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const repoRoot = resolve(packageRoot, '../..');
const outputFile = resolve(packageRoot, 'data/vielzeug-data.json');

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(markdown: string): Record<string, string | string[]> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);

  if (!match) return {};

  const out: Record<string, string | string[]> = {};

  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');

    if (colon < 1) continue;

    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      out[key] = value
        .slice(1, -1)
        .split(',')
        .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      continue;
    }

    out[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return out;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  return value ? [String(value)] : [];
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function readTextIfExists(filePath: string | null): string | null {
  return filePath && existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}

function resolveDocsFile(slug: string, page: DocPage): string | null {
  const candidates = [
    resolve(repoRoot, `docs/${slug}/${page}.md`),
    ...(page === 'index' ? [resolve(repoRoot, `packages/${slug}/README.md`)] : []),
  ];

  return candidates.find((c) => existsSync(c)) ?? null;
}

// ---------------------------------------------------------------------------
// Buildit CEM declarations
// ---------------------------------------------------------------------------

function readBuilditDeclarations(): CemDeclaration[] {
  const manifestPath = resolve(repoRoot, 'packages/buildit/dist/custom-elements.json');

  if (!existsSync(manifestPath)) return [];

  const manifest = readJson(manifestPath);
  const modules = Array.isArray(manifest['modules']) ? (manifest['modules'] as Record<string, unknown>[]) : [];

  return modules.flatMap((mod) =>
    Array.isArray(mod['declarations']) ? (mod['declarations'] as CemDeclaration[]) : [],
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface RushProject {
  packageName: string;
  projectFolder: string;
}

interface RushJson {
  projects: RushProject[];
}

const rushJson = readJson(resolve(repoRoot, 'rush.json')) as unknown as RushJson;
const mcpitPackageJson = readJson(resolve(packageRoot, 'package.json'));
const builditComponents = readBuilditDeclarations();

const packages: BundledPackage[] = (rushJson.projects as RushProject[])
  .map((project) => {
    const slug = project.projectFolder.replace('packages/', '');
    const pkgJson = readJson(resolve(repoRoot, project.projectFolder, 'package.json'));
    const apiSource = readTextIfExists(resolve(repoRoot, project.projectFolder, 'src/index.ts'));
    const indexContent = readTextIfExists(resolveDocsFile(slug, 'index')) ?? '';
    const frontmatter = parseFrontmatter(indexContent);

    const docs: Partial<Record<DocPage, string>> = {};

    for (const page of DOC_PAGES) {
      const content = readTextIfExists(resolveDocsFile(slug, page));

      if (typeof content === 'string' && content.length > 0) {
        docs[page] = content;
      }
    }

    const availableDocPages = DOC_PAGES.filter((page) => docs[page] !== undefined);

    const pkg: BundledPackage = {
      apiSource: typeof apiSource === 'string' && apiSource.length > 0 ? apiSource : null,
      availableDocPages,
      category: typeof frontmatter['category'] === 'string' ? frontmatter['category'] : '',
      components: slug === 'buildit' ? builditComponents : [],
      description:
        typeof frontmatter['description'] === 'string' && frontmatter['description'].length > 0
          ? frontmatter['description']
          : typeof pkgJson['description'] === 'string'
            ? pkgJson['description']
            : '',
      docs,
      exports: toStringArray(frontmatter['exports']),
      keywords: toStringArray(frontmatter['keywords']),
      name: String(project.packageName),
      related: toStringArray(frontmatter['related']),
      slug,
      version: typeof pkgJson['version'] === 'string' ? pkgJson['version'] : null,
    };

    return pkg;
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const bundledData: BundledData = {
  mcpitVersion: typeof mcpitPackageJson['version'] === 'string' ? mcpitPackageJson['version'] : '0.0.0',
  packages,
};

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(bundledData, null, 2)}\n`, 'utf8');
process.stderr.write(`Wrote bundled MCP data to ${outputFile}\n`);
