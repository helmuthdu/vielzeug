#!/usr/bin/env node
// Git worktree helper for parallel multi-agent work on independent packages.
//
// Why this exists: multiple agents editing the same checkout race on
// `.git/index` and can stomp each other's uncommitted files. A worktree per
// agent (own directory, own index, shared .git/objects) fixes that — but only
// makes sense for packages with no @vielzeug/* dependency edge in either
// direction. Two coupled packages (e.g. `ripple` + `ore`) *should* see each
// other's breaking changes immediately in a shared checkout; isolating them
// in separate worktrees just defers that collision to merge time, which is
// worse. See .ai/rules/workspace.md § Multi-agent worktrees.
//
// The dependency graph is computed from packages/*/package.json at run time
// — not from .ai/rules/catalogue.md's prose table, which is human-maintained
// and can drift. One source of truth: the package.json files themselves.
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

/** Map of package name (e.g. "sandbox") -> Set of @vielzeug/* package names
 * it directly depends on. Built from packages/*\/package.json, not prose. */
export function readDependencyGraph(root = ROOT) {
  const graph = new Map();
  const packagesDir = path.join(root, 'packages');
  for (const dir of readdirSync(packagesDir)) {
    const pkgJsonPath = path.join(packagesDir, dir, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const deps = { ...pkgJson.dependencies, ...pkgJson.peerDependencies };
    const vielzeugDeps = Object.keys(deps)
      .filter((name) => name.startsWith('@vielzeug/'))
      .map((name) => name.replace('@vielzeug/', ''));
    graph.set(dir, new Set(vielzeugDeps));
  }
  return graph;
}

/** { dependsOn: [...], dependedOnBy: [...] } — empty on both sides means the
 * package is safe to isolate in its own worktree. */
export function describeCoupling(pkgName, graph) {
  const dependsOn = [...(graph.get(pkgName) ?? [])];
  const dependedOnBy = [...graph.entries()]
    .filter(([name, deps]) => name !== pkgName && deps.has(pkgName))
    .map(([name]) => name);
  return { dependedOnBy, dependsOn };
}

export const isIndependent = (pkgName, graph) => {
  const { dependedOnBy, dependsOn } = describeCoupling(pkgName, graph);
  return dependsOn.length === 0 && dependedOnBy.length === 0;
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function sh(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

function worktreePath(pkgName, root = ROOT) {
  return path.join(path.dirname(root), `${path.basename(root)}-${pkgName}`);
}

function requirePackageExists(pkgName, root = ROOT) {
  if (!existsSync(path.join(root, 'packages', pkgName))) {
    throw new Error(`No such package: packages/${pkgName}`);
  }
}

function cmdAdd(pkgName, { branch, force }) {
  requirePackageExists(pkgName);
  const graph = readDependencyGraph();
  const coupling = describeCoupling(pkgName, graph);

  if (!isIndependent(pkgName, graph) && !force) {
    console.error(`[REFUSED] "${pkgName}" has @vielzeug dependency edges — a worktree would hide breaking changes until merge:`);
    if (coupling.dependsOn.length) console.error(`  depends on:    ${coupling.dependsOn.join(', ')}`);
    if (coupling.dependedOnBy.length) console.error(`  depended on by: ${coupling.dependedOnBy.join(', ')}`);
    console.error('Work on this package in the shared checkout instead, or pass --force if you understand the tradeoff.');
    process.exitCode = 1;
    return;
  }

  const dir = worktreePath(pkgName);
  if (existsSync(dir)) {
    throw new Error(`${dir} already exists — remove it first (\`node scripts/worktree.mjs remove ${pkgName}\`) or pick a different package`);
  }

  const branchName = branch ?? `agent/${pkgName}-${Date.now()}`;
  sh('git', ['worktree', 'add', dir, '-b', branchName], ROOT);
  sh('rush', ['install', '--to', pkgName], dir);

  console.log(`\nWorktree ready: ${dir} (branch ${branchName})`);
  console.log(`  cd ${dir}`);
  console.log('If running inside Devin, request read/write scope on that path before editing there.');
}

function cmdList() {
  sh('git', ['worktree', 'list'], ROOT);
}

function cmdRemove(pkgName) {
  const dir = worktreePath(pkgName);
  // No --force: git already refuses to remove a worktree with uncommitted
  // changes, which is exactly the safety we want here — don't paper over it.
  sh('git', ['worktree', 'remove', dir], ROOT);
}

function main(argv) {
  const [command, pkgName, ...rest] = argv;
  const force = rest.includes('--force');
  const branchIndex = rest.indexOf('--branch');
  const branch = branchIndex === -1 ? undefined : rest[branchIndex + 1];

  switch (command) {
    case 'add':
      if (!pkgName) throw new Error('Usage: node scripts/worktree.mjs add <pkg> [--branch <name>] [--force]');
      return cmdAdd(pkgName, { branch, force });
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
