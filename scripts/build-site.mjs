import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, run } from './lib/cli.mjs';

export const SITE_DEMOS = ['voyage', 'eshop', 'crm'];

export function buildSite({ environment = process.env, root = path.resolve(fileURLToPath(new URL('..', import.meta.url))), runCommand = run } = {}) {
  runCommand('pnpm', ['docs:build'], { cwd: root, inherit: true });

  for (const demo of SITE_DEMOS) {
    runCommand('pnpm', ['--dir', `demos/${demo}`, 'build'], {
      cwd: root,
      env: {
        ...environment,
        DEMO_BASE: `/demos/${demo}/`,
        DEMO_OUT_DIR: path.join(root, 'docs/.vitepress/dist/demos', demo),
      },
      inherit: true,
    });
  }
}

if (isMain(import.meta.url)) {
  try {
    buildSite();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
