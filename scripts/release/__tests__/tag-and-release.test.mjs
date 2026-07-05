import { describe, expect, it, vi } from 'vitest';

import { tagAndRelease } from '../tag-and-release.mjs';

function envWithRepo() {
  process.env.GITHUB_SERVER_URL = 'https://github.com';
  process.env.GITHUB_REPOSITORY = 'helmuthdu/vielzeug';
}

describe('tagAndRelease()', () => {
  it('tags, pushes the tag, and creates a GitHub release', () => {
    envWithRepo();
    const run = vi.fn((cmd, args) => {
      if (cmd === 'git' && args[0] === 'rev-parse') throw new Error('unknown revision');
    });

    tagAndRelease({ folder: 'packages/ore', package: '@vielzeug/ore', run, version: '1.0.4' });

    const calls = run.mock.calls.map(([cmd, args]) => [cmd, args[0]]);
    expect(calls).toEqual([
      ['git', 'rev-parse'],
      ['git', 'tag'],
      ['git', 'push'],
      ['gh', 'release'],
    ]);
    expect(run.mock.calls[1][1]).toEqual(['tag', '@vielzeug/ore@1.0.4']);
    expect(run.mock.calls[2][1]).toEqual(['push', 'origin', '@vielzeug/ore@1.0.4']);
  });

  it('refuses to overwrite an existing tag', () => {
    envWithRepo();
    const run = vi.fn((cmd, args) => {
      if (cmd === 'git' && args[0] === 'rev-parse') return '';
    });

    expect(() => tagAndRelease({ folder: 'packages/ore', package: '@vielzeug/ore', run, version: '1.0.4' })).toThrow(
      'Tag @vielzeug/ore@1.0.4 already exists',
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does nothing but log in dry-run mode', () => {
    envWithRepo();
    const run = vi.fn();

    tagAndRelease({ dryRun: true, folder: 'packages/ore', package: '@vielzeug/ore', run, version: '1.0.4' });

    expect(run).not.toHaveBeenCalled();
  });
});
