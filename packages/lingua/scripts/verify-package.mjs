import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const fixture = await mkdtemp(join(tmpdir(), 'vielzeug-lingua-'));
let tarball;

const typeScript = resolve(root, 'node_modules', 'typescript', 'bin', 'tsc');
const specifiers = [manifest.name, `${manifest.name}/format`, `${manifest.name}/validate`];
const source = `import { createCatalogTranslator } from '${manifest.name}';
import { createFormatter } from '${manifest.name}/format';
import { validateCatalog } from '${manifest.name}/validate';

const translator = createCatalogTranslator({ title: 'Title' });
translator.translate('title');
createFormatter('en').number(1);
validateCatalog({ title: 'Title' }, 'en');
`;

const run = async (file, args = []) => execute(process.execPath, [file, ...args], { cwd: fixture });

try {
  const { stdout } = await execute('npm', ['pack', '--ignore-scripts', '--json'], { cwd: root });
  tarball = join(root, JSON.parse(stdout)[0].filename);

  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({ dependencies: { [manifest.name]: `file:${tarball}` }, private: true, type: 'module' }),
  );
  await execute('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], { cwd: fixture });
  await writeFile(join(fixture, 'esm.mjs'), `await Promise.all(${JSON.stringify(specifiers)}.map((specifier) => import(specifier)));
`);
  await writeFile(join(fixture, 'cjs.cjs'), `for (const specifier of ${JSON.stringify(specifiers)}) require(specifier);
`);

  await run('esm.mjs');
  await run('cjs.cjs');

  for (const [name, compilerOptions] of Object.entries({
    bundler: { module: 'ESNext', moduleResolution: 'bundler' },
    node: { module: 'CommonJS', moduleResolution: 'node' },
    node16: { module: 'Node16', moduleResolution: 'node16' },
  })) {
    await writeFile(join(fixture, `${name}.ts`), source);
    await writeFile(
      join(fixture, `${name}.json`),
      JSON.stringify({
        compilerOptions: {
          ...compilerOptions,
          ignoreDeprecations: '6.0',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
        },
        files: [`${name}.ts`],
      }),
    );
    await execute(process.execPath, [typeScript, '--project', `${name}.json`], { cwd: fixture });
  }

  const packedManifest = JSON.parse(
    await readFile(join(fixture, 'node_modules', '@vielzeug', 'lingua', 'package.json'), 'utf8'),
  );

  if (packedManifest.dependencies || packedManifest.optionalDependencies || packedManifest.peerDependencies) {
    throw new Error('Packed manifest must not declare runtime, optional, or peer dependencies.');
  }

  for (const entry of Object.values(packedManifest.exports)) {
    if (typeof entry === 'object' && entry !== null && 'source' in entry) {
      throw new Error('Packed manifest must not expose unpublished source files.');
    }
  }

  for (const entry of [packedManifest.types, ...Object.values(packedManifest.exports).flatMap((value) => [value.types])]) {
    await access(join(fixture, 'node_modules', '@vielzeug', 'lingua', entry));
  }

  console.log('OK — packed ESM, CJS, TypeScript, exports, and dependency invariants pass.');
} finally {
  await rm(fixture, { force: true, recursive: true });
  if (tarball) await rm(tarball, { force: true });
}
