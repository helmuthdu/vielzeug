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
        breadcrumb: resolve(__dirname, './src/content/breadcrumb/breadcrumb'),
        button: resolve(__dirname, './src/actions/button/button'),
        'button-group': resolve(__dirname, './src/actions/button-group/button-group'),
        card: resolve(__dirname, './src/content/card/card'),
        checkbox: resolve(__dirname, './src/form/checkbox/checkbox'),
        'checkbox-group': resolve(__dirname, './src/form/checkbox-group/checkbox-group'),
        chip: resolve(__dirname, './src/feedback/chip/chip'),
        combobox: resolve(__dirname, './src/form/combobox/combobox'),
        dialog: resolve(__dirname, './src/overlay/dialog/dialog'),
        'file-input': resolve(__dirname, './src/form/file-input/file-input'),
        form: resolve(__dirname, './src/form/form/form'),
        index: resolve(__dirname, './src/index'),
        input: resolve(__dirname, './src/form/input/input'),
        menu: resolve(__dirname, './src/overlay/menu/menu'),
        progress: resolve(__dirname, './src/feedback/progress/progress'),
        radio: resolve(__dirname, './src/form/radio/radio'),
        'radio-group': resolve(__dirname, './src/form/radio-group/radio-group'),
        select: resolve(__dirname, './src/form/select/select'),
        skeleton: resolve(__dirname, './src/feedback/skeleton/skeleton'),
        slider: resolve(__dirname, './src/form/slider/slider'),
        switch: resolve(__dirname, './src/form/switch/switch'),
        text: resolve(__dirname, './src/content/text/text'),
        textarea: resolve(__dirname, './src/form/textarea/textarea'),
        toast: resolve(__dirname, './src/feedback/toast/toast'),
        tooltip: resolve(__dirname, './src/overlay/tooltip/tooltip'),
      },
      name: 'buildit',
    }),
    {
      build: {
        cssMinify: 'lightningcss',
        rollupOptions: {
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
