import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXPORTS, ROOT_EXPORTS } from './exports.manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const categoryBarrel = (modules) => modules.map((name) => `export * from './${name}';`).join('\n').concat('\n');
const rootBarrel = () => ROOT_EXPORTS.map((name) => `export * from './${name}';`).join('\n').concat('\n');

const packageExports = () => {
  const sourceEntry = (source) => ({
    source,
    types: source.replace('./src/', './dist/').replace(/\.ts$/, '.d.ts'),
    import: source.replace('./src/', './dist/').replace(/\.ts$/, '.js'),
    require: source.replace('./src/', './dist/').replace(/\.ts$/, '.cjs'),
  });

  return {
    '.': sourceEntry('./src/index.ts'),
    ...Object.fromEntries(Object.keys(EXPORTS).map((section) => [`./${section}`, sourceEntry(`./src/${section}/index.ts`)])),
  };
};

const sync = async (filePath, content) => {
  const actual = await readFile(filePath, 'utf8');

  if (actual === content) return;

  if (check) throw new Error(`Export artifact drift: ${path.relative(packageRoot, filePath)}`);

  await writeFile(filePath, content, 'utf8');
};

const main = async () => {
  for (const [section, modules] of Object.entries(EXPORTS)) {
    await sync(path.join(packageRoot, 'src', section, 'index.ts'), categoryBarrel(modules));
  }

  await sync(path.join(packageRoot, 'src', 'index.ts'), rootBarrel());

  const packagePath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const next = JSON.stringify({ ...pkg, exports: packageExports() }, null, 2).concat('\n');

  await sync(packagePath, next);
};

await main();
