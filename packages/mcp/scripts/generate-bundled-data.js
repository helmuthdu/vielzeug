#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DOC_PAGES } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// YAML frontmatter parser (F1)
// Handles: inline arrays [a,b,c], block sequences (- item), quoted strings,
// values containing colons, and CRLF line endings.
// ---------------------------------------------------------------------------
export function parseFrontmatter(markdown) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);

  if (!match?.[1]) return {};

  const lines = match[1].split(/\r?\n/);
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines and comments
    if (!line || line.trimStart().startsWith('#')) {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(':');

    if (colonIdx < 1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    // Inline array: keywords: [mcp, ai-agent, claude]
    if (rest.startsWith('[') && rest.endsWith(']')) {
      result[key] = rest
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
        .filter(Boolean);
      i++;
      continue;
    }

    // Empty value → look ahead for block sequence items (- item)
    if (rest === '') {
      const items = [];

      i++;

      while (i < lines.length) {
        const next = lines[i];

        if (!next) break;

        const trimmed = next.trim();

        if (trimmed.startsWith('- ')) {
          items.push(
            trimmed
              .slice(2)
              .replace(/^['"`]|['"`]$/g, '')
              .trim(),
          );
          i++;
        } else {
          break;
        }
      }

      if (items.length > 0) result[key] = items;

      continue;
    }

    // Regular string — strip surrounding quotes
    result[key] = rest.replace(/^['"`]|['"`]$/g, '');
    i++;
  }

  return result;
}
function toStringArray(value) {
  if (Array.isArray(value)) return value.map(String);

  return value ? [String(value)] : [];
}
// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
function readTextIfExists(filePath) {
  return filePath && existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
}
function resolveDocsFile(repoRoot, slug, page) {
  const candidates = [
    resolve(repoRoot, `docs/${slug}/${page}.md`),
    ...(page === 'index' ? [resolve(repoRoot, `packages/${slug}/README.md`)] : []),
  ];

  return candidates.find((c) => existsSync(c)) ?? null;
}
// ---------------------------------------------------------------------------
// Block CEM declarations
// ---------------------------------------------------------------------------
function readBuilditDeclarations(repoRoot) {
  const manifestPath = resolve(repoRoot, 'packages/block/dist/custom-elements.json');

  if (!existsSync(manifestPath)) return [];

  const manifest = readJson(manifestPath);
  const modules = Array.isArray(manifest['modules']) ? manifest['modules'] : [];

  return modules.flatMap((mod) => (Array.isArray(mod['declarations']) ? mod['declarations'] : []));
}
// ---------------------------------------------------------------------------
// Incremental hashing (F3)
// ---------------------------------------------------------------------------
function hashPackageFiles(repoRoot, folder, slug) {
  const paths = [
    resolve(repoRoot, folder, 'package.json'),
    resolve(repoRoot, folder, 'src/index.ts'),
    ...DOC_PAGES.flatMap((page) => {
      const f = resolveDocsFile(repoRoot, slug, page);

      return f ? [f] : [];
    }),
  ];
  const hash = createHash('sha256');

  for (const p of paths) {
    if (existsSync(p)) {
      hash.update(p); // include path so renames are detected
      hash.update(readFileSync(p));
    }
  }

  return hash.digest('hex');
}
function processPackage(repoRoot, project, builditComponents) {
  const slug = project.projectFolder.replace('packages/', '');
  const pkgJson = readJson(resolve(repoRoot, project.projectFolder, 'package.json'));
  const apiSource = readTextIfExists(resolve(repoRoot, project.projectFolder, 'src/index.ts'));
  const indexContent = readTextIfExists(resolveDocsFile(repoRoot, slug, 'index')) ?? '';
  const frontmatter = parseFrontmatter(indexContent);
  const docs = {};

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
    components: slug === 'block' ? builditComponents : [],
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
}
export function generateBundledData(options = {}) {
  const packageRoot = resolve(__dirname, '..');
  const repoRoot = options.repoRoot ?? resolve(packageRoot, '../..');
  const incremental = options.incremental ?? false;
  const cacheFile = resolve(packageRoot, 'data/.cache.json');
  const outputFile = resolve(packageRoot, 'data/vielzeug-data.json');
  const mcpPackageJson = readJson(resolve(packageRoot, 'package.json'));
  const rushJson = readJson(resolve(repoRoot, 'rush.json'));
  const builditComponents = readBuilditDeclarations(repoRoot);
  // Load incremental cache
  let hashCache = {};
  let existingPackages = new Map();

  if (incremental && existsSync(outputFile) && existsSync(cacheFile)) {
    try {
      hashCache = JSON.parse(readFileSync(cacheFile, 'utf8'));

      const existing = JSON.parse(readFileSync(outputFile, 'utf8'));

      existingPackages = new Map(existing.packages.map((p) => [p.slug, p]));
    } catch {
      // Corrupted cache — regenerate everything
      hashCache = {};
      existingPackages = new Map();
    }
  }

  let cacheHits = 0;
  const newHashCache = {};
  const packages = rushJson.projects
    .map((project) => {
      const slug = project.projectFolder.replace('packages/', '');
      const currentHash = hashPackageFiles(repoRoot, project.projectFolder, slug);

      newHashCache[slug] = currentHash;

      if (incremental && hashCache[slug] === currentHash) {
        const cached = existingPackages.get(slug);

        if (cached) {
          cacheHits++;

          // Always refresh block components — they come from dist/, not source
          if (slug === 'block') return { ...cached, components: builditComponents };

          return cached;
        }
      }

      return processPackage(repoRoot, project, builditComponents);
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (incremental) {
    if (cacheHits > 0) {
      process.stderr.write(`Incremental: reused ${cacheHits}/${packages.length} packages from cache.\n`);
    }

    // Persist updated hash cache for next run
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, `${JSON.stringify(newHashCache, null, 2)}\n`, 'utf8');
  }

  return {
    packages,
    version: typeof mcpPackageJson['version'] === 'string' ? mcpPackageJson['version'] : '0.0.0',
  };
}

// ---------------------------------------------------------------------------
// CLI entrypoint — only runs when executed directly
// ---------------------------------------------------------------------------
if (process.argv[1] === __filename) {
  const packageRoot = resolve(__dirname, '..');
  const outputFile = resolve(packageRoot, 'data/vielzeug-data.json');
  const bundledData = generateBundledData({ incremental: true });

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(bundledData, null, 2)}\n`, 'utf8');
  process.stderr.write(`Wrote bundled MCP data to ${outputFile}\n`);
}
//# sourceMappingURL=generate-bundled-data.js.map
