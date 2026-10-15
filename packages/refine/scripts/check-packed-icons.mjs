import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const tempRoot = join(packageRoot, `.packed-icons-${process.pid}`);
const archiveDir = join(tempRoot, 'archive');
const consumerRoot = join(tempRoot, 'consumer');
const packedPackage = join(consumerRoot, 'node_modules/@vielzeug/refine');
const bundleDir = join(consumerRoot, 'bundle');
const workspaceRoot = resolve(packageRoot, '../..');
const require = createRequire(import.meta.url);

function pack(folder) {
  const before = new Set(readdirSync(archiveDir));
  const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
  if (manifest.name.startsWith('@vielzeug/')) {
    execFileSync('pnpm', ['pack', '--pack-destination', archiveDir], { cwd: folder, stdio: 'pipe' });
  } else {
    // Snapshot installed distributions without running third-party prepare scripts.
    const snapshot = join(tempRoot, 'snapshot');
    cpSync(folder, join(snapshot, 'package'), {
      dereference: true,
      filter: (path) => !relative(folder, path).split(sep).includes('node_modules'),
      recursive: true,
    });
    const archive = join(archiveDir, `${manifest.name.replaceAll('/', '-')}-${manifest.version}.tgz`);
    execFileSync('tar', ['-czf', archive, '-C', snapshot, 'package'], { stdio: 'pipe' });
    rmSync(snapshot, { force: true, recursive: true });
  }
  const archives = readdirSync(archiveDir).filter((file) => file.endsWith('.tgz') && !before.has(file));
  if (archives.length !== 1) throw new Error(`Expected one archive for ${folder}, found ${archives.length}`);
  return join(archiveDir, archives[0]);
}

function install(dependencies) {
  writeFileSync(join(consumerRoot, 'package.json'), JSON.stringify({ dependencies, private: true, type: 'module' }));
  execFileSync('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], {
    cwd: consumerRoot,
    env: {
      ...process.env,
      npm_config_cache: join(tempRoot, 'npm-cache'),
      npm_config_update_notifier: 'false',
    },
    stdio: 'inherit',
  });
}

try {
  mkdirSync(archiveDir, { recursive: true });
  mkdirSync(consumerRoot, { recursive: true });
  writeFileSync(join(consumerRoot, 'consumer.js'), "import '@vielzeug/refine/icon';\n");

  const dependencies = {};
  const packWorkspace = (folder) => {
    const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
    if (dependencies[manifest.name]) return;
    dependencies[manifest.name] = `file:${pack(folder)}`;
    for (const name of Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })) {
      if (name.startsWith('@vielzeug/')) {
        packWorkspace(join(workspaceRoot, 'packages', name.slice('@vielzeug/'.length)));
      } else if (manifest.dependencies?.[name]) {
        let dependencyRoot = dirname(createRequire(join(folder, 'package.json')).resolve(name));
        while (
          !existsSync(join(dependencyRoot, 'package.json')) ||
          JSON.parse(readFileSync(join(dependencyRoot, 'package.json'), 'utf8')).name !== name
        ) {
          const parent = dirname(dependencyRoot);
          if (parent === dependencyRoot) throw new Error(`Cannot locate installed dependency: ${name}`);
          dependencyRoot = parent;
        }
        packWorkspace(dependencyRoot);
      }
    }
  };
  packWorkspace(packageRoot);
  install(dependencies);

  const manifest = JSON.parse(readFileSync(join(packedPackage, 'package.json'), 'utf8'));
  if (
    manifest.dependencies?.lucide ||
    manifest.optionalDependencies?.lucide ||
    manifest.peerDependencies?.lucide !== '^1.48.0' ||
    manifest.peerDependenciesMeta?.lucide?.optional !== true ||
    existsSync(join(consumerRoot, 'node_modules/lucide'))
  ) throw new Error('Packed Refine must install without its optional Lucide peer');

  writeFileSync(join(consumerRoot, 'verify.mjs'), `
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { JSDOM } from ${JSON.stringify(require.resolve('jsdom'))};
const { window } = new JSDOM('', { url: 'http://localhost' });
for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'Element', 'Document', 'ShadowRoot', 'Node', 'MutationObserver', 'CustomEvent', 'DOMParser']) {
  globalThis[key] = key === 'window' ? window : window[key];
}
// This fixture verifies SVG/runtime wiring, not stylesheet layout.
globalThis.CSSStyleSheet = class { replaceSync() {} };
const withoutLucide = process.argv[2] === 'without';
const require = createRequire(import.meta.url);
const load = process.argv[3] === 'cjs' ? (specifier) => require(specifier) : (specifier) => import(specifier);
registerHooks({ resolve(specifier, context, nextResolve) {
  if (withoutLucide && (specifier === 'lucide' || specifier.startsWith('lucide/'))) {
    throw new Error('Core/structural adapters must not resolve Lucide, even from ancestor workspaces');
  }
  return nextResolve(specifier, context);
} });
await load('@vielzeug/refine');
await load('@vielzeug/refine/icon');
const { registerIcons } = await load('@vielzeug/refine/icons');
const { iconifyIcon } = await load('@vielzeug/refine/icons/iconify');
const { lucideIcons } = await load('@vielzeug/refine/icons/lucide');
assert.equal(typeof registerIcons, 'function');
assert.equal(iconifyIcon({ body: '<path d="M0 0h8"/>' }).viewBox[2], 16);
assert.equal(lucideIcons({ Dot: [['circle', { r: 2 }]] }).Dot.children[0].tag, 'circle');
async function assertRendered(name) {
  const element = document.createElement('ore-icon');
  element.setAttribute('name', name);
  document.body.append(element);
  await new Promise(setImmediate);
  assert.ok(element.shadowRoot?.querySelector('svg path'), name + ' must render');
  element.remove();
}
await assertRendered('chevron-down');
const fixtures = ${JSON.stringify(JSON.parse(readFileSync(join(packageRoot, 'src/icons/__tests__/fixtures/iconify.json'), 'utf8')))};
for (const family of ['heroicons', 'tabler', 'mdi']) {
  const { [family + 'Icons']: convert } = await load('@vielzeug/refine/icons/' + family);
  const collection = fixtures[family];
  const Home = { ...collection.icons.home, width: collection.width, height: collection.height };
  const name = family + 'AppHome';
  const converted = convert({ [name]: Home });
  assert.deepEqual(Object.keys(converted), [name]);
  assert.deepEqual(converted[name].viewBox, [0, 0, 24, 24]);
  registerIcons(converted);
  await assertRendered(name);
}
if (!withoutLucide) {
  assert.match(import.meta.resolve('lucide'), /consumer\\/node_modules\\/lucide\\//);
  await load('@vielzeug/refine/icons/lucide/all');
  await assertRendered('alarm-clock');
}
`);
  for (const format of ['esm', 'cjs']) {
    execFileSync(process.execPath, ['verify.mjs', 'without', format], { cwd: consumerRoot, stdio: 'inherit' });
  }

  await build({
    configFile: false,
    logLevel: 'silent',
    root: consumerRoot,
    plugins: [{
      name: 'no-lucide-core',
      resolveId(id) {
        if (id === 'lucide' || id.startsWith('lucide/')) throw new Error('Core bundle resolved Lucide');
      },
    }],
    build: {
      minify: false,
      outDir: bundleDir,
      rollupOptions: {
        input: join(consumerRoot, 'consumer.js'),
        output: { entryFileNames: 'consumer.js' },
      },
    },
  });

  const output = readFileSync(join(bundleDir, 'consumer.js'), 'utf8');
  if (!output.includes('registerDefaultIcons(') || !output.includes('ChevronDown')) {
    throw new Error('Packed production consumer bundle dropped Refine’s internal icon registration');
  }
  if (/from ["']lucide["']/.test(output)) {
    throw new Error('Packed core icon entry unexpectedly imports Lucide');
  }
  for (const subpath of ['./icons', './icons/iconify', './icons/lucide', './icons/lucide/all', './icons/heroicons', './icons/tabler', './icons/mdi']) {
    for (const target of Object.values(manifest.exports[subpath])) {
      readFileSync(resolve(packedPackage, target));
    }
    const classicTypes = manifest.typesVersions['*'][subpath.slice(2)];
    for (const target of classicTypes) readFileSync(resolve(packedPackage, target));
  }

  writeFileSync(join(consumerRoot, 'adapters.ts'), `
import { registerIcons, type IconDefinition } from '@vielzeug/refine/icons';
import { heroiconsIcons, type IconifyIcon } from '@vielzeug/refine/icons/heroicons';
import { tablerIcons } from '@vielzeug/refine/icons/tabler';
import { mdiIcons } from '@vielzeug/refine/icons/mdi';
const Home: IconifyIcon = { body: '<path/>', width: 24, height: 24 };
const icons: Record<string, IconDefinition> = { ...heroiconsIcons({ Home }), ...tablerIcons({ Home }), ...mdiIcons({ Home }) };
registerIcons(icons);
// @ts-expect-error framework components are not Iconify data
heroiconsIcons({ Home: () => null });
// @ts-expect-error raw MDI paths are not Iconify data
mdiIcons({ Home: 'M0 0h24' });
`);
  for (const [name, options] of Object.entries({
    bundler: { module: 'ESNext', moduleResolution: 'bundler' },
    node: { module: 'CommonJS', moduleResolution: 'node' },
    node16: { module: 'Node16', moduleResolution: 'node16' },
  })) {
    writeFileSync(join(consumerRoot, `${name}.json`), JSON.stringify({
      compilerOptions: { ...options, ignoreDeprecations: '6.0', noEmit: true, skipLibCheck: true, strict: true, target: 'ES2022' },
      files: ['adapters.ts'],
    }));
    execFileSync(process.execPath, [join(workspaceRoot, 'node_modules/typescript/bin/tsc'), '-p', `${name}.json`], {
      cwd: consumerRoot,
      stdio: 'inherit',
    });
  }

  dependencies.lucide = `file:${pack(resolve(packageRoot, 'node_modules/lucide'))}`;
  install(dependencies);
  for (const format of ['esm', 'cjs']) {
    execFileSync(process.execPath, ['verify.mjs', 'with', format], { cwd: consumerRoot, stdio: 'inherit' });
  }

  process.stdout.write('Packed core and structural adapters install/run without Lucide; explicit full-set registration runs with the installed optional peer. Exports and type mappings exist; production core retains defaults.\n');
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}
