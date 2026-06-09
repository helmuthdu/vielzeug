import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';

import { getBundleConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sigilExternals = [
  '@vielzeug/arsenal',
  '@vielzeug/craft',
  '@vielzeug/grip',
  '@vielzeug/orbit',
  '@vielzeug/ripple',
  '@vielzeug/scroll',
  '@vielzeug/tempo',
  'lucide',
];

export default defineConfig(
  mergeConfig(
    getBundleConfig(__dirname, {
      external: sigilExternals,
      fileName: 'sigil',
      name: 'Sigil',
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
