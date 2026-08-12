import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { refineCemPlugin } from './cem-plugin-refine.mjs';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

/**
 * File basenames that register a custom element (`define(...)`) but are never independently
 * published — they're absorbed into a sibling's `dist/<name>.js` bundle and registered as a side
 * effect of importing it. `carousel-slide.ts` is detected automatically (its only importer,
 * `carousel.ts`, bare-imports it purely for the registration side effect — see the detection
 * rule below). `datagrid-column.ts` needs this explicit entry instead: `datagrid.ts` imports it
 * with named bindings (`COLUMN_OBSERVED_ATTRS`, `parseColumnChildren`) it actually needs for its
 * own logic, not a bare side-effect-only import, so the automatic same-directory/single-importer
 * heuristic (which only recognizes bare imports) can't detect it — `ore-datagrid-column` still
 * registers as a consequence of that import, same as any other, but there is no independent
 * `./datagrid-column` subpath.
 */
const PRIVATELY_REGISTERED = new Set(['datagrid-column']);

/**
 * Discovers every published refine component entry point by scanning `src/**` for files that
 * call `define(...)` — the single source of truth is the filesystem itself (specifically,
 * "does this file register a custom element"), not a hand-maintained list that can silently
 * drift from it. Mirrors the same signal the Custom Elements Manifest analyzer's glob already
 * uses (`customElementsManifestConfig` below), so there's one definition of "what a component
 * is," not two.
 */
function discoverComponentManifest() {
  const srcDir = join(packageRoot, 'src');

  function* walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);

      if (statSync(full).isDirectory()) {
        if (entry === '__tests__' || entry === 'testing') continue;

        yield* walk(full);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.e2e.ts')) {
        yield full;
      }
    }
  }

  const allFiles = [...walk(srcDir)];
  const candidates = allFiles.filter((file) => {
    const name = basename(file, '.ts');

    if (basename(file) === 'index.ts' || name.startsWith('_') || PRIVATELY_REGISTERED.has(name)) return false;

    return /\bdefine(?:<[^(]*?>)?\s*\(/.test(readFileSync(file, 'utf8'));
  });

  // A candidate absorbed into a same-directory sibling's bundle (e.g. `carousel-slide.ts`,
  // bare-imported by `carousel.ts` purely to register `ore-carousel-slide`) isn't independently
  // published — only a *bare* (no-binding) single importer in the same directory counts; a named
  // import (real bindings needed for logic) doesn't reliably signal "registration only" and is
  // handled via `PRIVATELY_REGISTERED` above instead.
  const importers = new Map();

  for (const file of allFiles) {
    // Tolerates an optional trailing `// comment` after the semicolon — a bare side-effect import
    // followed by an inline note (e.g. `import './foo'; // registers ore-foo`) must still count.
    const bareImportPattern = /^import\s+['"](\.[^'"]+)['"];?\s*(?:\/\/.*)?$/gm;
    let match;

    while ((match = bareImportPattern.exec(readFileSync(file, 'utf8')))) {
      const resolved = `${resolve(dirname(file), match[1])}.ts`;

      if (candidates.includes(resolved)) {
        if (!importers.has(resolved)) importers.set(resolved, new Set());

        importers.get(resolved).add(file);
      }
    }
  }

  const absorbed = new Set();

  for (const [candidate, importerSet] of importers) {
    if (importerSet.size === 1 && dirname([...importerSet][0]) === dirname(candidate)) absorbed.add(candidate);
  }

  return candidates
    .filter((file) => !absorbed.has(file))
    .map((file) => ({
      name: basename(file, '.ts'),
      source: `./${relative(packageRoot, file).replace(/\\/g, '/').replace(/\.ts$/, '')}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Discovered inventory of published refine component entry points — drives the package
 * `exports` map (`check:manifest`/`sync:exports`) and the Vite multi-entry build list
 * (`getRefineLibraryEntries`). See `discoverComponentManifest`'s doc comment.
 */
export const componentManifest = discoverComponentManifest();

export const componentNames = componentManifest.map(({ name }) => name);

const packageJsonUrl = new URL('../package.json', import.meta.url);
const processRef = globalThis.process;

const staticExportKeys = new Set([
  '.',
  './styles/animation.css',
  './styles/layers.css',
  './styles/preflight.css',
  './styles/theme.css',
  './tokens.css',
  './frameworks/elements',
  './frameworks/react',
  './frameworks/vue',
]);

const staticCssExports = {
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
  './styles/theme.css': {
    import: './dist/styles/theme.css',
    default: './dist/styles/theme.css',
  },
  './tokens.css': {
    import: './dist/styles/tokens.css',
    default: './dist/styles/tokens.css',
  },
  './frameworks/elements': {
    types: './dist/frameworks/elements.d.ts',
  },
  './frameworks/react': {
    types: './dist/frameworks/react.d.ts',
  },
  './frameworks/vue': {
    types: './dist/frameworks/vue.d.ts',
  },
};

export const customElementsManifestConfig = {
  dependencies: false,
  dev: false,
  exclude: [
    'src/**/*.test.ts',
    'src/**/*.e2e.ts',
    'src/testing/fixtures.ts',
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
    ).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value).filter(([condition]) => condition !== 'source'))
        : value,
    ]),
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
