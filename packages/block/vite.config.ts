import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';
// @ts-expect-error - .mjs files don't have type declarations in this context
import { getBuilditLibraryEntries } from './block-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
  .process?.env;
const disablePluginTimings = processEnv?.CI === 'true' || processEnv?.RUSHSTACK_FILE_ERROR_BASE_FOLDER !== undefined;

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: getBuilditLibraryEntries(__dirname),
      name: 'block',
    }),
    {
      build: {
        rolldownOptions: {
          checks: {
            pluginTimings: !disablePluginTimings,
          },
          external: ['/craft', '/grip', '/orbit', '/scroll', '@vielzeug/toolkit'],
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
