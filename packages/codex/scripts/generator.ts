import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .ts extensions required: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
import {
  type BundledData,
  type BundledPackage,
  type CemDeclaration,
  DOC_PAGES,
  type DocPage,
  SCHEMA_VERSION,
} from '../src/types.ts';
import { log } from './_log.ts';
import { parseFrontmatter } from './frontmatter.ts';

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
// Incremental hashing — content-only (no path in hash input)
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
      // FI2: hash only file content, not path — renames/moves don't invalidate the cache
      hash.update(readFileSync(p));
    }
  }

  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Package processor helpers
// ---------------------------------------------------------------------------

interface RushProject {
  packageName: string;
  projectFolder: string;
}

function toStringArray(value: unknown, key?: string): string[] {
  if (Array.isArray(value)) {
    const nonStrings = value.filter((v) => typeof v !== 'string');

    if (nonStrings.length > 0) {
      log(
        `generator: frontmatter field "${key ?? 'unknown'}" contains non-string items (${nonStrings.map(String).join(', ')}) — coercing to string`,
      );
    }

    return value.map(String);
  }

  return value ? [String(value)] : [];
}

/** Resolves a string value from frontmatter, falling back to a pkgJson value with an optional warning. */
function resolveStr(primary: unknown, fallback: unknown, field: string, slug: string): string {
  if (typeof primary === 'string' && primary.length > 0) return primary;

  if (typeof fallback === 'string' && fallback.length > 0) {
    log(`generator: "${slug}" has no "${field}" in frontmatter — falling back to package.json`);

    return fallback;
  }

  return '';
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

  // FI4: warn when a package has no doc pages — it will produce useless get-docs responses
  if (availableDocPages.length === 0) {
    log(`generator: "${slug}" has no doc pages — get-docs will always error for this package`);
  }

  return {
    apiSource: typeof apiSource === 'string' && apiSource.length > 0 ? apiSource : null,
    availableDocPages,
    category: typeof frontmatter['category'] === 'string' ? frontmatter['category'] : '',
    components: slug === 'sigil' ? sigilComponents : [],
    description: resolveStr(frontmatter['description'], pkgJson['description'], 'description', slug),
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
// Incremental cache loader
// ---------------------------------------------------------------------------

interface CacheState {
  existingPackages: Map<string, BundledPackage>;
  hashCache: Record<string, string>;
}

function loadIncrementalCache(packageRoot: string): CacheState {
  const dataFile = resolve(packageRoot, 'data/vielzeug-data.json');
  const cacheFile = resolve(packageRoot, 'data/.cache.json');

  if (!existsSync(dataFile) || !existsSync(cacheFile)) {
    return { existingPackages: new Map(), hashCache: {} };
  }

  try {
    const hashCache = JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, string>;
    const existingRaw = JSON.parse(readFileSync(dataFile, 'utf8')) as Record<string, unknown>;

    if (existingRaw['schemaVersion'] !== SCHEMA_VERSION) {
      log(
        `generator: schema version mismatch (found ${String(existingRaw['schemaVersion'])}, expected ${SCHEMA_VERSION}) — discarding cache`,
      );

      return { existingPackages: new Map(), hashCache: {} };
    }

    const existing = existingRaw as unknown as BundledData;

    return { existingPackages: new Map(existing.packages.map((p) => [p.slug, p])), hashCache };
  } catch (err) {
    log(
      `generator: incremental cache read failed, falling back to full regeneration: ${err instanceof Error ? err.message : String(err)}`,
    );

    return { existingPackages: new Map(), hashCache: {} };
  }
}

// ---------------------------------------------------------------------------
// Package builder
// ---------------------------------------------------------------------------

interface BuildPackagesResult {
  cacheHits: number;
  newHashes: Record<string, string>;
  packages: BundledPackage[];
}

function buildPackages(
  projects: RushProject[],
  opts: {
    existingPackages: Map<string, BundledPackage>;
    hashCache: Record<string, string>;
    incremental: boolean;
    repoRoot: string;
    sigilComponents: CemDeclaration[];
  },
): BuildPackagesResult {
  let cacheHits = 0;
  const newHashes: Record<string, string> = {};

  const packages: BundledPackage[] = projects
    .map((project) => {
      const slug = project.projectFolder.replace('packages/', '');

      if (opts.incremental) {
        const currentHash = hashPackageFiles(opts.repoRoot, project.projectFolder, slug);

        newHashes[slug] = currentHash;

        if (opts.hashCache[slug] === currentHash) {
          const cached = opts.existingPackages.get(slug);

          if (cached) {
            cacheHits++;

            return cached;
          }
        }
      }

      return processPackage(opts.repoRoot, project, opts.sigilComponents);
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  return { cacheHits, newHashes, packages };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratorOptions {
  /** Enable hash-based incremental generation. Default: false. */
  incremental?: boolean;
  /**
   * Explicit package list to process. When provided, Rush discovery (rush.json) is skipped entirely.
   * Useful for non-Rush setups and for isolated testing without touching the filesystem.
   */
  projects?: RushProject[];
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

  const mcpPackageJson = readJson(resolve(packageRoot, 'package.json'));
  const projects: RushProject[] =
    options.projects ?? (readJson(resolve(repoRoot, 'rush.json')) as unknown as RushJson).projects;
  const sigilComponents = readSigilDeclarations(repoRoot);

  const { existingPackages, hashCache } = incremental
    ? loadIncrementalCache(packageRoot)
    : { existingPackages: new Map<string, BundledPackage>(), hashCache: {} };

  const { cacheHits, newHashes, packages } = buildPackages(projects, {
    existingPackages,
    hashCache,
    incremental,
    repoRoot,
    sigilComponents,
  });

  if (incremental && cacheHits > 0) {
    log(`Incremental: reused ${cacheHits}/${packages.length} packages from cache`);
  }

  return {
    data: {
      packages,
      schemaVersion: SCHEMA_VERSION,
      version: typeof mcpPackageJson['version'] === 'string' ? mcpPackageJson['version'] : '0.0.0',
    },
    ...(incremental && { hashes: newHashes }),
  };
}
