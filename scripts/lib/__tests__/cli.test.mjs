import { describe, expect, it } from 'vitest';

import { isMain, parseArgs, run } from '../cli.mjs';

describe('run()', () => {
  it('returns captured stdout by default', () => {
    expect(run('node', ['-e', "process.stdout.write('hello')"])).toBe('hello');
  });

  it('quiet mode discards output but still lets a successful exit through', () => {
    expect(run('node', ['-e', "process.stdout.write('hello')"], { quiet: true })).toBeNull();
  });

  it('quiet takes priority over inherit', () => {
    expect(run('node', ['-e', "process.stdout.write('hello')"], { inherit: true, quiet: true })).toBeNull();
  });

  it('propagates a non-zero exit as a thrown error, regardless of IO posture', () => {
    expect(() => run('node', ['-e', 'process.exit(1)'], { quiet: true })).toThrow();
  });
});

describe('isMain()', () => {
  it('is true when argv[1] matches the given module URL', () => {
    const url = `file://${process.argv[1]}`;
    expect(isMain(url)).toBe(true);
  });

  it('is false for an unrelated module URL', () => {
    expect(isMain('file:///not/the/entry/point.mjs')).toBe(false);
  });
});

describe('parseArgs()', () => {
  it('separates positionals from flags', () => {
    expect(parseArgs(['@vielzeug/ore', '1.2.3', 'packages/ore'])).toEqual({
      flags: {},
      positionals: ['@vielzeug/ore', '1.2.3', 'packages/ore'],
    });
  });

  it('parses --flag=value', () => {
    expect(parseArgs(['--otp=123456'])).toEqual({ flags: { otp: '123456' }, positionals: [] });
  });

  it('treats a bare --flag as boolean true', () => {
    expect(parseArgs(['--interactive'])).toEqual({ flags: { interactive: true }, positionals: [] });
  });

  it('does not swallow a following positional as a boolean flag value', () => {
    expect(parseArgs(['--interactive', 'packages/ore'])).toEqual({
      flags: { interactive: true },
      positionals: ['packages/ore'],
    });
  });

  it('mixes positionals and flags in any order', () => {
    expect(parseArgs(['@vielzeug/ore', '--otp=123456', '1.2.3', '--interactive', 'packages/ore'])).toEqual({
      flags: { interactive: true, otp: '123456' },
      positionals: ['@vielzeug/ore', '1.2.3', 'packages/ore'],
    });
  });

  it('handles an "=" inside the flag value itself', () => {
    expect(parseArgs(['--before-file=/tmp/versions-before.txt'])).toEqual({
      flags: { 'before-file': '/tmp/versions-before.txt' },
      positionals: [],
    });
  });

  it('returns empty results for an empty argv', () => {
    expect(parseArgs([])).toEqual({ flags: {}, positionals: [] });
  });

  it('drops a literal "--" separator instead of parsing it as a flag named ""', () => {
    // Real shape of `pnpm run <script> -- --package=ripple` — pnpm forwards the `--` itself
    // into the script's argv, it does not strip it (verified empirically, see cli.mjs's
    // parseArgs() header comment).
    expect(parseArgs(['--', '--package=ripple'])).toEqual({
      flags: { package: 'ripple' },
      positionals: [],
    });
  });

  it('drops "--" wherever it appears, including between positionals and flags', () => {
    expect(parseArgs(['add', 'ripple', '--', '--force'])).toEqual({
      flags: { force: true },
      positionals: ['add', 'ripple'],
    });
  });
});
