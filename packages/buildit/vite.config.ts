import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getConfig } from '../../vite.config';
import { getBuilditLibraryEntries } from './component-manifest.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: getBuilditLibraryEntries(__dirname),
      name: 'buildit',
    }),
    {
      build: {
        rolldownOptions: {
          external: [
            '@vielzeug/craftit',
            '@vielzeug/dragit',
            '@vielzeug/floatit',
            '@vielzeug/virtualit',
            '@vielzeug/toolkit',
          ],
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
