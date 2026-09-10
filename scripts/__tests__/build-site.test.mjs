import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildSite, SITE_DEMOS } from '../build-site.mjs';

describe('buildSite()', () => {
  it('builds docs before embedding every demo under its deployment base', () => {
    const runCommand = vi.fn();
    const root = '/repo';

    buildSite({ environment: { NODE_ENV: 'production' }, root, runCommand });

    expect(runCommand).toHaveBeenCalledTimes(4);
    expect(runCommand).toHaveBeenNthCalledWith(1, 'pnpm', ['docs:build'], { cwd: root, inherit: true });

    for (const [index, demo] of SITE_DEMOS.entries()) {
      expect(runCommand).toHaveBeenNthCalledWith(index + 2, 'pnpm', ['--dir', `demos/${demo}`, 'build'], {
        cwd: root,
        env: {
          DEMO_BASE: `/demos/${demo}/`,
          DEMO_OUT_DIR: path.join(root, 'docs/.vitepress/dist/demos', demo),
          NODE_ENV: 'production',
        },
        inherit: true,
      });
    }
  });
});
