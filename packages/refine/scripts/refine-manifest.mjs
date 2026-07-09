import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { refineCemPlugin } from './cem-plugin-refine.mjs';

/**
 * Ordered inventory of published refine component entry points.
 * Keep this list as the single internal source of truth for component subpaths.
 */
export const componentManifest = [
  { name: 'accordion', source: './src/disclosure/accordion/accordion' },
  { name: 'accordion-item', source: './src/disclosure/accordion-item/accordion-item' },
  { name: 'alert', source: './src/feedback/alert/alert' },
  { name: 'async', source: './src/feedback/async/async' },
  { name: 'avatar', source: './src/content/avatar/avatar' },
  { name: 'avatar-group', source: './src/content/avatar/avatar' },
  { name: 'badge', source: './src/feedback/badge/badge' },
  { name: 'password-strength', source: './src/feedback/password-strength/password-strength' },
  { name: 'box', source: './src/layout/box/box' },
  { name: 'breadcrumb', source: './src/content/breadcrumb/breadcrumb' },
  { name: 'button', source: './src/inputs/button/button' },
  { name: 'button-group', source: './src/inputs/button-group/button-group' },
  { name: 'calendar', source: './src/inputs/calendar/calendar' },
  { name: 'card', source: './src/content/card/card' },
  { name: 'carousel', source: './src/content/carousel/carousel' },
  { name: 'chat-message', source: './src/content/chat-message/chat-message' },
  { name: 'checkbox', source: './src/inputs/checkbox/checkbox' },
  { name: 'checkbox-group', source: './src/inputs/checkbox-group/checkbox-group' },
  { name: 'chip', source: './src/feedback/chip/chip' },
  { name: 'code-window', source: './src/content/code-window/code-window' },
  { name: 'copy-command', source: './src/content/copy-command/copy-command' },
  { name: 'combobox', source: './src/inputs/combobox/combobox' },
  { name: 'command-palette', source: './src/overlay/command-palette/command-palette' },
  { name: 'datagrid', source: './src/inputs/datagrid/datagrid' },
  { name: 'date-picker', source: './src/inputs/date-picker/date-picker' },
  { name: 'dialog', source: './src/overlay/dialog/dialog' },
  { name: 'drawer', source: './src/overlay/drawer/drawer' },
  { name: 'file-input', source: './src/inputs/file-input/file-input' },
  { name: 'form', source: './src/inputs/form/form' },
  { name: 'grid', source: './src/layout/grid/grid' },
  { name: 'grid-item', source: './src/layout/grid-item/grid-item' },
  { name: 'icon', source: './src/content/icon/icon' },
  { name: 'input', source: './src/inputs/input/input' },
  { name: 'menu', source: './src/overlay/menu/menu' },
  { name: 'navbar', source: './src/layout/navbar/navbar' },
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
  { name: 'skeleton', source: './src/feedback/skeleton/skeleton' },
  { name: 'slider', source: './src/inputs/slider/slider' },
  { name: 'sidebar', source: './src/layout/sidebar/sidebar' },
  { name: 'switch', source: './src/inputs/switch/switch' },
  { name: 'tab-item', source: './src/disclosure/tab-item/tab-item' },
  { name: 'tab-panel', source: './src/disclosure/tab-panel/tab-panel' },
  { name: 'table', source: './src/content/table/table' },
  { name: 'tabs', source: './src/disclosure/tabs/tabs' },
  { name: 'text', source: './src/content/text/text' },
  { name: 'textarea', source: './src/inputs/textarea/textarea' },
  { name: 'time-picker', source: './src/inputs/time-picker/time-picker' },
  { name: 'toast', source: './src/feedback/toast/toast' },
  { name: 'tooltip', source: './src/overlay/tooltip/tooltip' },
  { name: 'typing-indicator', source: './src/feedback/typing-indicator/typing-indicator' },
];

export const componentNames = componentManifest.map(({ name }) => name);

const packageJsonUrl = new URL('../package.json', import.meta.url);
const processRef = globalThis.process;

const staticExportKeys = new Set([
  '.',
  './headless',
  './testing',
  './types',
  './styles',
  './styles/animation.css',
  './styles/layers.css',
  './styles/preflight.css',
  './styles/styles.css',
  './styles/theme.css',
]);

const staticCssExports = {
  './styles': {
    import: './dist/styles/styles.css',
    default: './dist/styles/styles.css',
  },
  './styles/animation.css': {
    import: './dist/styles/animation.css',
    default: './dist/styles/animation.css',
  },
  './styles/layers.css': {
    import: './dist/styles/layer.css',
    default: './dist/styles/layer.css',
  },
  './styles/preflight.css': {
    import: './dist/styles/preflight.css',
    default: './dist/styles/preflight.css',
  },
  './styles/styles.css': {
    import: './dist/styles/styles.css',
    default: './dist/styles/styles.css',
  },
  './styles/theme.css': {
    import: './dist/styles/theme.css',
    default: './dist/styles/theme.css',
  },
};

export const customElementsManifestConfig = {
  dependencies: false,
  dev: false,
  exclude: [
    'src/**/*.test.ts',
    'src/**/__tests__/**',
    'src/utils/**',
    'src/**/index.ts',
    'src/types/**',
    'src/styles/**',
  ],
  fast: false,
  globs: ['src/**/*.ts'],
  litelement: false,
  outdir: 'dist',
  packagejson: true,
  plugins: [refineCemPlugin()],
  stencil: false,
  watch: false,
  catalyst: false,
};

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

export function getRefineLibraryEntries(rootDir) {
  return Object.fromEntries([
    ['index', resolve(rootDir, './src/index')],
    ['headless', resolve(rootDir, './src/headless/index')],
    ['testing', resolve(rootDir, './src/testing/index')],
    ...componentManifest.map(({ name, source }) => [name, resolve(rootDir, source)]),
  ]);
}

export function readRefinePackageJson() {
  return JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
}

function getStaticExports(exportsField = {}) {
  return Object.fromEntries(
    Object.entries(exportsField).filter(([key]) => !key.startsWith('./') || staticExportKeys.has(key)),
  );
}

export function createRefineExports(exportsField = {}) {
  const staticNonCss = Object.fromEntries(
    Object.entries(getStaticExports(exportsField)).filter(
      ([key]) => !Object.prototype.hasOwnProperty.call(staticCssExports, key),
    ),
  );

  return {
    ...staticNonCss,
    ...staticCssExports,
    ...getComponentExports(),
  };
}

export function syncComponentExports() {
  const packageJson = readRefinePackageJson();
  const previousContent = readFileSync(packageJsonUrl, 'utf8');

  packageJson.exports = createRefineExports(packageJson.exports ?? {});

  // Ensure sideEffects lists all component dist bundles and styles so bundlers
  // never eliminate side-effect-only imports (customElements.define calls, CSS).
  packageJson.sideEffects = ['./dist/*.js', './dist/*.cjs', './dist/styles/**'];

  const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;

  if (previousContent !== nextContent) {
    writeFileSync(packageJsonUrl, nextContent);

    return { changed: true, count: componentNames.length };
  }

  return { changed: false, count: componentNames.length };
}

export function verifyComponentExports() {
  const packageJson = readRefinePackageJson();
  const exportsField = packageJson.exports ?? {};
  const expectedComponentExports = getComponentExports();
  const expectedComponentKeys = new Set(Object.keys(expectedComponentExports));
  const actualComponentKeys = Object.keys(exportsField).filter(
    (key) => key.startsWith('./') && !staticExportKeys.has(key),
  );
  const missing = [...expectedComponentKeys].filter((key) => !actualComponentKeys.includes(key));
  const extra = actualComponentKeys.filter((key) => !expectedComponentKeys.has(key));

  if (missing.length || extra.length) {
    const details = [
      missing.length ? `Missing package exports: ${missing.join(', ')}` : '',
      extra.length ? `Unexpected package exports: ${extra.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    throw new Error(`refine component manifest is out of sync with package.json exports.\n${details}`);
  }

  for (const [key, expected] of Object.entries(expectedComponentExports)) {
    const entry = exportsField[key];

    if (!entry || typeof entry !== 'object') {
      throw new Error(`Export ${key} must be an object with types/import/require targets.`);
    }

    for (const [field, value] of Object.entries(expected)) {
      if (entry[field] !== value) {
        throw new Error(
          `Export ${key} has unexpected ${field} target: expected ${value}, received ${entry[field] ?? 'undefined'}.`,
        );
      }
    }
  }

  return { count: componentNames.length };
}

function printUsageAndExit() {
  processRef?.stderr.write('Usage: node ./scripts/refine-manifest.mjs <check-exports|sync-exports>\n');

  if (processRef) {
    processRef.exitCode = 1;
  }
}

if (import.meta.url === new URL(processRef?.argv[1] ?? '', 'file:').href) {
  const command = processRef?.argv[2];

  if (command === 'check-exports') {
    const { count } = verifyComponentExports();

    processRef?.stdout.write(`refine component manifest verified for ${count} component exports.\n`);
  } else if (command === 'sync-exports') {
    const { changed, count } = syncComponentExports();

    processRef?.stdout.write(
      changed
        ? `Synced refine component exports in package.json.\n`
        : `Refine package exports already in sync for ${count} components.\n`,
    );
  } else {
    printUsageAndExit();
  }
}

export default customElementsManifestConfig;
