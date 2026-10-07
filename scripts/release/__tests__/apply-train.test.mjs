import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyTrain, listChangedPackageNames, listChangeFiles } from '../apply-train.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

const NOW = new Date('2026-10-01T12:00:00Z');
const OLD_DATE = 'Mon, 01 Jan 2024 00:00:00 GMT';

function writeProject(slug, version) {
  const dir = path.join(root, 'packages', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: `@vielzeug/${slug}`, version }, null, 2)}\n`);
  writeFileSync(
    path.join(dir, 'CHANGELOG.md'),
    `# Change Log - @vielzeug/${slug}\n\nThis log was last generated on ${OLD_DATE} and should not be manually modified.\n\n## 1.0.0\n${OLD_DATE}\n\n### Patches\n\n- initial\n`,
  );
  writeFileSync(
    path.join(dir, 'CHANGELOG.json'),
    `${JSON.stringify(
      {
        entries: [
          { comments: { patch: [{ author: 'someone', comment: 'initial' }] }, date: OLD_DATE, tag: `@vielzeug/${slug}_v1.0.0`, version: '1.0.0' },
        ],
        name: `@vielzeug/${slug}`,
      },
      null,
      2,
    )}\n`,
  );
}

function writeChangeFile(name, type, comment) {
  const dir = path.join(root, 'common', 'changes', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'agent_1.json'),
    `${JSON.stringify({ changes: [{ comment, packageName: name, type }], email: 'agent@vielzeug', packageName: name }, null, 2)}\n`,
  );
}

function makeRepo() {
  root = mkdtempSync(path.join(tmpdir(), 'apply-train-test-'));
  writeFileSync(
    path.join(root, 'rush.json'),
    JSON.stringify({
      projects: [
        { packageName: '@vielzeug/ore', projectFolder: 'packages/ore' },
        { packageName: '@vielzeug/orbit', projectFolder: 'packages/orbit' },
      ],
    }),
  );
  writeProject('ore', '3.0.0');
  writeProject('orbit', '2.5.0');
  writeChangeFile('@vielzeug/ore', 'minor', 'feat: ore rides trains');
  writeChangeFile('@vielzeug/orbit', 'patch', 'fix: orbit thing');
  return root;
}

describe('listChangeFiles()', () => {
  it('returns an empty array when the changes directory does not exist', () => {
    expect(listChangeFiles(path.join(tmpdir(), 'does-not-exist'))).toEqual([]);
  });

  it('lists every *.json change file, one per package directory', () => {
    const repo = makeRepo();
    const files = listChangeFiles(path.join(repo, 'common', 'changes')).sort();
    expect(files).toEqual([path.join('@vielzeug/orbit', 'agent_1.json'), path.join('@vielzeug/ore', 'agent_1.json')]);
  });
});

describe('listChangedPackageNames()', () => {
  it('returns sorted, de-duplicated package names', () => {
    const repo = makeRepo();
    writeChangeFile('@vielzeug/ore', 'patch', 'another ore change');
    expect(listChangedPackageNames(repo)).toEqual(['@vielzeug/orbit', '@vielzeug/ore']);
  });

  it('returns an empty array when nothing is pending', () => {
    root = mkdtempSync(path.join(tmpdir(), 'apply-train-test-'));
    expect(listChangedPackageNames(root)).toEqual([]);
  });
});

describe('applyTrain()', () => {
  it('stamps every manifest with the train version and changelogs only changed packages', () => {
    const repo = makeRepo();
    const run = vi.fn(() => '');

    const result = applyTrain(undefined, { now: NOW, root: repo, run });

    expect(result).toEqual({ changedPackages: ['@vielzeug/orbit', '@vielzeug/ore'], train: '26.10.0' });

    // Every manifest carries the train: lockstep.
    for (const slug of ['ore', 'orbit']) {
      expect(JSON.parse(readFileSync(path.join(repo, 'packages', slug, 'package.json'), 'utf8')).version).toBe('26.10.0');
    }

    // Changed packages got a changelog entry for the train…
    const oreLog = readFileSync(path.join(repo, 'packages', 'ore', 'CHANGELOG.md'), 'utf8');
    expect(oreLog.startsWith('# Change Log - @vielzeug/ore\n\nThis log was last generated on Thu, 01 Oct 2026 12:00:00 GMT')).toBe(true);
    expect(oreLog).toContain('## 26.10.0');
    expect(oreLog).toContain('### Minor changes');
    expect(oreLog).toContain('- feat: ore rides trains');
    expect(oreLog).toContain('## 1.0.0'); // prior history survives below the new entry

    const oreJson = JSON.parse(readFileSync(path.join(repo, 'packages', 'ore', 'CHANGELOG.json'), 'utf8'));
    expect(oreJson.entries[0]).toMatchObject({ tag: '@vielzeug/ore_v26.10.0', version: '26.10.0' });
    expect(oreJson.entries[0].comments.minor[0]).toMatchObject({ author: 'agent@vielzeug', comment: 'feat: ore rides trains' });
    expect(oreJson.entries[1].version).toBe('1.0.0');

    // …and both packages' change files are consumed.
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'agent_1.json'))).toBe(false);
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'agent_1.json'))).toBe(false);

    // One commit lands the train: the stamp, the changelogs, and the change-file removals.
    const commands = run.mock.calls.filter(([cmd]) => cmd === 'git').map(([, args]) => args.join(' '));
    expect(commands.some((line) => line.startsWith('add '))).toBe(true);
    expect(commands).toContainEqual(expect.stringContaining('chore: apply release train 26.10.0'));
  });

  it('scopes a single-package train: sibling change files survive, every manifest still stamps', () => {
    const repo = makeRepo();
    const run = vi.fn(() => '');

    const result = applyTrain('@vielzeug/ore', { now: NOW, root: repo, run });

    expect(result).toEqual({ changedPackages: ['@vielzeug/ore'], train: '26.10.0' });

    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'agent_1.json'))).toBe(false);
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'agent_1.json'))).toBe(true);

    // The sibling is stamped (a train is repo-wide) but gets no changelog entry :
    // publish-missing's changelog-entry rule keeps it from ever publishing this train.
    expect(JSON.parse(readFileSync(path.join(repo, 'packages', 'orbit', 'package.json'), 'utf8')).version).toBe('26.10.0');
    expect(readFileSync(path.join(repo, 'packages', 'orbit', 'CHANGELOG.md'), 'utf8')).not.toContain('## 26.10.0');
  });

  it('pulls a rider dependency with no change file onto the train with an alignment entry', () => {
    // ore rides the train and depends on orbit; orbit has NO change file of its own. Without
    // the closure rule, orbit is stamped but never changelogged, so it never publishes and
    // ore's exact pin to it dangles on npm (the prism -> orbit 26.10.2 breakage).
    const repo = makeRepo();
    rmSync(path.join(repo, 'common', 'changes', '@vielzeug/orbit', 'agent_1.json')); // orbit no longer rides
    // Give ore a real dependency edge on orbit.
    const oreManifest = JSON.parse(readFileSync(path.join(repo, 'packages', 'ore', 'package.json'), 'utf8'));
    oreManifest.dependencies = { '@vielzeug/orbit': 'workspace:*' };
    writeFileSync(path.join(repo, 'packages', 'ore', 'package.json'), JSON.stringify(oreManifest, null, 2));

    const run = vi.fn(() => '');
    const result = applyTrain(undefined, { now: NOW, root: repo, run });

    // The publish set is the closure: ore (rider) plus orbit (pulled in).
    expect(result).toEqual({ changedPackages: ['@vielzeug/orbit', '@vielzeug/ore'], train: '26.10.0' });

    // orbit got an alignment-only changelog entry for the train, so it now publishes at it.
    const orbitLog = readFileSync(path.join(repo, 'packages', 'orbit', 'CHANGELOG.md'), 'utf8');
    expect(orbitLog).toContain('## 26.10.0');
    expect(orbitLog).toContain('chore: align with CalVer lockstep trains: no code change this train');
    const orbitJson = JSON.parse(readFileSync(path.join(repo, 'packages', 'orbit', 'CHANGELOG.json'), 'utf8'));
    expect(orbitJson.entries[0]).toMatchObject({ tag: '@vielzeug/orbit_v26.10.0', version: '26.10.0' });
    expect(orbitJson.entries[0].comments.patch[0].comment).toContain('no code change this train');
  });

  it('advances the revision when a train already shipped this month', () => {
    const repo = makeRepo();
    const run = vi.fn(() => '');

    applyTrain(undefined, { now: NOW, root: repo, run });
    writeChangeFile('@vielzeug/ore', 'patch', 'feat: ore rides again');

    const second = applyTrain(undefined, { now: new Date('2026-10-15T12:00:00Z'), root: repo, run });
    expect(second.train).toBe('26.10.1');
    expect(JSON.parse(readFileSync(path.join(repo, 'packages', 'orbit', 'package.json'), 'utf8')).version).toBe('26.10.1');
  });

  it('dry-runs without touching manifests, changelogs, change files, or git', () => {
    const repo = makeRepo();
    const run = vi.fn(() => '');

    const result = applyTrain(undefined, { dryRun: true, now: NOW, root: repo, run });

    expect(result).toEqual({ changedPackages: ['@vielzeug/orbit', '@vielzeug/ore'], train: '26.10.0' });
    expect(JSON.parse(readFileSync(path.join(repo, 'packages', 'ore', 'package.json'), 'utf8')).version).toBe('3.0.0');
    expect(readFileSync(path.join(repo, 'packages', 'ore', 'CHANGELOG.md'), 'utf8')).not.toContain('## 26.10.0');
    expect(existsSync(path.join(repo, 'common', 'changes', '@vielzeug/ore', 'agent_1.json'))).toBe(true);
    expect(run).not.toHaveBeenCalled();
  });

  it('throws when no pending change file matches', () => {
    const repo = makeRepo();
    expect(() => applyTrain('@vielzeug/coins', { now: NOW, root: repo, run: vi.fn() })).toThrow(
      /No pending change files for @vielzeug\/coins/,
    );

    root = mkdtempSync(path.join(tmpdir(), 'apply-train-empty-'));
    expect(() => applyTrain(undefined, { now: NOW, root, run: vi.fn() })).toThrow(/No pending change files/);
  });
});
