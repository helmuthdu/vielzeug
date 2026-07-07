/**
 * Single real read of "what's in packages/*, and how does it depend on other @vielzeug/*
 * packages" — extracted after three independent implementations of the same
 * readdir-then-parse-each-package.json scan drifted into slightly different shapes
 * (vielzeug-packages.ts wanted names only, sync-catalogue.mjs wanted deps + optional peers,
 * worktree.mjs wanted deps + peers as a Map). One real filesystem read, three thin views over
 * it below — `readPackageManifests()` is the only function that touches the filesystem.
 *
 * `packages.d.mts` next to this file is a hand-written type declaration for
 * vielzeug-packages.ts (see the note in `lib/cli.mjs`'s header for why it's hand-written
 * instead of generated) — update it in the same commit if this file's exported shape changes.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SCOPE = '@vielzeug/';

/** True if `name` is a `@vielzeug/*`-scoped package name, e.g. from `dependencies` keys. */
function isScoped(name) {
  return name.startsWith(SCOPE);
}

function unscope(name) {
  return name.slice(SCOPE.length);
}

/**
 * One entry per `packages/<slug>/package.json` that actually exists and parses, sorted
 * alphabetically by slug. A directory with no `package.json` (a half-scaffolded package) or
 * with unparseable JSON is skipped, not thrown on — this function is on the critical startup
 * path of `docs/.vitepress/config.ts` (every `pnpm docs:dev` / `docs:build`, via
 * vielzeug-packages.ts's alias builder) as well as `sync-catalogue.mjs` and `worktree.mjs`'s
 * full-repo scans. In a repo where multiple agents edit different packages concurrently, one
 * contributor's mid-edit syntax error in an unrelated `package.json` must not be able to take
 * down everyone else's dev server or worktree tooling — so this warns loudly (never silently)
 * and keeps going, rather than hard-failing the whole scan over one broken file. A caller that
 * genuinely needs to fail on a *specific* named package's own bad JSON already does — e.g.
 * `worktree.mjs`'s `cmdAdd()` throws "No such package" for a slug this function skipped.
 *
 * `dependencies` and `peers` are both already unscoped (`"ripple"`, not `"@vielzeug/ripple"`)
 * and contain only `@vielzeug/*` edges — this monorepo's graph never needs to know about
 * `vitest`, `vite`, etc. for any of the three current consumers.
 */
export function readPackageManifests(packagesDir) {
  const slugs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const manifests = [];

  for (const slug of slugs) {
    const pkgJsonPath = path.join(packagesDir, slug, 'package.json');
    let raw;
    try {
      raw = readFileSync(pkgJsonPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') continue; // half-scaffolded package directory, not a real one yet
      throw err;
    }

    let pkg;
    try {
      pkg = JSON.parse(raw);
    } catch (err) {
      console.error(`[readPackageManifests] Skipping ${pkgJsonPath}: not valid JSON (${err.message})`);
      continue;
    }

    const dependencies = Object.keys(pkg.dependencies ?? {})
      .filter(isScoped)
      .map(unscope)
      .sort();

    const optionalMeta = pkg.peerDependenciesMeta ?? {};
    const peers = Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies })
      .filter(isScoped)
      .map((name) => ({
        name: unscope(name),
        // dependencies wins if a package is listed both ways; a hard dependency is never optional.
        optional: !pkg.dependencies?.[name] && Boolean(optionalMeta[name]?.optional),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    manifests.push({ dependencies, peers, slug });
  }

  return manifests;
}
