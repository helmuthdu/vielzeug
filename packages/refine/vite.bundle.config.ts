import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig, readWorkspaceDeps } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Base list derived from package.json (also fixes '@vielzeug/scroll' being hand-listed here
// despite src/ never importing it — a dead entry from some earlier version of this package)
// plus the three ore sub-paths this bundle's entry imports, needed for the `globals` mapping
// below since Rolldown's array-of-strings `external` only matches by exact equality.
const refineExternals = [
  ...readWorkspaceDeps(__dirname),
  '@vielzeug/ore/directives',
  '@vielzeug/ore/forms',
  '@vielzeug/ore/observers',
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
