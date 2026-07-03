import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .ts extensions required below: this file runs under node --experimental-strip-types (scripts only, never compiled by tsc).
import { listPackageDirs } from '../../../scripts/vielzeug-packages.ts';
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
import { readReplExamples } from './repl-examples.ts';
import { extractExportedSignatures, resolveBarrelFiles } from './type-signatures.ts';

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

/** All files under a package's REPL examples directory, or [] if it has none. */
function replExampleFiles(repoRoot: string, slug: string): string[] {
  const dir = resolve(repoRoot, `docs/.vitepress/theme/components/repl/examples/${slug}`);

  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => resolve(dir, f));
}

// ---------------------------------------------------------------------------
// Refine CEM declarations
// ---------------------------------------------------------------------------

function readRefineDeclarations(repoRoot: string): CemDeclaration[] {
  const manifestPath = resolve(repoRoot, 'packages/refine/dist/custom-elements.json');

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
  const indexTsPath = resolve(repoRoot, folder, 'src/index.ts');
  const paths = [
    resolve(repoRoot, folder, 'package.json'),
    resolve(repoRoot, folder, 'README.md'),
    // Every file typeSignatures was extracted from — indexTsPath plus anything it re-exports
    // via `export * from`. Without this, editing a barrelled file (e.g. array/chunk.ts) would
    // leave the cached typeSignatures for that symbol stale until a full CODEX_FORCE_REGEN.
    ...(existsSync(indexTsPath) ? resolveBarrelFiles(indexTsPath) : []),
    ...DOC_PAGES.flatMap((page) => {
      const f = resolveDocsFile(repoRoot, slug, page);

      return f ? [f] : [];
    }),
    ...replExampleFiles(repoRoot, slug),
    // Include CEM manifest so a refine-only component change invalidates the cache
    ...(slug === 'refine' ? [resolve(repoRoot, 'packages/refine/dist/custom-elements.json')] : []),
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

/**
 * Scripts in this directory that do NOT feed into a bundled package entry's content, so a change
 * to them must not force a full incremental regeneration:
 * - `_log.ts` — logging only, never touches output data.
 * - `write-bundled-data.ts`, `generate-bundled-data.ts` — run the generator / persist its result;
 *   have no influence on `BundledPackage` shape or content themselves.
 * - `generate-tool-docs.ts` — reads compiled `dist/tools/`, unrelated to bundled data.
 * - `dev.ts`, `watch-data.ts` — local dev-loop orchestration only.
 * - `llms.ts` — derives `llms.txt`/`llms-full.txt` fresh from `result.data` on *every* run
 *   regardless of incremental caching (see `write-bundled-data.ts`), so its own output is never
 *   itself served stale from cache; no need to invalidate the package cache for it.
 *
 * Deliberately an exclude-list rather than an include-list: forgetting to *exclude* a new
 * data-independent script here only costs an extra (harmless) full regeneration; forgetting to
 * *include* a new logic-affecting script in an include-list would silently keep serving
 * output produced by outdated logic — the exclude-list fails safe, not silent.
 */
const GENERATOR_SCRIPT_EXCLUDES = new Set([
  '_log.ts',
  'dev.ts',
  'generate-bundled-data.ts',
  'generate-tool-docs.ts',
  'llms.ts',
  'watch-data.ts',
  'write-bundled-data.ts',
]);

/** Reserved hash-cache key for the generator-scripts hash — can never collide with a real package
 * slug (every slug is a real `packages/<slug>` folder name; none start with `__`). */
const GENERATOR_HASH_KEY = '__generator__';

/**
 * Hashes every generator script's own content (see `GENERATOR_SCRIPT_EXCLUDES` for what's left
 * out and why). `hashPackageFiles` only hashes each package's *inputs* (docs, source, examples) —
 * if the extraction *logic* itself changes (e.g. a rewrite of `extractExportedSignatures`), no
 * package's inputs changed, so every per-package cache entry would otherwise still "hit" and
 * silently keep serving output produced by the old logic. Comparing this hash against the previous
 * run's stored value (see `loadIncrementalCache`) forces a full regeneration whenever the scripts
 * themselves change, without requiring a manual `SCHEMA_VERSION` bump for every logic-only change
 * (that constant is reserved for actual `BundledData` shape changes).
 */
function hashGeneratorScripts(scriptsDir: string): string {
  const files = readdirSync(scriptsDir)
    .filter((f) => f.endsWith('.ts') && !GENERATOR_SCRIPT_EXCLUDES.has(f))
    .sort();

  const hash = createHash('sha256');

  for (const file of files) {
    hash.update(readFileSync(resolve(scriptsDir, file)));
  }

  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Package processor helpers
// ---------------------------------------------------------------------------

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

function processPackage(repoRoot: string, projectFolder: string): BundledPackage {
  const slug = projectFolder.replace('packages/', '');
  const pkgJson = readJson(resolve(repoRoot, projectFolder, 'package.json'));
  const indexTsPath = resolve(repoRoot, projectFolder, 'src/index.ts');
  const apiSource = readTextIfExists(indexTsPath);
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

  const source = typeof apiSource === 'string' && apiSource.length > 0 ? apiSource : null;
  const category = typeof frontmatter['category'] === 'string' ? frontmatter['category'] : '';

  // FI: warn when a package has no category — it silently falls into llms.txt's "general" bucket
  if (category.length === 0) {
    log(`generator: "${slug}" has no "category" in frontmatter — falling back to "general" in llms.txt`);
  }

  return {
    apiSource: source,
    availableDocPages,
    category,
    description: resolveStr(frontmatter['description'], pkgJson['description'], 'description', slug),
    docs,
    examples: readReplExamples(repoRoot, slug),
    exports: toStringArray(frontmatter['exports'], 'exports'),
    keywords: toStringArray(frontmatter['keywords'], 'keywords'),
    name: String(pkgJson['name']),
    related: toStringArray(frontmatter['related'], 'related'),
    slug,
    typeSignatures: source ? extractExportedSignatures(indexTsPath) : {},
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

function loadIncrementalCache(packageRoot: string, generatorHash: string): CacheState {
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

    if (hashCache[GENERATOR_HASH_KEY] !== generatorHash) {
      log('generator: generator scripts changed since last run — discarding cache');

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
  projectFolders: string[],
  opts: {
    existingPackages: Map<string, BundledPackage>;
    hashCache: Record<string, string>;
    incremental: boolean;
    repoRoot: string;
  },
): BuildPackagesResult {
  let cacheHits = 0;
  const newHashes: Record<string, string> = {};

  const packages: BundledPackage[] = projectFolders
    .map((projectFolder) => {
      const slug = projectFolder.replace('packages/', '');

      if (opts.incremental) {
        const currentHash = hashPackageFiles(opts.repoRoot, projectFolder, slug);

        newHashes[slug] = currentHash;

        if (opts.hashCache[slug] === currentHash) {
          const cached = opts.existingPackages.get(slug);

          if (cached) {
            cacheHits++;

            return cached;
          }
        }
      }

      return processPackage(opts.repoRoot, projectFolder);
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
   * Explicit project folder list (e.g. ['packages/arsenal']), relative to repoRoot. When
   * provided, filesystem discovery is skipped entirely. Useful for isolated testing without
   * touching the filesystem.
   */
  projects?: string[];
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

export function generateBundledData(options: GeneratorOptions = {}): GeneratorResult {
  const packageRoot = resolve(__dirname, '..');
  const repoRoot = options.repoRoot ?? resolve(packageRoot, '../..');
  const incremental = options.incremental ?? false;

  const mcpPackageJson = readJson(resolve(packageRoot, 'package.json'));
  // Every folder under packages/ with a package.json — unlike the browser-alias package list
  // used by docs tooling, codex documents every publishable package, including itself.
  const projects: string[] =
    options.projects ?? listPackageDirs(resolve(repoRoot, 'packages')).map((name) => `packages/${name}`);
  const refineComponents = readRefineDeclarations(repoRoot);
  const generatorHash = hashGeneratorScripts(__dirname);

  const { existingPackages, hashCache } = incremental
    ? loadIncrementalCache(packageRoot, generatorHash)
    : { existingPackages: new Map<string, BundledPackage>(), hashCache: {} };

  const { cacheHits, newHashes, packages } = buildPackages(projects, {
    existingPackages,
    hashCache,
    incremental,
    repoRoot,
  });

  if (incremental && cacheHits > 0) {
    log(`Incremental: reused ${cacheHits}/${packages.length} packages from cache`);
  }

  return {
    data: {
      packages,
      refineComponents,
      schemaVersion: SCHEMA_VERSION,
      version: typeof mcpPackageJson['version'] === 'string' ? mcpPackageJson['version'] : '0.0.0',
    },
    ...(incremental && { hashes: { ...newHashes, [GENERATOR_HASH_KEY]: generatorHash } }),
  };
}
