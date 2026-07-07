#!/usr/bin/env node
// Regenerates .ai/rules/data/catalogue.md's dependency graph from each
// packages/<name>/package.json — the graph used to be hand-maintained prose and
// drifted from reality (found live: `refine` still listed a `scroll` dependency
// it no longer has; `sourcerer` still listed a `ripple` dependency it no longer
// has). package.json is the only place this data can be correct by construction.
//
// Usage:
//   node scripts/sync-catalogue.mjs          # write generated output
//   node scripts/sync-catalogue.mjs --check  # exit 1 if output is stale (CI)
//
// Scope: only the "Package dependency graph" section. The package catalogue
// table (category, one-line description) and the DOM-output metadata table stay
// hand-authored — those are curated/subjective, not derivable from package.json.
//
// Pure functions below are exported for scripts/__tests__/sync-catalogue.test.mjs.
// Side effects (reading packages/, writing the file) are guarded by the `isMain`
// check at the bottom, same convention as scripts/sync-workflow-docs.mjs.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { isMain, parseArgs } from './lib/cli.mjs';
import { ROOT, replaceBetweenMarkers, syncFile } from './lib/marker-sync.mjs';
import { readPackageManifests } from './lib/packages.mjs';

/** One entry per `packages/<slug>/package.json`, sorted alphabetically by slug — thin view
 * over `readPackageManifests()` in this module's own `{ deps, optionalPeers, slug }` shape. */
export function readPackages(root = ROOT) {
  return readPackageManifests(path.join(root, 'packages')).map(({ dependencies, peers, slug }) => ({
    deps: dependencies,
    optionalPeers: peers.filter((p) => p.optional).map((p) => p.name),
    slug,
  }));
}

/** "a", "a and b", or "a, b, and c" (Oxford comma), each name backtick-quoted. */
export function formatNameList(names) {
  if (names.length === 0) return '';
  const quoted = names.map((name) => `\`${name}\``);
  if (quoted.length === 1) return quoted[0];
  if (quoted.length === 2) return `${quoted[0]} and ${quoted[1]}`;
  return `${quoted.slice(0, -1).join(', ')}, and ${quoted.at(-1)}`;
}

/** The full generated region: fenced graph block, independence line, and
 * optional-peer notes — one unit, since they describe the same data. */
export function dependencyGraphSection(packages) {
  const sorted = [...packages].sort((a, b) => a.slug.localeCompare(b.slug));
  const withDeps = sorted.filter((p) => p.deps.length > 0);
  const independent = sorted.filter((p) => p.deps.length === 0);
  const withOptionalPeers = sorted.filter((p) => p.optionalPeers.length > 0);

  const nameWidth = Math.max(0, ...withDeps.map((p) => p.slug.length));
  const graphLines = withDeps.map((p) => `${p.slug.padEnd(nameWidth)} → ${p.deps.join(', ')}`);

  const parts = [
    '```text',
    ...graphLines,
    '```',
    '',
    `Fully independent (no \`@vielzeug/*\` deps): ${independent.map((p) => `\`${p.slug}\``).join(', ')}.`,
  ];

  for (const p of withOptionalPeers) {
    parts.push(
      '',
      `> **Note:** \`${p.slug}\` also declares optional peer dependencies on ${formatNameList(p.optionalPeers)}.`,
    );
  }

  return parts.join('\n');
}

export function main({ check = false } = {}) {
  const packages = readPackages();
  const content = dependencyGraphSection(packages);

  const source = readFileSync(path.join(ROOT, '.ai/rules/data/catalogue.md'), 'utf8');
  let patched;
  try {
    patched = replaceBetweenMarkers(
      source,
      '<!-- GENERATED:dep-graph:BEGIN -->',
      '<!-- GENERATED:dep-graph:END -->',
      content,
    );
  } catch (err) {
    throw new Error(`.ai/rules/data/catalogue.md: ${err.message} — fix or restore the markers, then re-run`, {
      cause: err,
    });
  }

  let stale = false;
  const result = syncFile('.ai/rules/data/catalogue.md', patched, {
    check,
    onStale: (message) => {
      stale = true;
      console.error(message);
    },
  });

  if (check && stale) {
    console.error('\nRun `pnpm gen:catalogue` to regenerate.');
    return false;
  }
  if (!check && result !== 'unchanged') console.log('Catalogue dependency graph synced.');
  return true;
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const ok = main({ check: Boolean(flags.check) });
  if (!ok) process.exitCode = 1;
}
