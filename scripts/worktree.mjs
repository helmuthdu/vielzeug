#!/usr/bin/env node
// Git worktree helper for parallel multi-agent work on independent packages.
//
// Why this exists: multiple agents editing the same checkout race on
// `.git/index` and can stomp each other's uncommitted files. A worktree per
// agent (own directory, own index, shared .git/objects) fixes that — but only
// makes sense for packages with no @vielzeug/* dependency edge in either
// direction (including optional peer deps — still a real API contract). Two
// coupled packages (e.g. `ripple` + `ore`) *should* see each other's breaking
// changes immediately in a shared checkout; isolating them in separate
// worktrees just defers that collision to merge time, which is worse. See
// .ai/rules/workspace.md § Multi-agent worktrees.
//
// The dependency graph is computed from packages/*/package.json at run time
// — not from .ai/rules/catalogue.md's prose table, which is human-maintained
// and *is currently stale* (tempo/herald/arsenal are listed there as
// independent; they aren't, per package.json). One source of truth: the
// package.json files themselves.
//
// Worktrees live at .worktrees/<pkg>/ (gitignored), inside the repo — not a
// sibling directory. Sibling worktrees are the more common git convention,
// but a sandboxed agent is typically scoped to the repo root only; a sibling
// path needs an extra, explicit scope grant. Nesting inside the
// already-granted workspace has zero extra friction. IMPORTANT: this means
// `.worktrees/` must stay excluded from every tool that globs the repo
// recursively (eslint's globalIgnores, notably — nested duplicate source
// files under two different tsconfig roots breaks typescript-eslint's
// project-service auto-detection for the *entire* repo, not just the
// worktree). Any new recursive glob added to this repo needs the same
// exclusion; there is no way to enforce that from here, only to document it.
//
// Usage:
//   node scripts/worktree.mjs add <pkg> [--branch <name>] [--force]
//   node scripts/worktree.mjs list
//   node scripts/worktree.mjs remove <pkg>

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

/** Map of package name (e.g. "sandbox") -> Map of @vielzeug/* package name it
 * directly depends on -> whether that edge is an optional peer dependency.
 * Built from packages/*\/package.json at run time, not prose. */
export function readDependencyGraph(root = ROOT) {
  const graph = new Map();
  const packagesDir = path.join(root, 'packages');
  for (const dir of readdirSync(packagesDir)) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const optionalMeta = pkgJson.peerDependenciesMeta ?? {};
    const allDeps = { ...pkgJson.peerDependencies, ...pkgJson.dependencies }; // dependencies wins if listed both ways
    const edges = new Map();
    for (const name of Object.keys(allDeps)) {
      if (!name.startsWith('@vielzeug/')) continue;
      const bareName = name.replace('@vielzeug/', '');
      const isHardDependency = Boolean(pkgJson.dependencies?.[name]);
      edges.set(bareName, !isHardDependency && Boolean(optionalMeta[name]?.optional));
    }
    graph.set(dir, edges);
  }
  return graph;
}

/** { dependsOn, dependedOnBy }, each an array of { name, optional }. Both
 * empty means the package is safe to isolate in its own worktree. */
export function describeCoupling(pkgName, graph) {
  const dependsOn = [...(graph.get(pkgName) ?? [])].map(([name, optional]) => ({ name, optional }));
  const dependedOnBy = [...graph.entries()]
    .filter(([name]) => name !== pkgName)
    .filter(([, edges]) => edges.has(pkgName))
    .map(([name, edges]) => ({ name, optional: edges.get(pkgName) }));
  return { dependedOnBy, dependsOn };
}

export const isIndependent = (pkgName, graph) => {
  const { dependedOnBy, dependsOn } = describeCoupling(pkgName, graph);
  return dependsOn.length === 0 && dependedOnBy.length === 0;
};

export const formatDep = ({ name, optional }) => (optional ? `${name} (optional)` : name);

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/** Parses `add` subcommand flags. Throws on a missing/flag-shaped `--branch`
 * value instead of silently swallowing the next flag as the branch name. */
export function parseAddArgs(rest) {
  const force = rest.includes('--force');
  const branchIndex = rest.indexOf('--branch');
  if (branchIndex === -1) return { branch: undefined, force };

  const value = rest[branchIndex + 1];
  if (!value || value.startsWith('--')) {
    throw new Error('--branch requires a value, e.g. --branch agent/sandbox-fix');
  }
  return { branch: value, force };
}

// ---------------------------------------------------------------------------
// Commands — `run` is injectable so tests can assert on invocations without
// spawning real git/rush processes.
// ---------------------------------------------------------------------------

export function defaultRun(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

function worktreePath(pkgName, root) {
  return path.join(root, '.worktrees', pkgName);
}

export function cmdAdd(pkgName, { branch, force = false, root = ROOT, run = defaultRun } = {}) {
  const graph = readDependencyGraph(root);
  if (!graph.has(pkgName)) {
    throw new Error(`No such package: packages/${pkgName}/package.json`);
  }

  const coupling = describeCoupling(pkgName, graph);
  if (!isIndependent(pkgName, graph) && !force) {
    const lines = [`[REFUSED] "${pkgName}" has @vielzeug dependency edges — a worktree would hide breaking changes until merge:`];
    if (coupling.dependsOn.length) lines.push(`  depends on:     ${coupling.dependsOn.map(formatDep).join(', ')}`);
    if (coupling.dependedOnBy.length) lines.push(`  depended on by: ${coupling.dependedOnBy.map(formatDep).join(', ')}`);
    lines.push('Work on this package in the shared checkout instead, or pass --force if you understand the tradeoff.');
    console.error(lines.join('\n'));
    return { created: false };
  }

  const dir = worktreePath(pkgName, root);

  // Clears registrations for worktrees whose directory was deleted by hand
  // (e.g. `rm -rf .worktrees/<pkg>` instead of `worktree:remove`) — without
  // this, the next `git worktree add` for the same package fails with
  // "missing but already registered worktree" even though nothing is there.
  run('git', ['worktree', 'prune'], root);

  if (existsSync(dir)) {
    throw new Error(`${dir} already exists — remove it first (\`pnpm worktree:remove ${pkgName}\`) or pick a different package`);
  }

  const branchName = branch ?? `agent/${pkgName}-${Date.now()}`;
  try {
    run('git', ['worktree', 'add', dir, '-b', branchName], root);
  } catch (err) {
    // git can create the branch ref before failing the worktree checkout
    // step (e.g. a race with another `add`) — don't leave that behind.
    try {
      run('git', ['branch', '-D', branchName], root);
    } catch {
      // best-effort cleanup; the original error below is the one that matters
    }
    throw new Error(`git worktree add failed: ${err.message}`, { cause: err });
  }

  run('rush', ['install', '--to', pkgName], dir);

  console.log(`\nWorktree ready: ${dir} (branch ${branchName})`);
  console.log(`  cd ${dir}`);
  return { branchName, created: true, dir };
}

export function cmdList({ root = ROOT, run = defaultRun } = {}) {
  run('git', ['worktree', 'list'], root);
}

export function cmdRemove(pkgName, { root = ROOT, run = defaultRun } = {}) {
  const dir = worktreePath(pkgName, root);
  // No --force: git already refuses to remove a worktree with uncommitted
  // changes, which is exactly the safety we want here — don't paper over it.
  run('git', ['worktree', 'remove', dir], root);
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(argv) {
  const [command, pkgName, ...rest] = argv;

  switch (command) {
    case 'add': {
      if (!pkgName) throw new Error('Usage: node scripts/worktree.mjs add <pkg> [--branch <name>] [--force]');
      const { branch, force } = parseAddArgs(rest);
      const result = cmdAdd(pkgName, { branch, force });
      if (!result.created) process.exitCode = 1;
      return;
    }
    case 'list':
      return cmdList();
    case 'remove':
      if (!pkgName) throw new Error('Usage: node scripts/worktree.mjs remove <pkg>');
      return cmdRemove(pkgName);
    default:
      throw new Error(`Unknown command "${command ?? ''}". Usage: node scripts/worktree.mjs <add|list|remove> [pkg]`);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
