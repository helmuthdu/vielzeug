import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { getConfig } from '../../vite.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
export default defineConfig(
  getConfig(__dirname, {
    build: {
      cssMinify: 'lightningcss',
    },
    css: {
      lightningcss: {
        targets: browserslistToTargets(browserslist('>= 0.25%')),
      },
      transformer: 'lightningcss',
    },
    entry: {
      accordion: resolve(__dirname, './src/base/accordion/accordion'),
      'accordion-item': resolve(__dirname, './src/base/accordion-item/accordion-item'),
      button: resolve(__dirname, './src/base/button/button'),
      'button-group': resolve(__dirname, './src/base/button-group/button-group'),
      card: resolve(__dirname, './src/base/card/card'),
      checkbox: resolve(__dirname, './src/form/checkbox/checkbox'),
      index: resolve(__dirname, './src/index'),
      input: resolve(__dirname, './src/form/input/input'),
      radio: resolve(__dirname, './src/form/radio/radio'),
      slider: resolve(__dirname, './src/form/slider/slider'),
      switch: resolve(__dirname, './src/form/switch/switch'),
      text: resolve(__dirname, './src/base/text/text'),
    },
    linkedDependencies: ['@vielzeug/craftit'],
    name: 'buildit',
  }),
);
