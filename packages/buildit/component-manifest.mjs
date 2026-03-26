import { resolve } from 'node:path';

/**
 * Ordered inventory of published buildit component entry points.
 * Keep this list as the single internal source of truth for component subpaths.
 */
export const componentManifest = [
  { name: 'accordion', source: './src/disclosure/accordion/accordion' },
  { name: 'accordion-item', source: './src/disclosure/accordion-item/accordion-item' },
  { name: 'alert', source: './src/feedback/alert/alert' },
  { name: 'async', source: './src/feedback/async/async' },
  { name: 'avatar', source: './src/content/avatar/avatar' },
  { name: 'badge', source: './src/feedback/badge/badge' },
  { name: 'box', source: './src/layout/box/box' },
  { name: 'breadcrumb', source: './src/content/breadcrumb/breadcrumb' },
  { name: 'button', source: './src/inputs/button/button' },
  { name: 'button-group', source: './src/inputs/button-group/button-group' },
  { name: 'card', source: './src/content/card/card' },
  { name: 'checkbox', source: './src/inputs/checkbox/checkbox' },
  { name: 'checkbox-group', source: './src/inputs/checkbox-group/checkbox-group' },
  { name: 'chip', source: './src/feedback/chip/chip' },
  { name: 'combobox', source: './src/inputs/combobox/combobox' },
  { name: 'dialog', source: './src/overlay/dialog/dialog' },
  { name: 'drawer', source: './src/overlay/drawer/drawer' },
  { name: 'file-input', source: './src/inputs/file-input/file-input' },
  { name: 'form', source: './src/inputs/form/form' },
  { name: 'grid', source: './src/layout/grid/grid' },
  { name: 'grid-item', source: './src/layout/grid-item/grid-item' },
  { name: 'icon', source: './src/content/icon/icon' },
  { name: 'input', source: './src/inputs/input/input' },
  { name: 'menu', source: './src/overlay/menu/menu' },
  { name: 'number-input', source: './src/inputs/number-input/number-input' },
  { name: 'otp-input', source: './src/inputs/otp-input/otp-input' },
  { name: 'pagination', source: './src/content/pagination/pagination' },
  { name: 'popover', source: './src/overlay/popover/popover' },
  { name: 'progress', source: './src/feedback/progress/progress' },
  { name: 'radio', source: './src/inputs/radio/radio' },
  { name: 'radio-group', source: './src/inputs/radio-group/radio-group' },
  { name: 'rating', source: './src/inputs/rating/rating' },
  { name: 'select', source: './src/inputs/select/select' },
  { name: 'separator', source: './src/content/separator/separator' },
  { name: 'sidebar', source: './src/layout/sidebar/sidebar' },
  { name: 'skeleton', source: './src/feedback/skeleton/skeleton' },
  { name: 'slider', source: './src/inputs/slider/slider' },
  { name: 'switch', source: './src/inputs/switch/switch' },
  { name: 'tab-item', source: './src/disclosure/tab-item/tab-item' },
  { name: 'tab-panel', source: './src/disclosure/tab-panel/tab-panel' },
  { name: 'table', source: './src/content/table/table' },
  { name: 'tabs', source: './src/disclosure/tabs/tabs' },
  { name: 'text', source: './src/content/text/text' },
  { name: 'textarea', source: './src/inputs/textarea/textarea' },
  { name: 'toast', source: './src/feedback/toast/toast' },
  { name: 'tooltip', source: './src/overlay/tooltip/tooltip' },
];

export const componentNames = componentManifest.map(({ name }) => name);

export function getComponentExportTargets({ name, source }) {
  return {
    source: `${source}.ts`,
    import: `./dist/${name}.js`,
    require: `./dist/${name}.cjs`,
    types: `./dist/${source.replace('./src/', '')}.d.ts`,
  };
}

export function getComponentExports() {
  return Object.fromEntries(
    componentManifest.map((component) => [`./${component.name}`, getComponentExportTargets(component)]),
  );
}

export function getBuilditLibraryEntries(rootDir) {
  return Object.fromEntries([
    ['index', resolve(rootDir, './src/index')],
    ...componentManifest.map(({ name, source }) => [name, resolve(rootDir, source)]),
  ]);
}
