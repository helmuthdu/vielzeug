import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const refineExternals = [
  '@vielzeug/arsenal',
  '@vielzeug/ore',
  '@vielzeug/ore/directives',
  '@vielzeug/ore/forms',
  '@vielzeug/ore/observers',
  '@vielzeug/dnd',
  '@vielzeug/keymap',
  '@vielzeug/orbit',
  '@vielzeug/ripple',
  '@vielzeug/scroll',
  '@vielzeug/tempo',
  'lucide',
];

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      external: refineExternals,
      fileName: 'refine',
      // ore's sub-paths all live on the single `window.Ore` global at runtime
      // (see packages/ore/src/iife.ts) — without this, the auto-derived global
      // name per external id (e.g. "OreForms") wouldn't exist, and worse, Rollup
      // would silently inline these sub-paths (including ore's module-level
      // "current component" state) as a second, disconnected copy instead of
      // erroring — every lifecycle hook called through that copy would throw
      // "outside setup" no matter what. Route them all to the same global instead.
      globals: {
        '@vielzeug/ore/directives': 'Ore',
        '@vielzeug/ore/forms': 'Ore',
        '@vielzeug/ore/observers': 'Ore',
      },
      name: 'Refine',
    }),
    {
      css: {
        lightningcss: {
          targets: browserslistToTargets(browserslist('>= 0.25%')),
        },
        transformer: 'lightningcss',
      },
    },
  ),
);
