import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { isMain, npmEnvironment, parseArgs } from './lib/cli.mjs';
import {
  collectPackageClosure,
  dependencyFields,
  exportEntries,
  hasSourceCondition,
  targetPaths,
} from './lib/packed-package-model.mjs';
import { packPublishedPackage } from './release/pack-published.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromRoot = createRequire(join(root, 'package.json'));
const jsdom = requireFromRoot.resolve('jsdom');
const typeScript = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

function readPackage(folder) {
  return JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
}

function projectMap() {
  const rush = JSON.parse(readFileSync(join(root, 'rush.json'), 'utf8'));

  return new Map(rush.projects.map(({ packageName, projectFolder }) => [packageName, resolve(root, projectFolder)]));
}

async function verifyManifest(manifest, installedRoot) {
  if (hasSourceCondition(manifest.exports)) throw new Error(`${manifest.name} packed manifest still exposes a source condition.`);

  for (const field of dependencyFields) {
    if (Object.values(manifest[field] ?? {}).some((version) => typeof version === 'string' && version.startsWith('workspace:'))) {
      throw new Error(`${manifest.name} packed manifest retains a workspace: dependency.`);
    }
  }

  const paths = new Set([
    ...targetPaths(manifest.exports),
    ...targetPaths(manifest.main),
    ...targetPaths(manifest.module),
    ...targetPaths(manifest.types),
    ...targetPaths(manifest.bin),
  ]);

  for (const path of paths) {
    const target = resolve(installedRoot, path);
    if (relative(installedRoot, target).startsWith('..') || isAbsolute(relative(installedRoot, target))) {
      throw new Error(`${manifest.name} metadata escapes package root: ${path}`);
    }
    await access(target);
  }
}

async function verifyRuntime(manifest, fixture) {
  const entries = exportEntries(manifest).filter(({ import: target }) => typeof target === 'string' && !target.endsWith('.css'));
  const esm = entries.map(({ specifier }) => specifier);
  const cjs = entries.filter(({ require }) => typeof require === 'string').map(({ specifier }) => specifier);
  const harness = `const { JSDOM } = require(${JSON.stringify(jsdom)});\nconst { window } = new JSDOM('', { url: 'http://localhost' });\nObject.assign(globalThis, { CustomEvent: window.CustomEvent, Document: window.Document, Element: window.Element, HTMLElement: window.HTMLElement, Event: window.Event, MutationObserver: window.MutationObserver, Node: window.Node, ShadowRoot: window.ShadowRoot, customElements: window.customElements, document: window.document, window });\n`;

  await writeFile(join(fixture, 'dom.cjs'), harness);
  if (esm.length > 0) await writeFile(join(fixture, 'esm.mjs'), `await Promise.all(${JSON.stringify(esm)}.map((specifier) => import(specifier)));\n`);
  if (cjs.length > 0) await writeFile(join(fixture, 'cjs.cjs'), `for (const specifier of ${JSON.stringify(cjs)}) require(specifier);\n`);
  if (esm.length > 0) await execute(process.execPath, ['--require', './dom.cjs', 'esm.mjs'], { cwd: fixture });
  if (cjs.length > 0) await execute(process.execPath, ['--require', './dom.cjs', 'cjs.cjs'], { cwd: fixture });
}

async function verifyTypes(manifest, fixture) {
  const specifiers = exportEntries(manifest)
    .filter(({ types }) => typeof types === 'string')
    .map(({ specifier }) => `import type {} from '${specifier}';`);

  if (specifiers.length === 0 || !manifest.types) return;

  for (const [name, compilerOptions] of Object.entries({
    bundler: { module: 'ESNext', moduleResolution: 'bundler' },
    node: { module: 'CommonJS', moduleResolution: 'node' },
    node16: { module: 'Node16', moduleResolution: 'node16' },
  })) {
    await writeFile(join(fixture, `${name}.ts`), `${specifiers.join('\n')}\n`);
    await writeFile(
      join(fixture, `${name}.json`),
      JSON.stringify({
        compilerOptions: { ...compilerOptions, ignoreDeprecations: '6.0', noEmit: true, skipLibCheck: true, strict: true, target: 'ES2022' },
        files: [`${name}.ts`],
      }),
    );
    await execute(process.execPath, [typeScript, '--project', `${name}.json`], { cwd: fixture });
  }
}

export async function verifyPackedPackages(targets, { progress = () => {} } = {}) {
  if (targets.length === 0) throw new Error('Provide at least one package with --package=<name>.');

  const closure = collectPackageClosure(targets, projectMap(), readPackage);
  const packed = new Map();
  const fixture = await mkdtemp(join(tmpdir(), 'vielzeug-packed-'));

  try {
    let current = 0;
    for (const [name, { folder }] of closure) {
      progress(`[packed ${++current}/${closure.size}] Packing ${name}`);
      packed.set(name, packPublishedPackage(folder));
    }

    progress(`Installing ${packed.size} packed package(s) into consumer fixture...`);
    await writeFile(
      join(fixture, 'package.json'),
      JSON.stringify({
        dependencies: Object.fromEntries([...packed].map(([name, artifact]) => [name, `file:${artifact.tarballPath}`])),
        private: true,
        type: 'module',
      }),
    );
    await execute('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], {
      cwd: fixture,
      env: npmEnvironment(),
    });

    for (const [index, target] of targets.entries()) {
      progress(`[packed ${index + 1}/${targets.length}] Verifying ${target}`);
      const installedRoot = join(fixture, 'node_modules', ...target.split('/'));
      const manifest = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));

      await verifyManifest(manifest, installedRoot);
      await verifyRuntime(manifest, fixture);
      await verifyTypes(manifest, fixture);
    }
  } finally {
    await rm(fixture, { force: true, recursive: true });
    for (const artifact of packed.values()) artifact.cleanup();
  }
}

if (isMain(import.meta.url)) {
  const { flags } = parseArgs(process.argv.slice(2));
  const requested = typeof flags.package === 'string' ? flags.package.split(',').filter(Boolean) : [];
  const targets = requested.includes('all') ? [...projectMap().keys()] : requested;

  verifyPackedPackages(targets, { progress: console.log }).then(
    () => console.log(`OK — packed consumer verification passed for ${targets.join(', ')}.`),
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
