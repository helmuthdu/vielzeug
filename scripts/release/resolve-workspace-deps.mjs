/**
 * Rewrite `workspace:` protocol dependency specifiers in a package.json object into real,
 * publishable semver ranges.
 *
 * Every `@vielzeug/*` package that depends on another one (`refine` -> `ore`/`ripple`/...,
 * `scroll` -> `ripple`, `orbit`, `prism`, ...) declares that edge as `workspace:*` per
 * `packages/AGENTS.md`'s convention. `workspace:*` is pnpm's local-dependency protocol — it only
 * resolves inside this monorepo's own pnpm workspace, and `pnpm publish`/`pnpm pack` rewrite it
 * to a real version automatically. This repo's publish pipeline calls `npm pack`/`npm publish`
 * directly instead (see `npm-publish.mjs`'s header for why: npm's Trusted Publishing/OIDC has no
 * pnpm equivalent), and plain `npm` has no idea what `workspace:` means — it packs the literal
 * string `"workspace:*"` straight into the published tarball's package.json. Every consumer
 * installing that published package outside this monorepo then fails immediately with e.g.
 * `Workspace not found (@vielzeug/ripple@workspace:*)`. This module is the fix, called from
 * `npm-publish.mjs` just before `npm pack`.
 *
 * Mirrors pnpm's own publish-time conversion rule: `workspace:*` -> the dependency's exact
 * current version; `workspace:^` / `workspace:~` -> that symbol prepended to the exact current
 * version; any other `workspace:<range>` (e.g. `workspace:^1.2.0`) already spells out a real
 * range, so just drop the `workspace:` prefix.
 */

import { findProject as defaultFindProject } from './rush-project.mjs';

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

function resolveSpec(name, spec, { findProject, root }) {
  const range = spec.slice('workspace:'.length);
  if (range !== '*' && range !== '^' && range !== '~') return range;

  const { version } = findProject(name, root);
  return range === '*' ? version : `${range}${version}`;
}

/**
 * Returns a new package.json object with every `workspace:` dependency specifier resolved to a
 * real range. Never mutates `pkg`. A package with no `workspace:` specifiers at all comes back
 * unchanged (structurally equal, new object).
 */
export function resolveWorkspaceDependencies(pkg, { findProject = defaultFindProject, root } = {}) {
  const resolved = { ...pkg };

  for (const field of DEPENDENCY_FIELDS) {
    if (!pkg[field]) continue;

    const deps = { ...pkg[field] };
    for (const [name, spec] of Object.entries(deps)) {
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        deps[name] = resolveSpec(name, spec, { findProject, root });
      }
    }
    resolved[field] = deps;
  }

  return resolved;
}
