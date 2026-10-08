import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTrainRelease, tagExists, tagPackage, trainRiders } from '../git-tag.mjs';
import { ALIGNMENT_COMMENT } from '../apply-train.mjs';

let root;

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
  delete process.env.GITHUB_SERVER_URL;
  delete process.env.GITHUB_REPOSITORY;
});

function envWithRepo() {
  process.env.GITHUB_SERVER_URL = 'https://github.com';
  process.env.GITHUB_REPOSITORY = 'helmuthdu/vielzeug';
}

describe('tagPackage()', () => {
  it('tags and pushes the package version', () => {
    const run = vi.fn((cmd, args) => {
      if (cmd === 'git' && args[0] === 'rev-parse') throw new Error('unknown revision');
    });

    tagPackage({ package: '@vielzeug/ore', run, version: '1.0.4' });

    const calls = run.mock.calls.map(([cmd, args]) => [cmd, args[0]]);
    expect(calls).toEqual([
      ['git', 'rev-parse'],
      ['git', 'tag'],
      ['git', 'push'],
    ]);
    expect(run.mock.calls[1][1]).toEqual(['tag', '@vielzeug/ore@1.0.4']);
    expect(run.mock.calls[2][1]).toEqual(['push', 'origin', '@vielzeug/ore@1.0.4']);
  });

  it('refuses to overwrite an existing tag', () => {
    const run = vi.fn((cmd, args) => {
      if (cmd === 'git' && args[0] === 'rev-parse') return '';
    });

    expect(() => tagPackage({ package: '@vielzeug/ore', run, version: '1.0.4' })).toThrow(
      'Tag @vielzeug/ore@1.0.4 already exists',
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does nothing but log in dry-run mode', () => {
    const run = vi.fn();

    tagPackage({ dryRun: true, package: '@vielzeug/ore', run, version: '1.0.4' });

    expect(run).not.toHaveBeenCalled();
  });
});

describe('trainRiders()', () => {
  /** A temp repo where each slug's CHANGELOG.json entry for 26.10.0 carries `comments`. */
  function makeChangelogs(entries) {
    root = mkdtempSync(path.join(tmpdir(), 'git-tag-test-'));
    const projects = Object.keys(entries).map((slug) => ({ packageName: `@vielzeug/${slug}`, projectFolder: `packages/${slug}` }));
    writeFileSync(path.join(root, 'rush.json'), JSON.stringify({ projects }));

    for (const [slug, comments] of Object.entries(entries)) {
      const dir = path.join(root, 'packages', slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: `@vielzeug/${slug}`, version: '26.10.0' }));
      writeFileSync(
        path.join(dir, 'CHANGELOG.json'),
        JSON.stringify({
          entries: [{ comments, date: 'now', tag: `@vielzeug/${slug}_v26.10.0`, version: '26.10.0' }],
          name: `@vielzeug/${slug}`,
        }),
      );
    }
    return root;
  }

  it('lists packages with a real change comment and skips alignment-only ones', () => {
    const repo = makeChangelogs({
      ore: { minor: [{ author: 'a', comment: 'feat: new thing' }] },
      orbit: { patch: [{ author: 'release-train', comment: ALIGNMENT_COMMENT }] },
    });

    expect(trainRiders('26.10.0', { root: repo })).toEqual(['@vielzeug/ore']);
  });

  it('returns nothing when every entry is alignment-only', () => {
    const repo = makeChangelogs({
      ore: { patch: [{ author: 'release-train', comment: ALIGNMENT_COMMENT }] },
    });

    expect(trainRiders('26.10.0', { root: repo })).toEqual([]);
  });

  it('ignores packages whose changelog has no entry for the train', () => {
    root = mkdtempSync(path.join(tmpdir(), 'git-tag-test-'));
    writeFileSync(
      path.join(root, 'rush.json'),
      JSON.stringify({ projects: [{ packageName: '@vielzeug/ore', projectFolder: 'packages/ore' }] }),
    );
    const dir = path.join(root, 'packages', 'ore');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@vielzeug/ore', version: '26.10.0' }));
    writeFileSync(path.join(dir, 'CHANGELOG.json'), JSON.stringify({ entries: [{ comments: {}, version: '26.9.0' }] }));

    expect(trainRiders('26.10.0', { root })).toEqual([]);
  });
});

describe('createTrainRelease()', () => {
  it('tags the train number and creates one aggregate GitHub release', () => {
    envWithRepo();
    const run = vi.fn((cmd, args) => {
      if (cmd === 'git' && args[0] === 'rev-parse') throw new Error('unknown revision');
    });

    createTrainRelease({ riders: ['@vielzeug/ore'], run, version: '26.10.0' });

    const calls = run.mock.calls.map(([cmd, args]) => [cmd, args[0]]);
    expect(calls).toEqual([
      ['git', 'rev-parse'],
      ['git', 'tag'],
      ['git', 'push'],
      ['gh', 'release'],
    ]);
    expect(run.mock.calls[1][1]).toEqual(['tag', '26.10.0']);
    expect(run.mock.calls[2][1]).toEqual(['push', 'origin', '26.10.0']);
    const ghArgs = run.mock.calls[3][1];
    expect(ghArgs[0]).toBe('release');
    expect(ghArgs[1]).toBe('create');
    expect(ghArgs[2]).toBe('26.10.0');
    expect(ghArgs).toContain('Release train 26.10.0');
  });

  it('skips (without failing) when the train tag already exists', () => {
    envWithRepo();
    const run = vi.fn(() => ''); // rev-parse succeeds: tag exists
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    createTrainRelease({ riders: [], run, version: '26.10.0' });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('already exists: skipping'));
    expect(run).toHaveBeenCalledTimes(1); // only the rev-parse probe
  });

  it('does nothing but log in dry-run mode', () => {
    envWithRepo();
    const run = vi.fn();

    createTrainRelease({ dryRun: true, riders: ['@vielzeug/ore'], run, version: '26.10.0' });

    expect(run).not.toHaveBeenCalled();
  });

  it('throws when no train version can be resolved', () => {
    root = mkdtempSync(path.join(tmpdir(), 'git-tag-test-'));
    writeFileSync(path.join(root, 'rush.json'), JSON.stringify({ projects: [] }));

    expect(() => createTrainRelease({ list: () => [], root, run: vi.fn() })).toThrow(/nothing to release/);
  });
});

describe('tagExists()', () => {
  it('returns true when the tag already exists', () => {
    const run = vi.fn(() => '');

    expect(tagExists('@vielzeug/ore@1.0.4', { run })).toBe(true);
    expect(run).toHaveBeenCalledWith('git', ['rev-parse', '@vielzeug/ore@1.0.4'], { quiet: true });
  });

  it('returns false when the tag does not exist', () => {
    const run = vi.fn(() => {
      throw new Error('unknown revision');
    });

    expect(tagExists('@vielzeug/ore@1.0.4', { run })).toBe(false);
  });
});
