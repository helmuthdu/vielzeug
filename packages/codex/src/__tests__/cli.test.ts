import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { main } from '../cli.js';

describe('CLI', () => {
  it('returns success for help without loading a snapshot', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(main(['--help'])).resolves.toBe(0);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Usage: codex'));
    stderr.mockRestore();
  });

  it('returns failure for unknown flags without exiting process', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(main(['--unknown'])).resolves.toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('error:'));
    stderr.mockRestore();
  });

  it('installs bundled skills into an explicit target', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const target = mkdtempSync(join(tmpdir(), 'codex-cli-skills-'));

    try {
      await expect(main(['skills', 'install', `--target=${target}`])).resolves.toBe(0);
      expect(existsSync(join(target, 'vielzeug/SKILL.md'))).toBe(true);
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('installed skill "vielzeug"'));

      await expect(main(['skills', 'install', `--target=${target}`])).resolves.toBe(1);
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('--force'));
    } finally {
      rmSync(target, { force: true, recursive: true });
      stderr.mockRestore();
    }
  });

  it('rejects unknown skills commands', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(main(['skills', 'remove'])).resolves.toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('expected: install'));
    stderr.mockRestore();
  });
});
