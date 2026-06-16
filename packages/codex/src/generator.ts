import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// NOTE: These imports intentionally use .ts extensions (unlike other src/ files).
// This file is loaded transitively by scripts/generate-bundled-data.ts under Node's
// --experimental-strip-types, which resolves literal import specifiers — .ts is required
// to locate the source files at runtime. tsc rewrites these to .js in dist/ via
// rewriteRelativeImportExtensions in tsconfig.json.
import { parseFrontmatter } from './frontmatter.ts';
import { type BundledData, type BundledPackage, type CemDeclaration, DOC_PAGES, type DocPage } from './types.ts';

// Resolves to dist/ in the compiled build, src/ when loaded directly under --experimental-strip-types.
const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function readTextIfExists(filePath: string | null): string | null {
  return filePath && existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}

function resolveDocsFile(repoRoot: string, slug: string, page: DocPage): string | null {
  const candidates = [
    resolve(repoRoot, `docs/${slug}/${page}.md`),
    ...(page === 'index' ? [resolve(repoRoot, `packages/${slug}/README.md`)] : []),
  ];

  return candidates.find((c) => existsSync(c)) ?? null;
}

// ---------------------------------------------------------------------------
// Sigil CEM declarations
// ---------------------------------------------------------------------------

function readSigilDeclarations(repoRoot: string): CemDeclaration[] {
  const manifestPath = resolve(repoRoot, 'packages/sigil/dist/custom-elements.json');

  if (!existsSync(manifestPath)) return [];

  const manifest = readJson(manifestPath);
  const modules = Array.isArray(manifest['modules']) ? (manifest['modules'] as Record<string, unknown>[]) : [];

  return modules.flatMap((mod) =>
    Array.isArray(mod['declarations']) ? (mod['declarations'] as CemDeclaration[]) : [],
  );
}

// ---------------------------------------------------------------------------
// Incremental hashing
// ---------------------------------------------------------------------------

function hashPackageFiles(repoRoot: string, folder: string, slug: string): string {
  const paths = [
    resolve(repoRoot, folder, 'package.json'),
    resolve(repoRoot, folder, 'src/index.ts'),
    resolve(repoRoot, folder, 'README.md'),
    ...DOC_PAGES.flatMap((page) => {
      const f = resolveDocsFile(repoRoot, slug, page);

      return f ? [f] : [];
    }),
    // Include CEM manifest so a sigil-only component change invalidates the cache
    ...(slug === 'sigil' ? [resolve(repoRoot, 'packages/sigil/dist/custom-elements.json')] : []),
  ];

  const hash = createHash('sha256');

  for (const p of paths) {
    if (existsSync(p)) {
      hash.update(p);
      hash.update(readFileSync(p));
    }
  }

  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Package processor
// ---------------------------------------------------------------------------

interface RushProject {
  packageName: string;
  projectFolder: string;
}

function toStringArray(value: unknown, key?: string): string[] {
  if (Array.isArray(value)) {
    // parseFrontmatter always returns string[], but guard defensively for future callers.
    const nonStrings = value.filter((v) => typeof v !== 'string');

    if (nonStrings.length > 0) {
      process.stderr.write(
        `codex generator warning: frontmatter field "${key ?? 'unknown'}" contains non-string items (${nonStrings.map(String).join(', ')}) — coercing to string.\n`,
      );
    }

    return value.map(String);
  }

  return value ? [String(value)] : [];
}

function processPackage(repoRoot: string, project: RushProject, sigilComponents: CemDeclaration[]): BundledPackage {
  const slug = project.projectFolder.replace('packages/', '');
  const pkgJson = readJson(resolve(repoRoot, project.projectFolder, 'package.json'));
  const apiSource = readTextIfExists(resolve(repoRoot, project.projectFolder, 'src/index.ts'));
  const indexContent = readTextIfExists(resolveDocsFile(repoRoot, slug, 'index')) ?? '';
  const frontmatter = parseFrontmatter(indexContent);

  const docs: Partial<Record<DocPage, string>> = {};

  for (const page of DOC_PAGES) {
    const content = readTextIfExists(resolveDocsFile(repoRoot, slug, page));

    if (typeof content === 'string' && content.length > 0) {
      docs[page] = content;
    }
  }

  const availableDocPages = DOC_PAGES.filter((page) => docs[page] !== undefined);

  return {
    apiSource: typeof apiSource === 'string' && apiSource.length > 0 ? apiSource : null,
    availableDocPages,
    category: typeof frontmatter['category'] === 'string' ? frontmatter['category'] : '',
    components: slug === 'sigil' ? sigilComponents : [],
    description:
      typeof frontmatter['description'] === 'string' && frontmatter['description'].length > 0
        ? frontmatter['description']
        : typeof pkgJson['description'] === 'string'
          ? pkgJson['description']
          : '',
    docs,
    exports: toStringArray(frontmatter['exports'], 'exports'),
    keywords: toStringArray(frontmatter['keywords'], 'keywords'),
    name: String(project.packageName),
    related: toStringArray(frontmatter['related'], 'related'),
    slug,
    version: typeof pkgJson['version'] === 'string' ? pkgJson['version'] : '0.0.0',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorOptions {
  /** Enable hash-based incremental generation. Default: false. */
  incremental?: boolean;
  /** Monorepo root. Defaults to auto-detected from this module's location. */
  repoRoot?: string;
}

export interface GeneratorResult {
  data: BundledData;
  /**
   * Updated SHA-256 hashes for all packages. Present only when `incremental: true` was
   * used; the caller is responsible for persisting these to disk to enable future runs.
   */
  hashes?: Record<string, string>;
}

interface RushJson {
  projects: RushProject[];
}

export function generateBundledData(options: GeneratorOptions = {}): GeneratorResult {
  const packageRoot = resolve(__dirname, '..');
  const repoRoot = options.repoRoot ?? resolve(packageRoot, '../..');
  const incremental = options.incremental ?? false;

  const existingDataFile = resolve(packageRoot, 'data/vielzeug-data.json');
  const mcpPackageJson = readJson(resolve(packageRoot, 'package.json'));
  const rushJson = readJson(resolve(repoRoot, 'rush.json')) as unknown as RushJson;
  const sigilComponents = readSigilDeclarations(repoRoot);

  // Load incremental cache
  let hashCache: Record<string, string> = {};
  let existingPackages = new Map<string, BundledPackage>();

  if (incremental) {
    const cacheFile = resolve(packageRoot, 'data/.cache.json');

    if (existsSync(existingDataFile) && existsSync(cacheFile)) {
      try {
        hashCache = JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, string>;

        const existing = JSON.parse(readFileSync(existingDataFile, 'utf8')) as BundledData;

        existingPackages = new Map(existing.packages.map((p) => [p.slug, p]));
      } catch (err) {
        process.stderr.write(
          `codex: incremental cache read failed, falling back to full regeneration: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        hashCache = {};
        existingPackages = new Map();
      }
    }
  }

  let cacheHits = 0;
  const newHashes: Record<string, string> = {};

  const packages: BundledPackage[] = (rushJson.projects as RushProject[])
    .map((project) => {
      const slug = project.projectFolder.replace('packages/', '');

      if (incremental) {
        const currentHash = hashPackageFiles(repoRoot, project.projectFolder, slug);

        newHashes[slug] = currentHash;

        if (hashCache[slug] === currentHash) {
          const cached = existingPackages.get(slug);

          if (cached) {
            cacheHits++;

            // Always refresh sigil components — they come from dist/, not source files
            if (slug === 'sigil') return { ...cached, components: sigilComponents };

            return cached;
          }
        }
      }

      return processPackage(repoRoot, project, sigilComponents);
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (incremental && cacheHits > 0) {
    process.stderr.write(`Incremental: reused ${cacheHits}/${packages.length} packages from cache.\n`);
  }

  return {
    data: {
      packages,
      version: typeof mcpPackageJson['version'] === 'string' ? mcpPackageJson['version'] : '0.0.0',
    },
    ...(incremental && { hashes: newHashes }),
  };
}
