import { describe, expect, it } from 'vitest';

import {
  cmdAdd,
  cmdList,
  cmdRemove,
  describeCoupling,
  formatDep,
  isIndependent,
  parseAddArgs,
  readDependencyGraph,
  ROOT,
} from '../worktree.mjs';

describe('readDependencyGraph()', () => {
  const graph = readDependencyGraph(ROOT);

  it('finds every package under packages/', () => {
    expect(graph.has('ripple')).toBe(true);
    expect(graph.has('sandbox')).toBe(true);
    expect(graph.size).toBeGreaterThan(20);
  });

  it('records real @vielzeug/* dependency edges, matching package.json', () => {
    expect(graph.get('ore').has('ripple')).toBe(true);
    expect(graph.get('refine').has('arsenal')).toBe(true);
  });

  it('marks a hard `dependencies` entry as non-optional', () => {
    expect(graph.get('ore').get('ripple')).toBe(false);
  });

  it('marks flux\'s optional peerDependencies as optional', () => {
    const flux = graph.get('flux');
    expect(flux.get('ripple')).toBe(false); // hard dependency
    expect(flux.get('courier')).toBe(true); // optional peer
    expect(flux.get('herald')).toBe(true);
    expect(flux.get('pulse')).toBe(true);
  });

  it('does not record non-@vielzeug dependencies', () => {
    for (const edges of graph.values()) {
      for (const name of edges.keys()) {
        expect(name.startsWith('@')).toBe(false); // stored bare, e.g. "ripple" not "@vielzeug/ripple"
      }
    }
  });
});

describe('describeCoupling() / isIndependent() / formatDep()', () => {
  it('reports both directions of coupling with optional flags', () => {
    const graph = new Map([
      ['a', new Map()],
      ['b', new Map([['a', false]])],
      ['c', new Map([['a', true]])],
    ]);
    expect(describeCoupling('a', graph)).toEqual({
      dependedOnBy: [
        { name: 'b', optional: false },
        { name: 'c', optional: true },
      ],
      dependsOn: [],
    });
    expect(describeCoupling('b', graph)).toEqual({ dependedOnBy: [], dependsOn: [{ name: 'a', optional: false }] });
  });

  it('formatDep marks optional edges, leaves hard edges plain', () => {
    expect(formatDep({ name: 'courier', optional: true })).toBe('courier (optional)');
    expect(formatDep({ name: 'ripple', optional: false })).toBe('ripple');
  });

  it('a package with no incoming or outgoing edges is independent', () => {
    const graph = new Map([
      ['a', new Map()],
      ['b', new Map()],
    ]);
    expect(isIndependent('a', graph)).toBe(true);
  });

  it('a package with an outgoing edge is not independent, even if optional', () => {
    const graph = new Map([
      ['a', new Map()],
      ['b', new Map([['a', true]])],
    ]);
    expect(isIndependent('b', graph)).toBe(false);
  });

  it('a package with only incoming edges is not independent', () => {
    const graph = new Map([
      ['a', new Map()],
      ['b', new Map([['a', false]])],
    ]);
    expect(isIndependent('a', graph)).toBe(false);
  });

  it('matches the real graph: ripple has dependents, is not independent', () => {
    const graph = readDependencyGraph(ROOT);
    expect(isIndependent('ripple', graph)).toBe(false);
    expect(describeCoupling('ripple', graph).dependedOnBy.length).toBeGreaterThan(0);
  });

  it('matches the real graph: a leaf package with no known dependents is independent', () => {
    const graph = readDependencyGraph(ROOT);
    // wayfinder has no @vielzeug deps and nothing depends on it
    expect(isIndependent('wayfinder', graph)).toBe(true);
  });
});

describe('parseAddArgs()', () => {
  it('parses no flags', () => {
    expect(parseAddArgs([])).toEqual({ branch: undefined, force: false });
  });

  it('parses --force', () => {
    expect(parseAddArgs(['--force'])).toEqual({ branch: undefined, force: true });
  });

  it('parses --branch with a value', () => {
    expect(parseAddArgs(['--branch', 'agent/sandbox-fix'])).toEqual({ branch: 'agent/sandbox-fix', force: false });
  });

  it('parses --branch and --force together, in either order', () => {
    expect(parseAddArgs(['--branch', 'my-branch', '--force'])).toEqual({ branch: 'my-branch', force: true });
    expect(parseAddArgs(['--force', '--branch', 'my-branch'])).toEqual({ branch: 'my-branch', force: true });
  });

  it('rejects --branch with no value', () => {
    expect(() => parseAddArgs(['--branch'])).toThrow(/requires a value/);
  });

  it('rejects --branch immediately followed by another flag (the original bug)', () => {
    expect(() => parseAddArgs(['--branch', '--force'])).toThrow(/requires a value/);
  });
});

describe('cmdAdd() — dependency-graph gating, with a fake runner (no real git/rush spawned)', () => {
  function fakeRun() {
    const calls = [];
    const run = (cmd, args, cwd) => calls.push({ args, cmd, cwd });
    return { calls, run };
  }

  it('throws for a package that does not exist', () => {
    const { run } = fakeRun();
    expect(() => cmdAdd('totally-fake-pkg', { run })).toThrow(/No such package/);
  });

  it('refuses a coupled package without --force, and runs no commands at all', () => {
    const { calls, run } = fakeRun();
    const result = cmdAdd('ripple', { run });
    expect(result.created).toBe(false);
    expect(calls).toEqual([]);
  });

  it('proceeds for a coupled package with --force: prune, add, install, in order', () => {
    const { calls, run } = fakeRun();
    const result = cmdAdd('ripple', { branch: 'test-branch', force: true, run });
    expect(result).toEqual({ branchName: 'test-branch', created: true, dir: expect.stringContaining('.worktrees/ripple') });
    expect(calls.map((c) => c.cmd)).toEqual(['git', 'git', 'rush']);
    expect(calls[0].args).toEqual(['worktree', 'prune']);
    expect(calls[1].args).toEqual(['worktree', 'add', expect.stringContaining('.worktrees/ripple'), '-b', 'test-branch']);
    expect(calls[2].args).toEqual(['install', '--to', 'ripple']);
  });

  it('proceeds for an independent package without needing --force', () => {
    const { calls, run } = fakeRun();
    const result = cmdAdd('wayfinder', { run });
    expect(result.created).toBe(true);
    expect(calls.map((c) => c.cmd)).toEqual(['git', 'git', 'rush']);
  });

  it('generates a timestamped branch name when none is given', () => {
    const { run } = fakeRun();
    const result = cmdAdd('wayfinder', { run });
    expect(result.branchName).toMatch(/^agent\/wayfinder-\d+$/);
  });

  it('cleans up the branch it created if `git worktree add` itself fails', () => {
    const calls = [];
    const run = (cmd, args) => {
      calls.push({ args, cmd });
      if (cmd === 'git' && args[0] === 'worktree' && args[1] === 'add') {
        throw new Error('simulated failure');
      }
    };
    expect(() => cmdAdd('wayfinder', { branch: 'doomed-branch', run })).toThrow(/git worktree add failed/);
    expect(calls).toEqual([
      { args: ['worktree', 'prune'], cmd: 'git' },
      { args: ['worktree', 'add', expect.stringContaining('.worktrees/wayfinder'), '-b', 'doomed-branch'], cmd: 'git' },
      { args: ['branch', '-D', 'doomed-branch'], cmd: 'git' },
    ]);
  });
});

describe('cmdList() / cmdRemove() — thin wrappers over the injected runner', () => {
  it('cmdList runs `git worktree list`', () => {
    const calls = [];
    cmdList({ run: (cmd, args) => calls.push({ args, cmd }) });
    expect(calls).toEqual([{ args: ['worktree', 'list'], cmd: 'git' }]);
  });

  it('cmdRemove runs `git worktree remove <dir>` with no --force', () => {
    const calls = [];
    cmdRemove('sandbox', { run: (cmd, args) => calls.push({ args, cmd }) });
    expect(calls).toEqual([{ args: ['worktree', 'remove', expect.stringContaining('.worktrees/sandbox')], cmd: 'git' }]);
  });
});
