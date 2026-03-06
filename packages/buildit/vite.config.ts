import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { defineConfig, mergeConfig } from 'vite';
import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig(
  mergeConfig(
    getConfig(__dirname, {
      entry: {
        accordion: resolve(__dirname, './src/disclosure/accordion/accordion'),
        'accordion-item': resolve(__dirname, './src/disclosure/accordion-item/accordion-item'),
        alert: resolve(__dirname, './src/feedback/alert/alert'),
        badge: resolve(__dirname, './src/feedback/badge/badge'),
        button: resolve(__dirname, './src/actions/button/button'),
        'button-group': resolve(__dirname, './src/actions/button-group/button-group'),
        card: resolve(__dirname, './src/content/card/card'),
        checkbox: resolve(__dirname, './src/form/checkbox/checkbox'),
        index: resolve(__dirname, './src/index'),
        'file-input': resolve(__dirname, './src/form/file-input/file-input'),
        input: resolve(__dirname, './src/form/input/input'),
        radio: resolve(__dirname, './src/form/radio/radio'),
        select: resolve(__dirname, './src/form/select/select'),
        slider: resolve(__dirname, './src/form/slider/slider'),
        switch: resolve(__dirname, './src/form/switch/switch'),
        text: resolve(__dirname, './src/content/text/text'),
        textarea: resolve(__dirname, './src/form/textarea/textarea'),
        tooltip: resolve(__dirname, './src/overlay/tooltip/tooltip'),
      },
      name: 'buildit',
    }),
    {
      build: {
        cssMinify: 'lightningcss',
        rollupOptions: {
          external: ['@vielzeug/craftit'],
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
