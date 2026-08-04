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
});
