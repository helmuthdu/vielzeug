#!/usr/bin/env node
// Keeps the derived parts of the agent contract in sync with their sources:
//   - .agents/reference/packages.md            ← packages/*/package.json (name, description, graph)
//   - .agents/reference/packages.md            ← same manifests (navigation table: subpaths, docs, scripts)
//   - packages/codex/skills/vielzeug/SKILL.md  ← same manifests (flat package list for consumers)
//   - AGENTS.md (root)                         ← every AGENTS.md in the repo plus its "Read when:" line
// and validates that every `.agents/...` path referenced anywhere in the repo resolves to a
// real file, plus the repo paths and `bun run` scripts cited by AGENTS.md files and the
// recipes: see "Reference integrity" and "Citation integrity" below. There is deliberately no
// curated JSON layer: package facts live in manifests and task procedures live as skills.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, replaceBetweenMarkers, syncFile } from './lib/marker-sync.mjs';
import { readPackageManifests } from './lib/packages.mjs';

// ---------------------------------------------------------------------------
// Packages: the generated one-page view of packages/*/package.json.
// ---------------------------------------------------------------------------

export function readLivePackages(root = ROOT) {
  return readPackageManifests(path.join(root, 'packages')).map(
    ({ dependencies, description, name, peers, scripts, slug, subpaths }) => ({
      dependencies,
      description,
      name,
      optionalPeers: peers.filter((peer) => peer.optional).map((peer) => peer.name),
      peerDependencies: peers
        .filter((peer) => !peer.optional && !dependencies.includes(peer.name))
        .map((peer) => peer.name),
      scripts,
      slug,
      subpaths,
    }),
  );
}

export function renderPackagesTable(packages) {
  const header = ['Package', 'Description', 'Dependencies', 'Required peers', 'Optional peers'];
  const list = (items) => (items?.length > 0 ? items.map((dep) => `\`${dep}\``).join(', ') : 'N/A');
  const rows = packages.map((pkg) => [
    `\`${pkg.name}\``,
    pkg.description || 'N/A',
    list(pkg.dependencies),
    list(pkg.peerDependencies),
    list(pkg.optionalPeers),
  ]);
  const row = (cells) => `| ${cells.join(' | ')} |`;
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

export function patchPackagesReference(source, packages) {
  return replaceBetweenMarkers(
    source,
    '<!-- GENERATED:packages-table:BEGIN -->',
    '<!-- GENERATED:packages-table:END -->',
    renderPackagesTable(packages),
  );
}

// ---------------------------------------------------------------------------
// Consumer skill: the `vielzeug` skill shipped inside @vielzeug/codex carries a flat
// "what exists" list so agents in downstream projects can map a need to a package even
// without the MCP server. Tooling-only packages are excluded (codex is the server itself).
// ---------------------------------------------------------------------------

export const SKILL_PATH = 'packages/codex/skills/vielzeug/SKILL.md';
const SKILL_EXCLUDED_SLUGS = new Set(['codex']);

export function renderSkillPackages(packages) {
  return packages
    .filter((pkg) => !SKILL_EXCLUDED_SLUGS.has(pkg.slug))
    .map((pkg) => `- \`${pkg.name}\`: ${pkg.description || 'N/A'}`)
    .join('\n');
}

export function patchSkillPackages(source, packages) {
  return replaceBetweenMarkers(
    source,
    '<!-- GENERATED:skill-packages:BEGIN -->',
    '<!-- GENERATED:skill-packages:END -->',
    renderSkillPackages(packages),
  );
}

// ---------------------------------------------------------------------------
// Navigation table: "where do I look for package X" in one pass — public subpaths, docs
// directory, local AGENTS.md, and the non-default test scripts. Derived from the same
// manifests plus the filesystem, so it can't drift from what ships.
// ---------------------------------------------------------------------------

/** Scripts worth surfacing because agents must know they exist; everything else is the
 * standard build/lint/test set every package has. */
const NOTABLE_SCRIPTS = ['build:e2e', 'test:e2e', 'test:integration', 'test:types', 'typecheck'];

export function renderPackagesNavigation(packages, { hasDocs, hasAgents }) {
  const header = ['Package', 'Subpaths', 'Docs', 'Local AGENTS.md', 'Extra scripts'];
  const row = (cells) => `| ${cells.join(' | ')} |`;
  const rows = packages.map((pkg) => {
    const subpaths = pkg.subpaths.filter((sub) => sub !== '.');
    const scripts = pkg.scripts.filter((name) => NOTABLE_SCRIPTS.includes(name));
    return [
      `\`${pkg.name}\``,
      subpaths.length > 0 ? subpaths.map((sub) => `\`${pkg.name}${sub.slice(1)}\``).join(', ') : 'root only',
      hasDocs(pkg.slug) ? `[\`docs/${pkg.slug}/\`](../../docs/${pkg.slug}/)` : 'N/A',
      hasAgents(pkg.slug) ? `[\`packages/${pkg.slug}/AGENTS.md\`](../../packages/${pkg.slug}/AGENTS.md)` : 'N/A',
      scripts.length > 0 ? scripts.map((name) => `\`${name}\``).join(', ') : 'N/A',
    ];
  });
  return [row(header), row(header.map(() => '---')), ...rows.map(row)].join('\n');
}

export function patchPackagesNavigation(source, packages, { hasDocs, hasAgents }) {
  return replaceBetweenMarkers(
    source,
    '<!-- GENERATED:packages-navigation:BEGIN -->',
    '<!-- GENERATED:packages-navigation:END -->',
    renderPackagesNavigation(packages, { hasDocs, hasAgents }),
  );
}

// ---------------------------------------------------------------------------
// Subtree index: most clients only auto-load the root AGENTS.md, so a subtree file matters
// only if the root index says *when* to read it. Each subtree AGENTS.md therefore carries a
// "> Read when: ..." line right after its title, and the index below is generated from those
// lines: one source of truth, no hand-maintained list to go stale.
// ---------------------------------------------------------------------------

export const READ_WHEN_PATTERN = /^> Read when:\s*(.+)$/m;

/** Recursively finds AGENTS.md files, repo-relative and sorted, excluding vendor/build dirs
 * and worktrees. Hidden directories are skipped: `.github/AGENTS.md` and `.junie/AGENTS.md`
 * are client entrypoints their clients auto-load, not subtree rules to route to (and
 * `.github/` is protected). The root file is the index's host, not an entry, so callers drop
 * it. */
export function collectAgentsFiles(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') && dir === root) continue;
      if (entry.isDirectory()) {
        if (AI_REF_IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name === 'AGENTS.md') {
        files.push(path.relative(root, path.join(dir, entry.name)).replaceAll('\\', '/'));
      }
    }
  };
  walk(root);
  return files.sort();
}

/** Extracts a subtree file's "Read when:" condition, or null when it is missing. */
export function extractReadWhen(text) {
  return text.match(READ_WHEN_PATTERN)?.[1]?.trim() ?? null;
}

export function renderAgentsIndex(entries) {
  return entries.map(([file, when]) => `- [\`${file}\`](./${file}): ${when}`).join('\n');
}

export function patchAgentsIndex(source, entries) {
  return replaceBetweenMarkers(
    source,
    '<!-- GENERATED:agents-index:BEGIN -->',
    '<!-- GENERATED:agents-index:END -->',
    renderAgentsIndex(entries),
  );
}

/** Subtree AGENTS.md files missing their "Read when:" line (root excluded; it hosts the index). */
export function findMissingReadWhen(fileContents) {
  const missing = [];
  for (const [file, content] of Object.entries(fileContents)) {
    if (file === 'AGENTS.md') continue;
    if (!extractReadWhen(content)) missing.push(file);
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Reference integrity: any text file in the repo may cross-reference an `.agents/...` path
// (e.g. "see .agents/conventions.md", ".agents/reference/packages.md"). A dangling
// reference silently sends an agent to a missing contract, so both generation and check mode
// treat it as a hard error.
// ---------------------------------------------------------------------------

const AI_REF_IGNORE_DIRS = new Set([
  '.git',
  '.idea',
  '.rumdl_cache',
  '.vscode',
  '.worktrees',
  '__tests__',
  'cache',
  'common',
  'coverage',
  'dist',
  'node_modules',
]);
const AI_REF_EXTENSIONS = new Set(['.md', '.mjs', '.mts', '.ts', '.vue', '.yml', '.yaml']);
const AI_REF_IGNORE_BASENAMES = new Set(['CHANGELOG.md']);
const AI_REF_PATTERN = /(?<!~\/)\.agents\/[A-Za-z0-9._/-]+\.md/g;

/** Text files that may legitimately carry `.agents/...` references. Changelogs are release history
 * and are allowed to mention paths that no longer exist. */
export function isAiReferenceSource(relPath) {
  const base = path.posix.basename(relPath.replaceAll('\\', '/'));
  return AI_REF_EXTENSIONS.has(path.posix.extname(base)) && !AI_REF_IGNORE_BASENAMES.has(base);
}

/** Recursively collects reference sources as repo-relative paths. Vendor and build directories
 * stay excluded so reference validation remains bounded. */
export function collectAiReferenceSources(root = ROOT) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const relPath = path.relative(root, abs).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (AI_REF_IGNORE_DIRS.has(entry.name)) continue;
        walk(abs);
        continue;
      }
      if (entry.isFile() && isAiReferenceSource(relPath)) files.push(relPath);
    }
  };
  walk(root);
  return files.sort();
}

/** Pulls repository `.agents/...` path tokens out of `text`, deduplicated. Home-directory
 * `~/.agents/...` contracts are machine-local, not repository references.
 * Skips obvious placeholders (e.g. `.agents/skills/<name>/SKILL.md`): anything
 * containing `<` is a template, not a real reference to validate. */
export function extractAiReferences(text) {
  const matches = text.match(AI_REF_PATTERN) ?? [];
  return [...new Set(matches)].filter((ref) => !ref.includes('<'));
}

/** Checks every collected reference across `fileContents` (relPath -> content) against
 * `fileExists` (defaults to a real filesystem check rooted at `ROOT`) and returns every
 * dangling `{ file, ref }` pair. Takes an injectable `fileExists` so this stays unit-testable
 * without touching disk. */
export function findDanglingAiReferences(fileContents, fileExists = (relPath) => existsSync(path.join(ROOT, relPath))) {
  const dangling = [];
  for (const [file, content] of Object.entries(fileContents)) {
    for (const ref of extractAiReferences(content)) {
      if (!fileExists(ref)) dangling.push({ file, ref });
    }
  }
  return dangling;
}

// ---------------------------------------------------------------------------
// Citation integrity: AGENTS.md files and the recipes route agents with backticked repo
// paths ("packages/refine/src/navigation/") and `bun run <script>` commands. A stale path or
// a script that only exists inside a package folder sends an agent to a dead end, so both are
// checked. Only root-anchored paths are validated (a token must start with a known repo root);
// prose-relative paths like "workflows/ci.yml" inside .github/AGENTS.md are left alone.
// Placeholders (`<...>`), globs, and package-name-ish tokens are skipped.
// ---------------------------------------------------------------------------

const CITATION_SOURCES = /(^|\/)AGENTS\.md$|^\.agents\/reference\/recipes\.md$/;
const KNOWN_ROOTS = ['.agents/', '.github/', 'changes/', 'demos/', 'docs/', 'packages/', 'scripts/'];
const BACKTICK_TOKEN = /`([^`\n]+)`/g;
const BUN_RUN_SCRIPT = /bun run (?:--filter \S+ )?([a-z][a-z:0-9-]*)/g;
const CODEX_TOOL_CITATION = /`((?:get|refine)-[a-z0-9-]+|list-packages|search)`/g;

/** Backticked tokens in `text` that look like root-anchored repo paths (directory citations
 * keep their trailing slash). */
export function extractCitedPaths(text) {
  const paths = new Set();
  for (const [, token] of text.matchAll(BACKTICK_TOKEN)) {
    const root = KNOWN_ROOTS.find((r) => token.startsWith(r));
    if (!root) continue;
    // A bare root token (`changes/`, `docs/`) names the concept, not a citation to resolve.
    if (token === root) continue;
    if (/[*?<>\s]/.test(token) || token.includes('...')) continue;
    if (token.includes('@vielzeug') || token.includes('node_modules')) continue;
    paths.add(token);
  }
  return [...paths];
}

/** `bun run <script>` citations in `text` as `{ script, filtered }` pairs. A `--filter`
 * citation targets a package and is checked against that package's manifest by the caller;
 * a bare citation must be a root script unless a `cd <dir>` appears earlier in the same
 * fenced code block (the caller supplies that context via `cdBefore`). */
export function extractCitedScripts(text) {
  const seen = new Set();
  const cited = [];
  for (const match of text.matchAll(BUN_RUN_SCRIPT)) {
    const key = `${match[1]} ${match[0].includes('--filter') ? 'f' : 'b'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cited.push({ script: match[1], filtered: match[0].includes('--filter'), index: match.index });
  }
  return cited;
}

/** True when a `cd <dir>` line appears in the same fenced block before `index` in `text` —
 * the convention for package-local commands in an AGENTS.md bash block. */
export function cdBefore(text, index) {
  const blockStart = text.lastIndexOf('```', index);
  const region = blockStart === -1 ? text.slice(0, index) : text.slice(blockStart, index);
  return /(^|\n)\s*cd\s+\S+/.test(region);
}

/** The subset of `paths` that git reports as ignored, batched through
 * `git check-ignore --stdin`. A gitignored citation names a generated artifact (e.g.
 * `packages/codex/data/snapshot.json`): it exists after a build but not in a fresh CI
 * checkout, so it must not fail the citation check. Empty set when nothing matches or
 * git is unavailable. */
export function findIgnoredPaths(paths, { spawn = spawnSync } = {}) {
  if (paths.length === 0) return new Set();
  const check = (batch) => {
    try {
      const result = spawn('git', ['check-ignore', '--stdin'], { input: `${batch.join('\n')}\n`, encoding: 'utf8', cwd: ROOT });
      return result.status === 128 ? null : new Set(String(result.stdout ?? '').split('\n').filter(Boolean)); // 1: nothing ignored
    } catch {
      return null; // git unavailable
    }
  };
  const batched = check(paths);
  if (batched) return batched;
  // 128: one bad pathspec (e.g. beyond a symbolic link) fails the whole batch — retry
  // per path so a single unreadable token cannot hide the rest.
  const ignored = new Set();
  for (const rel of paths) {
    const single = check([rel]);
    if (single) for (const hit of single) ignored.add(hit);
  }
  return ignored;
}

/** Checks `fileContents` (relPath -> content) for citations that don't resolve. `rootScripts`
 * comes from the real root manifest. A token resolves against the repo root and, when it
 * starts with `scripts/` or `src/`, against the citing file's own directory too (a package's
 * AGENTS.md cites its package-local `scripts/` the same way). Filtered citations are checked
 * separately by `findBadFilteredCitations`. `fileExists` is injectable for unit tests. */
export function findBadCitations(
  fileContents,
  { rootScripts, fileExists = (relPath) => existsSync(path.join(ROOT, relPath)), isIgnored = () => false },
) {
  const bad = [];
  for (const [file, content] of Object.entries(fileContents)) {
    if (!CITATION_SOURCES.test(file)) continue;
    const owner = path.posix.dirname(file);
    for (const token of extractCitedPaths(content)) {
      const rel = token.endsWith('/') ? token.slice(0, -1) : token;
      const candidates = [/^(scripts|src)\//.test(rel) && owner !== '.' ? `${owner}/${rel}` : null, rel].filter(
        (candidate) => candidate !== null,
      );
      if (!candidates.some((candidate) => fileExists(candidate) || isIgnored(candidate))) {
        bad.push({ file, citation: token, reason: 'path does not exist' });
      }
    }
    for (const { script, filtered, index } of extractCitedScripts(content)) {
      if (filtered) continue; // --filter targets are validated via the navigation data below
      if (rootScripts.has(script) || cdBefore(content, index)) continue;
      bad.push({ file, citation: `bun run ${script}`, reason: 'not a root script (use --filter or a cd block)' });
    }
  }
  return bad;
}

/** Bare `bun run --filter @vielzeug/<pkg> <script>` citations where the package does not
 * exist or its manifest has no such script. */
export function findBadFilteredCitations(fileContents, packageScripts) {
  const bad = [];
  for (const [file, content] of Object.entries(fileContents)) {
    if (!CITATION_SOURCES.test(file)) continue;
    for (const match of content.matchAll(/bun run --filter @vielzeug\/([a-z0-9-]+) ([a-z][a-z:0-9-]*)/g)) {
      const [, pkg, script] = match;
      const scripts = packageScripts.get(pkg);
      if (!scripts) {
        bad.push({ file, citation: `bun run --filter @vielzeug/${pkg} ${script}`, reason: 'no such package' });
      } else if (!scripts.has(script)) {
        bad.push({ file, citation: `bun run --filter @vielzeug/${pkg} ${script}`, reason: 'package has no such script' });
      }
    }
  }
  return bad;
}

/** Backticked codex MCP tool names cited by AGENTS.md files must exist in the tool registry. */
export function findBadToolCitations(fileContents, toolNames) {
  const bad = [];
  for (const [file, content] of Object.entries(fileContents)) {
    if (!CITATION_SOURCES.test(file)) continue;
    for (const [, tool] of content.matchAll(CODEX_TOOL_CITATION)) {
      if (!toolNames.has(tool)) {
        bad.push({ file, citation: `\`${tool}\``, reason: 'no such codex MCP tool' });
      }
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Symbol citations: prose like "root `vite.config.ts` (`prodGateDefine`)" names a symbol
// inside a file. The file must exist and must actually contain the identifier, or the
// citation sends an agent hunting for something that moved or was renamed.
// ---------------------------------------------------------------------------

const SYMBOL_CITATION = /`([^`\s]+\.[A-Za-z0-9]+)` \(`([A-Za-z_][A-Za-z0-9_]*)`\)/g;

/** Checks `` `file` (`symbol`) `` citations: when the cited file resolves (repo root, or the
 * citing file's own directory for `scripts/`/`src`-relative paths, as in findBadCitations),
 * its text must contain `symbol`. A file token that resolves nowhere is prose-relative and
 * is deliberately skipped here (a root-anchored one is already reported by findBadCitations
 * as a bad path); this check therefore catches moved/renamed symbols in files that still
 * exist, not missing files. `readFile` is injectable for unit tests. */
export function findBadSymbolCitations(fileContents, readFile = (relPath) => readFileSync(path.join(ROOT, relPath), 'utf8')) {
  const bad = [];
  for (const [file, content] of Object.entries(fileContents)) {
    if (!CITATION_SOURCES.test(file)) continue;
    const owner = path.posix.dirname(file);
    for (const [, fileToken, symbol] of content.matchAll(SYMBOL_CITATION)) {
      const candidates = [/^(scripts|src)\//.test(fileToken) && owner !== '.' ? `${owner}/${fileToken}` : null, fileToken]
        .filter((candidate) => candidate !== null);
      const readable = candidates.filter((candidate) => {
        try {
          readFile(candidate);
          return true;
        } catch {
          return false;
        }
      });
      if (readable.length > 0 && !readable.some((candidate) => readFile(candidate).includes(symbol))) {
        bad.push({ file, citation: `\`${fileToken}\` (\`${symbol}\`)`, reason: 'symbol not found in cited file' });
      }
    }
  }
  return bad;
}

/** Soft budget for the root contract: it is loaded by every client on every task, so growth
 * is a cost. Returns a warning above `limit` lines (check mode surfaces it; it does not
 * fail the gate). */
export function checkRootSize(text, limit = 260) {
  const lines = text.split('\n').length;
  return lines > limit ? `[SIZE] AGENTS.md is ${lines} lines (budget ${limit}): route detail out, not in.` : null;
}

export async function main({ check = false } = {}) {
  const packages = readLivePackages();

  let stale = false;
  const onStale = (message) => {
    stale = true;
    console.error(message);
  };

  const packagesReferencePath = path.join(ROOT, '.agents/reference/packages.md');
  const packagesReference = readFileSync(packagesReferencePath, 'utf8');
  const hasDocs = (slug) => existsSync(path.join(ROOT, 'docs', slug));
  const hasAgents = (slug) => existsSync(path.join(ROOT, 'packages', slug, 'AGENTS.md'));
  const packagesReferencePatched = patchPackagesNavigation(
    patchPackagesReference(packagesReference, packages),
    packages,
    { hasDocs, hasAgents },
  );
  syncFile('.agents/reference/packages.md', packagesReferencePatched, { check, onStale });

  const skill = readFileSync(path.join(ROOT, SKILL_PATH), 'utf8');
  syncFile(SKILL_PATH, patchSkillPackages(skill, packages), { check, onStale });

  // Subtree index: every AGENTS.md in the repo, indexed by its "Read when:" line.
  const agentsFiles = collectAgentsFiles();
  const agentsContents = Object.fromEntries(
    agentsFiles.map((relPath) => [relPath, readFileSync(path.join(ROOT, relPath), 'utf8')]),
  );
  const missingReadWhen = findMissingReadWhen(agentsContents);
  for (const file of missingReadWhen) {
    console.error(`[READ-WHEN] ${file} has no "> Read when: ..." line after its title`);
  }
  const indexEntries = agentsFiles
    .filter((file) => file !== 'AGENTS.md' && !missingReadWhen.includes(file))
    .map((file) => [file, extractReadWhen(agentsContents[file])]);
  const rootAgentsPath = path.join(ROOT, 'AGENTS.md');
  const rootAgents = readFileSync(rootAgentsPath, 'utf8');
  syncFile('AGENTS.md', patchAgentsIndex(rootAgents, indexEntries), { check, onStale });

  const referenceSources = collectAiReferenceSources();
  const fileContents = Object.fromEntries(
    referenceSources.map((relPath) => [relPath, readFileSync(path.join(ROOT, relPath), 'utf8')]),
  );
  const dangling = findDanglingAiReferences(fileContents);
  for (const { file, ref } of dangling) {
    console.error(`[DANGLING] ${file} references ${ref}: file does not exist`);
  }

  // Citation integrity over AGENTS.md files and the recipes.
  const rootScripts = new Set(Object.keys(JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts ?? {}));
  const packageScripts = new Map(packages.map((pkg) => [pkg.slug, new Set(pkg.scripts)]));
  const citationContents = Object.fromEntries(
    Object.entries(agentsContents).concat(
      existsSync(path.join(ROOT, '.agents/reference/recipes.md'))
        ? [['.agents/reference/recipes.md', readFileSync(path.join(ROOT, '.agents/reference/recipes.md'), 'utf8')]]
        : [],
    ),
  );
  const codexToolDirectory = path.join(ROOT, 'packages/codex/src/tools');
  const codexToolNames = new Set(
    readdirSync(codexToolDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .flatMap((entry) => {
        const source = readFileSync(path.join(codexToolDirectory, entry.name), 'utf8');
        return [...source.matchAll(/\bname:\s*['"]([^'"]+)['"]/g)].map(([, name]) => name);
      }),
  );
  const citedPaths = [...new Set(Object.values(citationContents).flatMap((content) => extractCitedPaths(content)))];
  // git matches a directory-only ignore pattern (`data/`) only with the trailing slash when
  // the directory is absent, so submit both forms and let isIgnored match either.
  const ignoredPaths = findIgnoredPaths([
    ...new Set(citedPaths.flatMap((token) => [token, token.endsWith('/') ? token.slice(0, -1) : `${token}/`])),
  ]);
  const badCitations = findBadCitations(citationContents, {
    rootScripts,
    fileExists: (relPath) => existsSync(path.join(ROOT, relPath)),
    isIgnored: (relPath) => ignoredPaths.has(relPath) || ignoredPaths.has(`${relPath}/`),
  })
    .concat(findBadFilteredCitations(citationContents, packageScripts))
    .concat(findBadToolCitations(citationContents, codexToolNames))
    .concat(findBadSymbolCitations(citationContents));
  for (const { file, citation, reason } of badCitations) {
    console.error(`[CITATION] ${file} cites ${citation}: ${reason}`);
  }
  const sizeWarning = checkRootSize(readFileSync(rootAgentsPath, 'utf8'));
  if (sizeWarning) console.warn(sizeWarning);

  if (check && stale) {
    console.error('\nRun `bun run gen:ai-data` to regenerate.');
    return false;
  }
  if (dangling.length > 0) {
    console.error('\nFix the dangling reference(s) above: regenerating will not resolve them.');
    return false;
  }
  if (missingReadWhen.length > 0) {
    console.error('\nAdd the missing "> Read when: ..." lines: the root index is generated from them.');
    return false;
  }
  if (badCitations.length > 0) {
    console.error('\nFix the bad citation(s) above: regenerating will not resolve them.');
    return false;
  }
  if (!check) console.log('AI data synced.');
  return true;
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = await main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
