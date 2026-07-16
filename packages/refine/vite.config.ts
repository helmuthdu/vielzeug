import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';
// @ts-expect-error - .mjs files don't have type declarations in this context
import { getRefineLibraryEntries } from './scripts/refine-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const disablePluginTimings = processEnv?.CI === 'true' || processEnv?.RUSHSTACK_FILE_ERROR_BASE_FOLDER !== undefined;

const refineExternals = [
  '@vielzeug/ore',
  '@vielzeug/dnd',
  '@vielzeug/orbit',
  '@vielzeug/ripple',
  '@vielzeug/arsenal',
  '@vielzeug/tempo',
  'lucide',
];

// Rollup/Rolldown's `external` matches array-of-strings entries by exact equality only — it
// does NOT treat them as prefixes. Without this, subpath imports like `@vielzeug/ore/forms` or
// `@vielzeug/ore/directives` fail to match `@vielzeug/ore` and get bundled (vendored) into this
// package's own dist instead of staying external. That silently creates a second, private copy
// of ore's module-scope singleton state (e.g. the `getHost()` setup-context tracker), which
// breaks the moment a consumer app also imports `@vielzeug/ore` directly: refine's own
// `useField()`/`getHost()` calls see an empty context and throw "Lifecycle hooks must be called
// during component setup". Match subpaths explicitly so every import of an externalized package
// — whatever its subpath — resolves to the same shared module instance as the consumer's.
const isRefineExternal = (id: string): boolean => refineExternals.some((dep) => id === dep || id.startsWith(`${dep}/`));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: getRefineLibraryEntries(__dirname),
      name: 'refine',
    }),
    {
      build: {
        rolldownOptions: {
          checks: {
            pluginTimings: !disablePluginTimings,
          },
          external: isRefineExternal,
        },
      },
      css: {
        lightningcss: {
          targets: browserslistToTargets(browserslist('>= 0.25%')),
        },
        transformer: 'lightningcss',
      },
    },
  ),
);
